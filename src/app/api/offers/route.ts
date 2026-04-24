import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupplierOffer } from '@/types'

function mapOffer(row: Record<string, unknown>): SupplierOffer {
  return {
    id: row.id as string,
    supplierId: row.supplier_id as string,
    supplierName: row.supplier_name as string | null,
    title: row.title as string,
    content: row.content as string,
    items: (row.items as SupplierOffer['items']) ?? [],
    status: row.status as SupplierOffer['status'],
    expiresAt: row.expires_at as string | null,
    createdAt: row.created_at as string,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('supplier_offers')
    .select('*')
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ offers: (data ?? []).map(mapOffer) })
}
