import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupplierOption } from '@/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('id, company_name, phone_number')
    .eq('role', 'supplier')
    .order('company_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const suppliers: SupplierOption[] = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    companyName: (r.company_name as string | null) ?? 'Unknown Supplier',
    phoneNumber: (r.phone_number as string | null) ?? '',
  }))

  return NextResponse.json({ suppliers })
}
