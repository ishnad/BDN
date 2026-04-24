'use client'

import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { cn, getStockLevel, STOCK_LEVEL_STYLES } from '@/lib/utils'
import type { CustomerInventoryItem } from '@/types'

interface CustomerInventoryTableProps {
  items: CustomerInventoryItem[]
  onUpdate: (id: string, patch: { currentQuantity?: number; restockThreshold?: number }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

interface EditState {
  id: string
  currentQuantity: string
  restockThreshold: string
}

export default function CustomerInventoryTable({ items, onUpdate, onDelete }: CustomerInventoryTableProps) {
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  function startEdit(item: CustomerInventoryItem) {
    setEditing({
      id: item.id,
      currentQuantity: String(item.currentQuantity),
      restockThreshold: String(item.restockThreshold),
    })
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(editing.id)
    await onUpdate(editing.id, {
      currentQuantity: parseInt(editing.currentQuantity) || 0,
      restockThreshold: parseInt(editing.restockThreshold) || 10,
    })
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Category</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">In Stock</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Threshold</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Need</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Supplier</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const level = getStockLevel(item.currentQuantity, item.restockThreshold)
              const styles = STOCK_LEVEL_STYLES[level]
              const isCritical = level === 'critical'
              const isEditing = editing?.id === item.id
              const isSaving = saving === item.id
              const unitsNeeded = Math.max(0, item.restockThreshold - item.currentQuantity)

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-slate-800/50 transition-all duration-300',
                    styles.rowBg,
                    isCritical && styles.glowClass
                  )}
                >
                  {/* Item name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isCritical && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                      )}
                      <div>
                        <span className={cn('font-medium', isCritical ? 'text-red-300' : 'text-white')}>
                          {item.itemName}
                        </span>
                        {item.sku && (
                          <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    {item.category ? (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full text-xs">{item.category}</span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>

                  {/* Current quantity */}
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editing.currentQuantity}
                        onChange={e => setEditing(prev => prev ? { ...prev, currentQuantity: e.target.value } : null)}
                        className="w-20 px-2 py-1 bg-slate-800 border border-blue-500 rounded text-white text-right text-sm focus:outline-none"
                        min={0}
                      />
                    ) : (
                      <span className={cn('font-bold text-base', styles.textColor)}>
                        {item.currentQuantity}
                      </span>
                    )}
                  </td>

                  {/* Restock threshold */}
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editing.restockThreshold}
                        onChange={e => setEditing(prev => prev ? { ...prev, restockThreshold: e.target.value } : null)}
                        className="w-20 px-2 py-1 bg-slate-800 border border-blue-500 rounded text-white text-right text-sm focus:outline-none"
                        min={1}
                      />
                    ) : (
                      <span className="text-slate-400 text-sm">{item.restockThreshold}</span>
                    )}
                  </td>

                  {/* Units needed */}
                  <td className="px-4 py-3 text-right">
                    {unitsNeeded > 0 ? (
                      <span className={cn('font-semibold text-sm', styles.textColor)}>+{unitsNeeded}</span>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>

                  {/* Supplier */}
                  <td className="px-4 py-3">
                    {item.supplierName ? (
                      <span className="text-slate-300 text-xs">{item.supplierName}</span>
                    ) : (
                      <span className="text-slate-600 text-xs">No supplier</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={isSaving}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-lg transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                          >
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
