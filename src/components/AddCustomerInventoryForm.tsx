'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustomerInventoryItem, SupplierOption } from '@/types'

interface AddCustomerInventoryFormProps {
  onAdded: (item: CustomerInventoryItem) => void
  onClose: () => void
}

export default function AddCustomerInventoryForm({ onAdded, onClose }: AddCustomerInventoryFormProps) {
  const [itemName, setItemName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [currentQuantity, setCurrentQuantity] = useState('')
  const [restockThreshold, setRestockThreshold] = useState('10')
  const [supplierId, setSupplierId] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/suppliers')
      .then(r => r.ok ? r.json() : { suppliers: [] })
      .then((data: { suppliers: SupplierOption[] }) => setSuppliers(data.suppliers ?? []))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/customer-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: {
            itemName,
            sku: sku || null,
            category: category || null,
            currentQuantity: parseInt(currentQuantity) || 0,
            restockThreshold: parseInt(restockThreshold) || 10,
            supplierId: supplierId || null,
            unitCost: unitCost ? parseFloat(unitCost) : null,
          },
        }),
      })
      const data = await res.json() as { item?: CustomerInventoryItem; error?: string }
      if (!res.ok || !data.item) throw new Error(data.error ?? 'Failed to add item')
      onAdded(data.item)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">Add Inventory Item</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-slate-400 mb-1 block">Item name *</label>
            <input value={itemName} onChange={e => setItemName(e.target.value)} required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="A4 Copy Paper" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">SKU</label>
            <input value={sku} onChange={e => setSku(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="PAP-001" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Stationery" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Current quantity *</label>
            <input type="number" value={currentQuantity} onChange={e => setCurrentQuantity(e.target.value)} required min={0}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="50" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Restock threshold *</label>
            <input type="number" value={restockThreshold} onChange={e => setRestockThreshold(e.target.value)} required min={1}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="10" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-400 mb-1 block">Supplier</label>
            <div className="relative">
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                className="w-full appearance-none px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-8">
                <option value="">No supplier linked</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.companyName}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Unit cost ($)</label>
            <input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} min={0} step="0.01"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="8.90" />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className={cn('flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition',
            loading && 'opacity-70 cursor-not-allowed')}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {loading ? 'Adding…' : 'Add Item'}
        </button>
      </form>
    </div>
  )
}
