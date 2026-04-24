'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Mail, Clock, Building2, Package, Truck, CheckCheck } from 'lucide-react'
import { cn, formatConfidence, formatDate } from '@/lib/utils'
import OrderStatusUpdater from './OrderStatusUpdater'
import type { CallReport, OrderStatus } from '@/types'

const STEP_CONFIG = {
  'Mark as Resolved': {
    icon: CheckCircle2,
    badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    bar: 'bg-emerald-500',
    color: 'text-emerald-400',
  },
  'Needs Human Approval': {
    icon: AlertCircle,
    badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    bar: 'bg-amber-500',
    color: 'text-amber-400',
  },
  'Draft Email': {
    icon: Mail,
    badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    bar: 'bg-blue-500',
    color: 'text-blue-400',
  },
}

const ORDER_STATUS_CONFIG: Record<OrderStatus, { icon: typeof Package; label: string; badge: string }> = {
  preparing: { icon: Package, label: 'Preparing', badge: 'bg-slate-700/60 text-slate-300 border-slate-600' },
  in_transit: { icon: Truck, label: 'In Transit', badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  delivered: { icon: CheckCheck, label: 'Delivered', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
}

interface IncomingTicketCardProps {
  ticket: CallReport & { customerName: string | null }
}

export default function IncomingTicketCard({ ticket }: IncomingTicketCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [localOrderStatus, setLocalOrderStatus] = useState<OrderStatus>(ticket.orderStatus)
  const config = STEP_CONFIG[ticket.nextStep] ?? STEP_CONFIG['Needs Human Approval']
  const Icon = config.icon
  const confidence = ticket.confidenceScore ?? 0
  const orderConfig = ORDER_STATUS_CONFIG[localOrderStatus]
  const OrderIcon = orderConfig.icon

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition">
      <div className="h-0.5 bg-slate-800">
        <div className={cn('h-full transition-all', config.bar)} style={{ width: `${confidence * 100}%` }} />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                {ticket.customerName ?? 'Unknown Customer'}
              </div>
              <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium', config.badge)}>
                <Icon className="w-3 h-3" />
                {ticket.nextStep}
              </span>
              <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium', orderConfig.badge)}>
                <OrderIcon className="w-3 h-3" />
                {orderConfig.label}
              </span>
            </div>

            <p className="mt-1.5 text-sm text-slate-400 line-clamp-2">
              {ticket.naturalLanguageRequest}
            </p>

            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(ticket.createdAt)}
              </span>
              <span className={cn('font-medium', config.color)}>
                {formatConfidence(confidence)} confidence
              </span>
            </div>

            {ticket.resolutionStatus && (
              <p className="mt-2 text-xs text-slate-400 bg-slate-800/60 rounded-lg px-3 py-2 line-clamp-2">
                {ticket.resolutionStatus}
              </p>
            )}

            {/* Restock items summary */}
            {ticket.restockItems && ticket.restockItems.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ticket.restockItems.map((item, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full text-xs">
                    {item.itemName} ×{item.unitsOrdered}
                  </span>
                ))}
              </div>
            )}

            {/* Mark as In Transit — only when preparing */}
            {localOrderStatus === 'preparing' && (
              <div className="mt-3">
                <OrderStatusUpdater
                  reportId={ticket.id}
                  nextStatus="in_transit"
                  label="Mark as In Transit"
                  onUpdated={status => setLocalOrderStatus(status)}
                  className="text-xs px-3 py-1.5"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Call Transcript
            </p>
            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/50 rounded-lg p-3 max-h-48 overflow-y-auto font-mono">
              {ticket.cleanedTranscript || ticket.rawTranscript}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
