import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { InventoryItem } from '@/types'

const anthropic = new Anthropic()

const OFFER_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: { type: 'string', description: 'Compelling offer headline (max 80 chars)' },
    content: { type: 'string', description: 'Full offer body — 2-3 paragraphs, professional B2B tone. Highlight key products, availability, pricing, and a clear call to action.' },
    highlightedItems: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of 3-5 key item names to feature prominently',
    },
    expiryDays: { type: 'number', description: 'Suggested offer validity in days (7-30)' },
  },
  required: ['title', 'content', 'highlightedItems', 'expiryDays'],
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get supplier profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'supplier') {
      return NextResponse.json({ error: 'Only suppliers can generate offers' }, { status: 403 })
    }

    // Fetch current inventory
    const { data: inventoryRows } = await supabase
      .from('inventory')
      .select('*')
      .order('quantity', { ascending: false })

    if (!inventoryRows || inventoryRows.length === 0) {
      return NextResponse.json({ error: 'Add inventory items before generating an offer' }, { status: 400 })
    }

    const inventorySummary = inventoryRows.map(row => (
      `- ${row.item_name}${row.sku ? ` (SKU: ${row.sku})` : ''}: ${row.quantity} units available` +
      `${row.unit_price ? ` @ $${row.unit_price}/unit` : ''}` +
      `${row.category ? ` [${row.category}]` : ''}`
    )).join('\n')

    const companyName = profile?.company_name ?? 'Our Company'

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: 'You are a B2B sales expert who writes compelling, professional offer broadcasts for business customers. Your offers are concise, highlight value clearly, and drive action.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{
        role: 'user',
        content: `Generate a compelling B2B offer broadcast for ${companyName}.

Current inventory available for sale:
${inventorySummary}

Create a professional outreach offer that business customers would find compelling.
Focus on availability, value, and urgency without being pushy.`,
      }],
      tools: [{
        name: 'create_offer',
        description: 'Create a structured supplier offer broadcast',
        input_schema: OFFER_SCHEMA,
      }],
      tool_choice: { type: 'tool', name: 'create_offer' },
    })

    const toolUse = msg.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Offer generation failed')
    }

    const offerData = toolUse.input as {
      title: string; content: string; highlightedItems: string[]; expiryDays: number
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + offerData.expiryDays)

    // Map inventory to items snapshot for offer
    const items = (inventoryRows as Record<string, unknown>[]).map(row => ({
      id: row.id,
      supplierId: row.supplier_id,
      itemName: row.item_name,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      description: row.description,
      minStockAlert: row.min_stock_alert,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    })) as InventoryItem[]

    return NextResponse.json({
      draft: {
        title: offerData.title,
        content: offerData.content,
        highlightedItems: offerData.highlightedItems,
        items,
        expiresAt: expiresAt.toISOString(),
        supplierName: companyName,
      },
    })
  } catch (error) {
    console.error('[/api/generate-offer]', error)
    return NextResponse.json({ error: 'Failed to generate offer' }, { status: 500 })
  }
}

// Broadcast — save the approved offer to DB
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'supplier') {
      return NextResponse.json({ error: 'Only suppliers can broadcast offers' }, { status: 403 })
    }

    const { title, content, items, expiresAt } = await request.json() as {
      title: string; content: string; items: InventoryItem[]; expiresAt: string
    }

    const { data, error } = await supabase
      .from('supplier_offers')
      .insert({
        supplier_id: user.id,
        supplier_name: profile?.company_name ?? null,
        title,
        content,
        items,
        status: 'active',
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ offer: data })
  } catch (error) {
    console.error('[/api/generate-offer PUT]', error)
    return NextResponse.json({ error: 'Failed to broadcast offer' }, { status: 500 })
  }
}
