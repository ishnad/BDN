import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'

interface RouteParams {
  params: Promise<{ reportId: string }>
}

interface RestockItem {
  inventoryItemId: string
  itemName: string
  unitsOrdered: number
}

interface InsufficientItem {
  itemName: string
  required: number
  available: number
}

async function getCompanyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()
  return (data as Record<string, unknown> | null)?.company_id as string | null ?? null
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { reportId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { orderStatus?: OrderStatus }
  const { orderStatus } = body
  if (!orderStatus) return NextResponse.json({ error: 'orderStatus is required' }, { status: 400 })

  // Fetch the report — readable by customer (user_id) or supplier (supplier_id) via RLS
  const { data: report, error: fetchError } = await supabase
    .from('call_reports')
    .select('user_id, supplier_id, order_status, restock_items')
    .eq('id', reportId)
    .single()

  if (fetchError || !report) {
    return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
  }

  const isCustomer = report.user_id === user.id
  const isSupplier = report.supplier_id === user.id
  const restockItems: RestockItem[] = Array.isArray(report.restock_items) ? report.restock_items : []

  // Role + transition guards
  if (orderStatus === 'in_transit') {
    if (!isSupplier) return NextResponse.json({ error: 'Only the supplier can mark as in transit' }, { status: 403 })
    if (report.order_status !== 'preparing') return NextResponse.json({ error: 'Order must be in preparing state' }, { status: 400 })
  }
  if (orderStatus === 'delivered') {
    if (!isCustomer) return NextResponse.json({ error: 'Only the customer can mark as delivered' }, { status: 403 })
    if (report.order_status !== 'in_transit') return NextResponse.json({ error: 'Order must be in transit before delivery' }, { status: 400 })
  }

  // ── Supplier: check stock before committing ──────────────────────────────
  if (orderStatus === 'in_transit' && restockItems.length > 0) {
    const insufficientItems: InsufficientItem[] = []

    for (const item of restockItems) {
      const { data: matches } = await supabase
        .from('inventory')
        .select('id, quantity')
        .ilike('item_name', item.itemName)
        .eq('supplier_id', user.id)
        .order('quantity', { ascending: false })
        .limit(1)

      const invItem = matches?.[0]
      const available = invItem?.quantity ?? 0
      if (available < item.unitsOrdered) {
        insufficientItems.push({ itemName: item.itemName, required: item.unitsOrdered, available })
      }
    }

    if (insufficientItems.length > 0) {
      return NextResponse.json({ error: 'Insufficient inventory', insufficientItems }, { status: 422 })
    }

    // Decrement supplier inventory
    for (const item of restockItems) {
      const { data: matches } = await supabase
        .from('inventory')
        .select('id, quantity')
        .ilike('item_name', item.itemName)
        .eq('supplier_id', user.id)
        .order('quantity', { ascending: false })
        .limit(1)

      if (matches?.[0]) {
        const { error: decrErr } = await supabase
          .from('inventory')
          .update({ quantity: matches[0].quantity - item.unitsOrdered })
          .eq('id', matches[0].id)
        if (decrErr) {
          return NextResponse.json({ error: `Failed to update inventory for "${item.itemName}": ${decrErr.message}` }, { status: 500 })
        }
      }
    }
  }

  // ── Update order status — use .select() to detect RLS silent failures ────
  const { data: updated, error: updateError } = await supabase
    .from('call_reports')
    .update({ order_status: orderStatus })
    .eq('id', reportId)
    .select('id')

  if (updateError) {
    return NextResponse.json({ error: `Database error: ${updateError.message}` }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: 'Update was blocked by database permissions. Ensure the UPDATE RLS policies are applied in Supabase.' },
      { status: 403 },
    )
  }

  // ── Customer: increment their inventory on delivery ──────────────────────
  if (orderStatus === 'delivered' && restockItems.length > 0) {
    const companyId = await getCompanyId(supabase, user.id)
    const inventoryErrors: string[] = []

    for (const item of restockItems) {
      const { data: inv, error: invFetchErr } = await supabase
        .from('customer_inventory')
        .select('id, current_quantity')
        .eq('id', item.inventoryItemId)
        .eq('company_id', companyId ?? '')
        .single()

      if (invFetchErr || !inv) {
        inventoryErrors.push(item.itemName)
        continue
      }

      const { error: invUpdateErr } = await supabase
        .from('customer_inventory')
        .update({ current_quantity: inv.current_quantity + item.unitsOrdered })
        .eq('id', inv.id)

      if (invUpdateErr) {
        inventoryErrors.push(item.itemName)
      }
    }

    if (inventoryErrors.length > 0) {
      // Status updated but some inventory updates failed — return partial success
      return NextResponse.json({
        success: true,
        orderStatus,
        warning: `Order marked delivered but inventory could not be updated for: ${inventoryErrors.join(', ')}`,
      })
    }
  }

  return NextResponse.json({ success: true, orderStatus })
}
