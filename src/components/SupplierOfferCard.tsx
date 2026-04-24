import { Megaphone, Clock, Tag } from 'lucide-react'
import type { SupplierOffer } from '@/types'

interface SupplierOfferCardProps {
  offer: SupplierOffer
}

export default function SupplierOfferCard({ offer }: SupplierOfferCardProps) {
  const expiresDate = offer.expiresAt ? new Date(offer.expiresAt) : null
  const isExpiringSoon = expiresDate && (expiresDate.getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000

  const topItems = offer.items.slice(0, 3)

  return (
    <div className="bg-slate-900 border border-purple-500/20 rounded-xl overflow-hidden hover:border-purple-500/40 transition">
      {/* Header stripe */}
      <div className="h-0.5 bg-gradient-to-r from-purple-500 to-blue-500" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/15 rounded-lg">
              <Megaphone className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-purple-400 font-medium">{offer.supplierName ?? 'Supplier Offer'}</p>
              <h3 className="font-semibold text-white text-sm leading-tight">{offer.title}</h3>
            </div>
          </div>
          {expiresDate && (
            <div className={`flex items-center gap-1 text-xs shrink-0 ${isExpiringSoon ? 'text-amber-400' : 'text-slate-500'}`}>
              <Clock className="w-3 h-3" />
              {expiresDate.toLocaleDateString('en-SG', { dateStyle: 'medium' })}
            </div>
          )}
        </div>

        <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 mb-3">{offer.content}</p>

        {topItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topItems.map(item => (
              <span key={item.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-full text-xs text-slate-300">
                <Tag className="w-3 h-3 text-slate-500" />
                {item.itemName}
                {item.quantity > 0 && <span className="text-slate-500">({item.quantity} units)</span>}
                {item.unitPrice != null && <span className="text-emerald-400">${item.unitPrice}/unit</span>}
              </span>
            ))}
            {offer.items.length > 3 && (
              <span className="px-2.5 py-1 bg-slate-800 rounded-full text-xs text-slate-500">
                +{offer.items.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
