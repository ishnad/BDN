import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { CallOutcomeSummary, JobSpec, SupplyMatch } from '@/types'

const anthropic = new Anthropic()

const SUPPLY_MATCH_SCHEMA = {
  type: 'object' as const,
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          itemName: { type: 'string', description: 'Name of the matching inventory item' },
          supplierName: { type: 'string', description: 'Name of the supplier offering this item' },
          quantity: { type: 'number', description: 'Available quantity in stock' },
          unitPrice: { type: ['number', 'null'] as unknown as 'number', description: 'Price per unit if available' },
          relevanceReason: { type: 'string', description: 'One sentence explaining why this item matches the customer request' },
        },
        required: ['itemName', 'supplierName', 'quantity', 'unitPrice', 'relevanceReason'],
      },
      description: 'List of supplier inventory items relevant to the customer request',
    },
  },
  required: ['matches'],
}

const OUTCOME_SCHEMA = {
  type: 'object' as const,
  properties: {
    vendorName: { type: 'string', description: 'Name or identifier of the vendor' },
    resolutionStatus: {
      type: 'string',
      description: 'One-sentence summary of what was resolved or determined',
    },
    paymentDate: {
      type: ['string', 'null'] as unknown as 'string',
      description: 'Payment date if mentioned (ISO or human-readable), null if not applicable',
    },
    confidenceScore: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence that the objective was fully achieved (0.0–1.0)',
    },
    nextStep: {
      type: 'string',
      enum: ['Needs Human Approval', 'Mark as Resolved', 'Draft Email'],
      description: 'Recommended next action',
    },
  },
  required: ['vendorName', 'resolutionStatus', 'paymentDate', 'confidenceScore', 'nextStep'],
}

export async function POST(request: NextRequest) {
  try {
    const { rawTranscript, jobSpec, naturalLanguageRequest, supplierId, restockItems } = await request.json() as {
      rawTranscript: string
      jobSpec: JobSpec
      naturalLanguageRequest: string
      supplierId?: string
      restockItems?: Array<{ inventoryItemId: string; itemName: string; unitsOrdered: number }>
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 1: Clean transcript
    const cleanMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: 'You clean phone call transcripts. Remove filler words (um, uh, like), false starts, repetitions caused by echo, and irrelevant pleasantries. Preserve all factual content and important confirmations exactly. Return only the cleaned transcript.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Clean this transcript:\n\n${rawTranscript}`,
        },
      ],
    })

    const cleanedTranscript =
      cleanMsg.content[0].type === 'text' ? cleanMsg.content[0].text : rawTranscript

    // Step 2: Extract structured outcome
    const extractMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract the structured outcome from this vendor call.

Original request: "${naturalLanguageRequest}"
Objective: "${jobSpec.objective}"

Cleaned transcript:
${cleanedTranscript}

Determine confidence based on whether all required questions were answered and the objective was achieved.`,
        },
      ],
      tools: [
        {
          name: 'extract_outcome',
          description: 'Extract structured outcome data from the call transcript',
          input_schema: OUTCOME_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'extract_outcome' },
    })

    const toolUse = extractMsg.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Extraction failed')
    }

    const outcome = toolUse.input as CallOutcomeSummary

    // Step 3: Save to Supabase (RLS enforces user_id scoping)
    const { data: report, error: dbError } = await supabase
      .from('call_reports')
      .insert({
        user_id: user.id,
        supplier_id: supplierId ?? null,
        restock_items: restockItems ?? null,
        vendor_name: outcome.vendorName,
        natural_language_request: naturalLanguageRequest,
        job_spec: jobSpec,
        raw_transcript: rawTranscript,
        cleaned_transcript: cleanedTranscript,
        resolution_status: outcome.resolutionStatus,
        payment_date: outcome.paymentDate,
        confidence_score: outcome.confidenceScore,
        next_step: outcome.nextStep,
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Step 4: Supply match — find relevant supplier inventory items (best-effort, non-blocking)
    let supplyMatches: SupplyMatch[] = []
    try {
      const { data: inventoryRows } = await supabase
        .from('inventory')
        .select('item_name, quantity, unit_price, profiles(company_name)')
        .gt('quantity', 0)
        .limit(50)

      if (inventoryRows && inventoryRows.length > 0) {
        const inventorySummary = inventoryRows
          .map((r: Record<string, unknown>) => {
            const profile = r.profiles as Record<string, unknown> | null
            const supplier = profile?.company_name ?? 'Unknown Supplier'
            return `- ${r.item_name} (${r.quantity} units${r.unit_price != null ? ` @ $${r.unit_price}/unit` : ''}) from ${supplier}`
          })
          .join('\n')

        const matchMsg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `A customer just made this vendor call request: "${naturalLanguageRequest}"

Available supplier inventory:
${inventorySummary}

Identify which inventory items are relevant to this customer's needs. Only include items that genuinely match — skip irrelevant ones. Return an empty matches array if nothing fits.`,
            },
          ],
          tools: [
            {
              name: 'find_supply_matches',
              description: 'Identify supplier inventory items relevant to the customer request',
              input_schema: SUPPLY_MATCH_SCHEMA,
            },
          ],
          tool_choice: { type: 'tool', name: 'find_supply_matches' },
        })

        const matchTool = matchMsg.content.find(b => b.type === 'tool_use')
        if (matchTool && matchTool.type === 'tool_use') {
          const result = matchTool.input as { matches: SupplyMatch[] }
          supplyMatches = result.matches ?? []
        }
      }
    } catch {
      // Supply match is non-critical — swallow errors so the main flow always succeeds
    }

    return NextResponse.json({ report, outcome, cleanedTranscript, supplyMatches })
  } catch (error) {
    console.error('[/api/extract]', error)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
