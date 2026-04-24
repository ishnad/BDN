'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Needs Approval', value: 'Needs Human Approval' },
  { label: 'Resolved', value: 'Mark as Resolved' },
  { label: 'Draft Email', value: 'Draft Email' },
]

interface StatusFilterProps {
  current: string | undefined
}

export default function StatusFilter({ current }: StatusFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('filter')
    } else {
      params.set('filter', value)
    }
    router.push(`/dashboard?${params.toString()}`)
  }

  const active = current ?? 'all'

  return (
    <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
      {FILTERS.map(f => (
        <button
          key={f.value}
          onClick={() => setFilter(f.value)}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-medium transition',
            active === f.value
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
