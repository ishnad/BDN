'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PhoneCall, CheckCircle2, Loader2, X, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import CallStatusMachine from './CallStatusMachine'
import type { CustomerInventoryItem, CallStatus, JobSpec, CallOutcomeSummary } from '@/types'

interface RestockFlowState {
  phase: 'idle' | CallStatus
  message: string
  jobSpec?: JobSpec
  reportId?: string
  outcome?: CallOutcomeSummary
  itemsOrdered?: string[]
  error?: string
}

interface RestockCallButtonProps {
  lowStockItems: CustomerInventoryItem[]
  onRestockComplete?: () => void
}

export default function RestockCallButton({ lowStockItems, onRestockComplete }: RestockCallButtonProps) {
  const [flow, setFlow] = useState<RestockFlowState>({ phase: 'idle', message: '' })

  // Items that have a linked supplier (only these can be auto-called)
  const callableItems = lowStockItems.filter(i => i.supplierId && i.supplierPhone)

  // Pick the supplier with the most low-stock items
  const supplierGroups = callableItems.reduce<Map<string, CustomerInventoryItem[]>>((acc, item) => {
    const key = item.supplierId!
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key)!.push(item)
    return acc
  }, new Map())

  const primaryGroup = [...supplierGroups.entries()].sort((a, b) => b[1].length - a[1].length)[0]

  async function handleRestock() {
    if (!primaryGroup) return
    const [, groupItems] = primaryGroup
    const { supplierPhone, supplierName, supplierId } = groupItems[0]

    setFlow({ phase: 'planning', message: 'Claude is generating your restock brief…' })

    try {
      const res = await fetch('/api/restock-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          supplierPhone,
          supplierName: supplierName ?? 'Supplier',
          items: groupItems,
        }),
      })

      if (!res.body) throw new Error('No stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as Partial<RestockFlowState> & { status?: string }
            setFlow(prev => ({
              ...prev,
              phase: (event.status ?? event.phase ?? prev.phase) as RestockFlowState['phase'],
              message: event.message ?? prev.message,
              jobSpec: event.jobSpec ?? prev.jobSpec,
              reportId: event.reportId ?? prev.reportId,
              outcome: event.outcome ?? prev.outcome,
              itemsOrdered: event.itemsOrdered ?? prev.itemsOrdered,
              error: event.error,
            }))
          } catch { /* skip malformed lines */ }
        }
      }

      onRestockComplete?.()
    } catch (err) {
      setFlow({ phase: 'error', message: err instanceof Error ? err.message : 'Restock failed', error: err instanceof Error ? err.message : 'Restock failed' })
    }
  }

  function reset() {
    setFlow({ phase: 'idle', message: '' })
  }

  if (!callableItems.length) return null

  const isRunning = flow.phase !== 'idle' && flow.phase !== 'done' && flow.phase !== 'error'
  const supplierName = primaryGroup?.[1][0]?.supplierName ?? 'Supplier'
  const otherSuppliersCount = supplierGroups.size - 1

  // Done state
  if (flow.phase === 'done' && flow.itemsOrdered) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Restock Order Placed</p>
              <p className="text-xs text-emerald-600 mt-0.5">Call completed with {supplierName}</p>
            </div>
          </div>
          <button onClick={reset} className="text-emerald-600 hover:text-emerald-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">Items ordered:</p>
          <div className="flex flex-wrap gap-1.5">
            {flow.itemsOrdered.map(name => (
              <span key={name} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 rounded-full text-xs text-slate-200">
                <Package className="w-3 h-3 text-emerald-400" />
                {name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {flow.reportId && (
            <Link
              href={`/dashboard/${flow.reportId}`}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition font-medium"
            >
              View full report →
            </Link>
          )}
          <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-300 transition">
            Place another restock
          </button>
        </div>
      </div>
    )
  }

  // In-flight state
  if (isRunning) {
    return (
      <div className="space-y-3">
        <CallStatusMachine status={flow.phase as CallStatus} message={flow.message} />
        {flow.jobSpec && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Restock Brief</p>
            <p className="text-sm text-slate-300">{flow.jobSpec.objective}</p>
          </div>
        )}
      </div>
    )
  }

  // Idle / error state — show the button
  return (
    <div className="space-y-2">
      {flow.error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{flow.error}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleRestock}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
            'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400',
            'text-white shadow-lg shadow-red-900/40 hover:shadow-red-900/60'
          )}
        >
          <PhoneCall className="w-4 h-4" />
          Restock Low Stock ({callableItems.length} items)
        </button>

        <div className="text-xs text-slate-500">
          AI will call <span className="text-slate-300 font-medium">{supplierName}</span>
          {otherSuppliersCount > 0 && ` · ${otherSuppliersCount} more supplier${otherSuppliersCount > 1 ? 's' : ''} require separate calls`}
        </div>
      </div>
    </div>
  )
}
