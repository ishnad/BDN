import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import PresenterBanner from '@/components/PresenterBanner'
import IntakeForm from '@/components/IntakeForm'
import ReportCard from '@/components/ReportCard'
import StatusFilter from '@/components/StatusFilter'
import { mapReport } from '@/lib/utils'
import type { Profile } from '@/types'

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { filter } = await searchParams

  const profileResult = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileResult.data as Profile | null

  // Admins see all reports; RLS handles scoping for other roles
  const reportsQuery = supabase
    .from('call_reports')
    .select(profile?.role === 'admin' ? '*, profiles(company_name, role)' : '*')
    .order('created_at', { ascending: false })
    .limit(100)

  const reportsResult = await reportsQuery

  const allReports = (reportsResult.data ?? []).map(mapReport)

  const filteredReports = filter && filter !== 'all'
    ? allReports.filter(r => r.nextStep === filter)
    : allReports

  const showBanner = process.env.SHOW_PRESENTER_BANNER === 'true'

  return (
    <div className="min-h-screen bg-slate-950">
      <NavBar user={user} profile={profile} />
      {showBanner && <PresenterBanner />}

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Intake section */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">New Call Request</h2>
          <IntakeForm />
        </section>

        {/* Reports section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Call Reports
              {allReports.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({allReports.length})
                </span>
              )}
            </h2>
            <Suspense fallback={<div className="h-9 w-64 bg-slate-900 rounded-lg animate-pulse" />}>
              <StatusFilter current={filter} />
            </Suspense>
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-sm">
                {allReports.length === 0
                  ? 'No calls yet. Submit your first request above.'
                  : 'No reports match this filter.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredReports.map(report => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
