import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { InventoryItem } from '@/types'

const anthropic = new Anthropic()

const INVENTORY_SCHEMA = {
  type: 'object' as const,
  properties: {
    itemName: { type: 'string', description: 'Name of the product or item' },
    sku: { type: 'string', description: 'SKU or product code, null if not mentioned' },
    category: { type: 'string', description: 'Product category (e.g. Furniture, Electronics)' },
    quantity: { type: 'number', description: 'Stock quantity as an integer' },
    unitPrice: { type: 'number', description: 'Price per unit in dollars, null if not mentioned' },
    description: { type: 'string', description: 'Brief product description' },
    minStockAlert: { type: 'number', description: 'Minimum quantity before low-stock alert, default 10' },
  },
  required: ['itemName', 'quantity'],
}

function mapRow(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    supplierId: row.supplier_id as string,
    itemName: row.item_name as string,
    sku: row.sku as string | null,
    category: row.category as string | null,
    quantity: row.quantity as number,
    unitPrice: row.unit_price as number | null,
    description: row.description as string | null,
    minStockAlert: row.min_stock_alert as number,
    updatedAt: row.updated_at as string,
    createdAt: row.created_at as string,
  }
}

// GET — list all inventory for the authenticated supplier
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: (data ?? []).map(mapRow) })
}

// POST — add item (natural language string OR structured JSON)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { naturalLanguage?: string; item?: Partial<InventoryItem> }

  let itemData: Record<string, unknown>

  if (body.naturalLanguage) {
    // Parse natural language with Claude
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Parse this inventory addition into structured data: "${body.naturalLanguage}"`,
      }],
      tools: [{ name: 'add_inventory_item', description: 'Structured inventory item', input_schema: INVENTORY_SCHEMA }],
      tool_choice: { type: 'tool', name: 'add_inventory_item' },
    })

    const toolUse = msg.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ error: 'Could not parse inventory item' }, { status: 400 })
    }
    const parsed = toolUse.input as Record<string, unknown>
    itemData = {
      item_name: parsed.itemName,
      sku: parsed.sku ?? null,
      category: parsed.category ?? null,
      quantity: parsed.quantity,
      unit_price: parsed.unitPrice ?? null,
      description: parsed.description ?? null,
      min_stock_alert: parsed.minStockAlert ?? 10,
    }
  } else if (body.item) {
    const i = body.item
    itemData = {
      item_name: i.itemName,
      sku: i.sku ?? null,
      category: i.category ?? null,
      quantity: i.quantity ?? 0,
      unit_price: i.unitPrice ?? null,
      description: i.description ?? null,
      min_stock_alert: i.minStockAlert ?? 10,
    }
  } else {
    return NextResponse.json({ error: 'Provide naturalLanguage or item' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('inventory')
    .insert({ ...itemData, supplier_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: mapRow(data as Record<string, unknown>) })
}

// PATCH — update quantity or price
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, quantity, unitPrice, minStockAlert } = await request.json() as {
    id: string; quantity?: number; unitPrice?: number; minStockAlert?: number
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (quantity !== undefined) updates.quantity = quantity
  if (unitPrice !== undefined) updates.unit_price = unitPrice
  if (minStockAlert !== undefined) updates.min_stock_alert = minStockAlert

  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: mapRow(data as Record<string, unknown>) })
}

// DELETE — remove item
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json() as { id: string }
  const { error } = await supabase.from('inventory').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
