'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Mail, Clock, ArrowRight } from 'lucide-react'
import { cn, formatConfidence, formatDate } from '@/lib/utils'
import type { CallReport } from '@/types'

const STEP_CONFIG = {
  'Mark as Resolved': {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    bar: 'bg-emerald-500',
  },
  'Needs Human Approval': {
    icon: AlertCircle,
    color: 'text-amber-400',
    badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    bar: 'bg-amber-500',
  },
  'Draft Email': {
    icon: Mail,
    color: 'text-blue-400',
    badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    bar: 'bg-blue-500',
  },
}

interface ReportCardProps {
  report: CallReport
}

export default function ReportCard({ report }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false)
  const config = STEP_CONFIG[report.nextStep] ?? STEP_CONFIG['Needs Human Approval']
  const Icon = config.icon
  const confidence = report.confidenceScore ?? 0

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition">
      {/* Confidence bar */}
      <div className="h-0.5 bg-slate-800">
        <div className={cn('h-full transition-all', config.bar)} style={{ width: `${confidence * 100}%` }} />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Vendor + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white">{report.vendorName}</h3>
              <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium', config.badge)}>
                <Icon className="w-3 h-3" />
                {report.nextStep}
              </span>
            </div>

            {/* Request preview */}
            <p className="mt-1 text-sm text-slate-400 line-clamp-1">
              {report.naturalLanguageRequest}
            </p>

            {/* Meta row */}
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(report.createdAt)}
              </span>
              <span className={cn('font-medium', config.color)}>
                {formatConfidence(confidence)} confidence
              </span>
              {report.paymentDate && (
                <span>Payment: {report.paymentDate}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/dashboard/${report.id}`}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="View full report"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Toggle transcript"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable transcript */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Cleaned Transcript
            </p>
            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/50 rounded-lg p-3 max-h-48 overflow-y-auto scrollbar-hide font-mono">
              {report.cleanedTranscript}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
