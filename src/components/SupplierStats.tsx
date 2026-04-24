import { Package, AlertTriangle, PhoneIncoming, TrendingUp } from 'lucide-react'
import type { InventoryItem } from '@/types'

interface SupplierStatsProps {
  items: InventoryItem[]
  incomingCount: number
}

export default function SupplierStats({ items, incomingCount }: SupplierStatsProps) {
  const totalSkus = items.length
  const lowStock = items.filter(i => i.quantity <= i.minStockAlert).length
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0)

  const stats = [
    { label: 'Total SKUs', value: totalSkus, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Total Units', value: totalUnits.toLocaleString(), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Low Stock', value: lowStock, icon: AlertTriangle, color: lowStock > 0 ? 'text-amber-400' : 'text-slate-500', bg: lowStock > 0 ? 'bg-amber-400/10' : 'bg-slate-800' },
    { label: 'Incoming Requests', value: incomingCount, icon: PhoneIncoming, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => {
        const Icon = s.icon
        return (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.bg}`}>
              <Icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
