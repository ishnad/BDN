import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'

interface RouteParams {
  params: Promise<{ reportId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { reportId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderStatus } = await request.json() as { orderStatus: OrderStatus }

  // Fetch the report to validate the transition
  const { data: report, error: fetchError } = await supabase
    .from('call_reports')
    .select('user_id, supplier_id, order_status, restock_items')
    .eq('id', reportId)
    .single()

  if (fetchError || !report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const isCustomer = report.user_id === user.id
  const isSupplier = report.supplier_id === user.id

  // Validate allowed transitions
  if (orderStatus === 'in_transit' && !isSupplier) {
    return NextResponse.json({ error: 'Only the supplier can mark as in transit' }, { status: 403 })
  }
  if (orderStatus === 'delivered' && !isCustomer) {
    return NextResponse.json({ error: 'Only the customer can mark as delivered' }, { status: 403 })
  }
  if (orderStatus === 'in_transit' && report.order_status !== 'preparing') {
    return NextResponse.json({ error: 'Can only move to in_transit from preparing' }, { status: 400 })
  }
  if (orderStatus === 'delivered' && report.order_status !== 'in_transit') {
    return NextResponse.json({ error: 'Can only mark delivered after in_transit' }, { status: 400 })
  }

  // Update the order status
  const { error: updateError } = await supabase
    .from('call_reports')
    .update({ order_status: orderStatus })
    .eq('id', reportId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // When delivered: auto-increment customer inventory for each restock item
  if (orderStatus === 'delivered' && report.restock_items) {
    const restockItems = report.restock_items as Array<{
      inventoryItemId: string
      itemName: string
      unitsOrdered: number
    }>

    for (const item of restockItems) {
      const { data: inv } = await supabase
        .from('customer_inventory')
        .select('current_quantity')
        .eq('id', item.inventoryItemId)
        .single()

      if (inv) {
        await supabase
          .from('customer_inventory')
          .update({ current_quantity: inv.current_quantity + item.unitsOrdered })
          .eq('id', item.inventoryItemId)
      }
    }
  }

  return NextResponse.json({ success: true, orderStatus })
}
