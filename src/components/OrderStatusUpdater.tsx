'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrderStatus } from '@/types'

interface OrderStatusUpdaterProps {
  reportId: string
  nextStatus: OrderStatus
  label: string
  className?: string
  onUpdated?: (status: OrderStatus) => void
}

export default function OrderStatusUpdater({ reportId, nextStatus, label, className, onUpdated }: OrderStatusUpdaterProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/call-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: nextStatus }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        alert(data.error ?? 'Failed to update status')
        return
      }
      onUpdated?.(nextStatus)
      router.refresh()
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
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${styles[nextStatus]} ${className ?? ''}`}
    >
      {loading ? 'Updating…' : label}
    </button>
  )
}
