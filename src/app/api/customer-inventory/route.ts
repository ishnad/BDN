import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CustomerInventoryItem } from '@/types'

function mapRow(row: Record<string, unknown>): CustomerInventoryItem {
  const supplier = row.profiles as Record<string, unknown> | null
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    itemName: row.item_name as string,
    sku: row.sku as string | null,
    category: row.category as string | null,
    currentQuantity: row.current_quantity as number,
    restockThreshold: row.restock_threshold as number,
    supplierId: row.supplier_id as string | null,
    supplierName: (supplier?.company_name as string | null) ?? null,
    supplierPhone: (supplier?.phone_number as string | null) ?? null,
    unitCost: row.unit_cost as number | null,
    updatedAt: row.updated_at as string,
    createdAt: row.created_at as string,
  }
}

async function getCompanyId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()
  return (data as Record<string, unknown> | null)?.company_id as string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getCompanyId(supabase, user.id)
  if (!companyId) return NextResponse.json({ items: [] })

  const { data, error } = await supabase
    .from('customer_inventory')
    .select('*, profiles!supplier_id(company_name, phone_number)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: (data ?? []).map(mapRow) })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getCompanyId(supabase, user.id)
  if (!companyId) return NextResponse.json({ error: 'No company associated with your account' }, { status: 400 })

  const { item } = await request.json() as { item: Partial<CustomerInventoryItem> }

  const { data, error } = await supabase
    .from('customer_inventory')
    .insert({
      company_id: companyId,
      item_name: item.itemName,
      sku: item.sku ?? null,
      category: item.category ?? null,
      current_quantity: item.currentQuantity ?? 0,
      restock_threshold: item.restockThreshold ?? 10,
      supplier_id: item.supplierId ?? null,
      unit_cost: item.unitCost ?? null,
    })
    .select('*, profiles!supplier_id(company_name, phone_number)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: mapRow(data as Record<string, unknown>) })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, currentQuantity, restockThreshold, supplierId, unitCost } = await request.json() as {
    id: string
    currentQuantity?: number
    restockThreshold?: number
    supplierId?: string | null
    unitCost?: number | null
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (currentQuantity !== undefined) patch.current_quantity = currentQuantity
  if (restockThreshold !== undefined) patch.restock_threshold = restockThreshold
  if (supplierId !== undefined) patch.supplier_id = supplierId
  if (unitCost !== undefined) patch.unit_cost = unitCost

  const { data, error } = await supabase
    .from('customer_inventory')
    .update(patch)
    .eq('id', id)
    .select('*, profiles!supplier_id(company_name, phone_number)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: mapRow(data as Record<string, unknown>) })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json() as { id: string }
  const { error } = await supabase.from('customer_inventory').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
