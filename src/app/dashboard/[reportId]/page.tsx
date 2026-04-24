import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, Mail, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import type { Profile } from '@/types'
import { cn, formatConfidence, formatDate, mapReport } from '@/lib/utils'

interface PageProps {
  params: Promise<{ reportId: string }>
}

const NEXT_STEP_CONFIG = {
  'Mark as Resolved': { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  'Needs Human Approval': { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  'Draft Email': { icon: Mail, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { reportId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [profileResult, reportResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('call_reports').select('*').eq('id', reportId).single(),
  ])

  if (!reportResult.data) notFound()

  const profile = profileResult.data as Profile | null
  const report = mapReport(reportResult.data)
  const stepConfig = NEXT_STEP_CONFIG[report.nextStep] ?? NEXT_STEP_CONFIG['Needs Human Approval']
  const StepIcon = stepConfig.icon

  return (
    <div className="min-h-screen bg-slate-950">
      <NavBar user={user} profile={profile} />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard"
            className="mt-1 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{report.vendorName}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              {formatDate(report.createdAt)}
            </div>
          </div>
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium', stepConfig.bg, stepConfig.color)}>
            <StepIcon className="w-4 h-4" />
            {report.nextStep}
          </div>
        </div>

        {/* Triage card */}
        <div className={cn('p-4 rounded-xl border', stepConfig.bg)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Triage Recommendation</p>
              <p className={cn('text-lg font-bold mt-0.5', stepConfig.color)}>{report.nextStep}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-300">Confidence</p>
              <p className={cn('text-2xl font-bold', stepConfig.color)}>{formatConfidence(report.confidenceScore)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-300">{report.resolutionStatus}</p>
          {report.paymentDate && (
            <p className="mt-1 text-sm text-slate-400">
              Payment date: <span className="text-white font-medium">{report.paymentDate}</span>
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Original request */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Original Request</h2>
            <p className="text-white text-sm leading-relaxed">{report.naturalLanguageRequest}</p>
          </div>

          {/* Job spec */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Job Spec</h2>
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Objective: <span className="text-white">{report.jobSpec?.objective}</span></p>
              {report.jobSpec?.requiredQuestions?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mt-2 mb-1">Questions asked:</p>
                  <ul className="space-y-1">
                    {report.jobSpec.requiredQuestions.map((q, i) => (
                      <li key={i} className="text-xs text-slate-300 flex gap-2">
                        <span className="text-slate-600 shrink-0">{i + 1}.</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cleaned transcript */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Cleaned Transcript</h2>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono bg-slate-950/50 rounded-lg p-4 max-h-72 overflow-y-auto scrollbar-hide">
            {report.cleanedTranscript}
          </div>
        </div>

        {/* Raw extracted JSON */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Extracted JSON</h2>
          <pre className="text-xs text-emerald-400 bg-slate-950/50 rounded-lg p-4 overflow-x-auto scrollbar-hide">
            {JSON.stringify(
              {
                vendorName: report.vendorName,
                resolutionStatus: report.resolutionStatus,
                paymentDate: report.paymentDate,
                confidenceScore: report.confidenceScore,
                nextStep: report.nextStep,
              },
              null,
              2
            )}
          </pre>
        </div>
      </main>
    </div>
  )
}
