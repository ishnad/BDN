import { AlertTriangle, TrendingUp } from 'lucide-react'
import { STOCK_LEVEL_STYLES } from '@/lib/utils'
import type { StockSummary, StockLevel } from '@/types'

interface StockSummaryBarProps {
  summary: StockSummary
  totalItems: number
  lowStockCount: number
}

const LEVELS: StockLevel[] = ['critical', 'warning', 'caution', 'healthy', 'abundant']

export default function StockSummaryBar({ summary, totalItems, lowStockCount }: StockSummaryBarProps) {
  const smartRestock = lowStockCount >= 3

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      {/* Top row: counts + smart restock badge */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          {LEVELS.map(level => {
            const count = summary[level]
            const styles = STOCK_LEVEL_STYLES[level]
            return (
              <div key={level} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dotColor} ${level === 'critical' && count > 0 ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-semibold ${count > 0 ? styles.textColor : 'text-slate-600'}`}>
                  {count}
                </span>
                <span className="text-xs text-slate-500">{styles.label}</span>
              </div>
            )
          })}
        </div>

        {smartRestock && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full animate-pulse">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">
              {lowStockCount} items need restocking
            </span>
          </div>
        )}

        {!smartRestock && lowStockCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-full">
            <TrendingUp className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-400">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} low</span>
          </div>
        )}
      </div>

      {/* Proportional fill bar */}
      {totalItems > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800 gap-px">
          {LEVELS.map(level => {
            const count = summary[level]
            if (count === 0) return null
            const pct = (count / totalItems) * 100
            const dotColor = STOCK_LEVEL_STYLES[level].dotColor
            return (
              <div
                key={level}
                className={`${dotColor} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
