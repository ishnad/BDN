import { Zap, Tag, DollarSign } from 'lucide-react'
import type { SupplyMatch } from '@/types'

interface SupplyMatchCardProps {
  matches: SupplyMatch[]
}

export default function SupplyMatchCard({ matches }: SupplyMatchCardProps) {
  if (matches.length === 0) return null

  return (
    <div className="bg-slate-900 border border-blue-500/20 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <div className="p-1.5 bg-blue-500/15 rounded-lg">
          <Zap className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Supply Match Found</p>
          <p className="text-xs text-slate-400">{matches.length} supplier item{matches.length > 1 ? 's' : ''} match your request</p>
        </div>
      </div>

      <div className="divide-y divide-slate-800">
        {matches.map((match, i) => (
          <div key={i} className="px-4 py-3 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-sm font-medium text-white">{match.itemName}</span>
                <span className="text-xs text-slate-500">from {match.supplierName}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{match.relevanceReason}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500">{match.quantity} units</p>
              {match.unitPrice != null && (
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium mt-0.5">
                  <DollarSign className="w-3 h-3" />
                  {match.unitPrice.toFixed(2)}/unit
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
