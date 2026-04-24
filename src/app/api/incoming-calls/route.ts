import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapReport } from '@/lib/utils'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('call_reports')
    .select('*, profiles!user_id(company_name)')
    .eq('supplier_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tickets = (data ?? []).map((row: Record<string, unknown>) => {
    const customerProfile = row.profiles as { company_name: string | null } | null
    return {
      ...mapReport(row),
      customerName: customerProfile?.company_name ?? null,
    }
  })

  return NextResponse.json({ tickets })
}
