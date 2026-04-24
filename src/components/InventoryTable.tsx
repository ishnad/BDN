'use client'

import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { cn, getStockLevel, STOCK_LEVEL_STYLES } from '@/lib/utils'
import type { InventoryItem } from '@/types'

interface InventoryTableProps {
  items: InventoryItem[]
  onUpdate: (id: string, quantity: number, unitPrice: number | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

interface EditState {
  id: string
  quantity: string
  unitPrice: string
}

export default function InventoryTable({ items, onUpdate, onDelete }: InventoryTableProps) {
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  function startEdit(item: InventoryItem) {
    setEditing({ id: item.id, quantity: String(item.quantity), unitPrice: item.unitPrice ? String(item.unitPrice) : '' })
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(editing.id)
    await onUpdate(editing.id, parseInt(editing.quantity) || 0, editing.unitPrice ? parseFloat(editing.unitPrice) : null)
    setEditing(null)
    setSaving(null)
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
        <p className="text-sm">No inventory yet. Add your first item above.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Item</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">SKU</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Category</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Qty</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Min Alert</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Unit Price</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const level = getStockLevel(item.quantity, item.minStockAlert)
              const styles = STOCK_LEVEL_STYLES[level]
              const isCritical = level === 'critical'
              const isEditing = editing?.id === item.id
              const isSaving = saving === item.id

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-slate-800/50 transition-all duration-300',
                    styles.rowBg,
                    isCritical && styles.glowClass
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isCritical && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                      )}
                      <div>
                        <span className={cn('font-medium', styles.textColor)}>{item.itemName}</span>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.sku ?? '—'}</td>

                  <td className="px-4 py-3">
                    {item.category ? (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full text-xs">{item.category}</span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editing.quantity}
                        onChange={e => setEditing(prev => prev ? { ...prev, quantity: e.target.value } : null)}
                        className="w-20 px-2 py-1 bg-slate-800 border border-blue-500 rounded text-white text-right text-sm focus:outline-none"
                        min={0}
                      />
                    ) : (
                      <span className={cn('font-bold text-base', styles.textColor)}>{item.quantity}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className="text-slate-500 text-xs">{item.minStockAlert}</span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editing.unitPrice}
                        onChange={e => setEditing(prev => prev ? { ...prev, unitPrice: e.target.value } : null)}
                        className="w-24 px-2 py-1 bg-slate-800 border border-blue-500 rounded text-white text-right text-sm focus:outline-none"
                        min={0} step="0.01" placeholder="—"
                      />
                    ) : (
                      <span className="text-slate-300">
                        {item.unitPrice != null ? `$${item.unitPrice.toFixed(2)}` : '—'}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} disabled={isSaving} className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-lg transition">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
