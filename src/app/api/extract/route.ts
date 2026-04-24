import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { CallOutcomeSummary, JobSpec } from '@/types'

const anthropic = new Anthropic()

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
    const { rawTranscript, jobSpec, naturalLanguageRequest } = await request.json() as {
      rawTranscript: string
      jobSpec: JobSpec
      naturalLanguageRequest: string
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

    return NextResponse.json({ report, outcome, cleanedTranscript })
  } catch (error) {
    console.error('[/api/extract]', error)
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
