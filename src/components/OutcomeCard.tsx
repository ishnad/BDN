import Link from 'next/link'
import { CheckCircle2, AlertCircle, Mail, TrendingUp, ArrowRight } from 'lucide-react'
import { cn, formatConfidence } from '@/lib/utils'
import type { CallOutcomeSummary } from '@/types'

const STEP_CONFIG = {
  'Mark as Resolved': {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    action: 'Mark as Resolved',
  },
  'Needs Human Approval': {
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/20',
    action: 'Request Approval',
  },
  'Draft Email': {
    icon: Mail,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    action: 'Draft Follow-up Email',
  },
}

interface OutcomeCardProps {
  outcome: CallOutcomeSummary
  reportId: string
}

export default function OutcomeCard({ outcome, reportId }: OutcomeCardProps) {
  const config = STEP_CONFIG[outcome.nextStep] ?? STEP_CONFIG['Needs Human Approval']
  const Icon = config.icon

  return (
    <div className={cn('rounded-xl border p-5', config.bg)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn('w-5 h-5', config.color)} />
            <span className={cn('font-semibold', config.color)}>{outcome.nextStep}</span>
          </div>
          <p className="text-sm text-slate-300 mt-2">{outcome.resolutionStatus}</p>
          {outcome.paymentDate && (
            <p className="text-sm text-slate-400 mt-1">
              Payment date: <span className="text-white font-medium">{outcome.paymentDate}</span>
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-0.5">
            <TrendingUp className="w-3 h-3" />
            Confidence
          </div>
          <div className={cn('text-2xl font-bold', config.color)}>
            {formatConfidence(outcome.confidenceScore)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-500">Report saved to your dashboard</span>
        <Link
          href={`/dashboard/${reportId}`}
          className="flex items-center gap-1.5 text-sm font-medium text-white hover:text-slate-200 transition"
        >
          View full report <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
