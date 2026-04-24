'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrderStatus } from '@/types'

interface InsufficientItem {
  itemName: string
  required: number
  available: number
}

interface ApiResponse {
  success?: boolean
  orderStatus?: OrderStatus
  error?: string
  warning?: string
  insufficientItems?: InsufficientItem[]
}

interface OrderStatusUpdaterProps {
  reportId: string
  nextStatus: OrderStatus
  label: string
  className?: string
  onUpdated?: (status: OrderStatus) => void
}

export default function OrderStatusUpdater({
  reportId,
  nextStatus,
  label,
  className,
  onUpdated,
}: OrderStatusUpdaterProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insufficientItems, setInsufficientItems] = useState<InsufficientItem[]>([])

  async function handleClick() {
    setLoading(true)
    setError(null)
    setInsufficientItems([])

    try {
      const res = await fetch(`/api/call-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: nextStatus }),
      })

      const data = await res.json() as ApiResponse

      if (!res.ok) {
        if (res.status === 422 && data.insufficientItems?.length) {
          setInsufficientItems(data.insufficientItems)
        } else {
          setError(data.error ?? 'Failed to update status')
        }
        return
      }

      if (data.warning) {
        setError(data.warning)
      }

      onUpdated?.(nextStatus)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const styles: Record<OrderStatus, string> = {
    in_transit: 'bg-amber-500 hover:bg-amber-400 text-white',
    delivered: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    preparing: 'bg-slate-700 hover:bg-slate-600 text-white',
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${styles[nextStatus]} ${className ?? ''}`}
      >
        {loading ? 'Updating…' : label}
      </button>

      {/* Insufficient inventory popup */}
      {insufficientItems.length > 0 && (
        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-red-400">Not enough stock to fulfil this order:</p>
          <ul className="space-y-1">
            {insufficientItems.map((item, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-center justify-between gap-4">
                <span className="truncate">{item.itemName}</span>
                <span className="shrink-0 text-red-400">
                  need <span className="font-bold">{item.required}</span>, have <span className="font-bold">{item.available}</span>
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setInsufficientItems([])}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* General error */}
      {error && (
        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start justify-between gap-2">
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-slate-500 hover:text-slate-300 shrink-0">✕</button>
        </div>
      )}
    </div>
  )
}
