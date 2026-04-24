'use client'

import { useState } from 'react'
import { Sparkles, Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InventoryItem } from '@/types'

type Mode = 'nl' | 'form'

interface AddInventoryFormProps {
  onAdded: (item: InventoryItem) => void
  onClose: () => void
}

export default function AddInventoryForm({ onAdded, onClose }: AddInventoryFormProps) {
  const [mode, setMode] = useState<Mode>('nl')
  const [nl, setNl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Structured form fields
  const [itemName, setItemName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [description, setDescription] = useState('')
  const [minStock, setMinStock] = useState('10')

  async function handleNLSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naturalLanguage: nl }),
      })
      const data = await res.json() as { item?: InventoryItem; error?: string }
      if (!res.ok || !data.item) throw new Error(data.error ?? 'Failed to add item')
      onAdded(data.item)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: {
            itemName, sku: sku || null, category: category || null,
            quantity: parseInt(quantity) || 0,
            unitPrice: unitPrice ? parseFloat(unitPrice) : null,
            description: description || null,
            minStockAlert: parseInt(minStock) || 10,
          },
        }),
      })
      const data = await res.json() as { item?: InventoryItem; error?: string }
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

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setMode('nl')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition', mode === 'nl' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}
        >
          <Sparkles className="w-3 h-3" /> AI Parse
        </button>
        <button
          onClick={() => setMode('form')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition', mode === 'form' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}
        >
          <Plus className="w-3 h-3" /> Manual
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {mode === 'nl' ? (
        <form onSubmit={handleNLSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Describe the item in plain English</label>
            <textarea
              value={nl}
              onChange={e => setNl(e.target.value)}
              required
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder='e.g. "200 blue office chairs SKU-CH001 at $45 each, min alert 50"'
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={cn('flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition', loading && 'opacity-70 cursor-not-allowed')}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Parsing…' : 'Parse & Add'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Item name *</label>
              <input value={itemName} onChange={e => setItemName(e.target.value)} required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Office Chair" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">SKU</label>
              <input value={sku} onChange={e => setSku(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="CH-001" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Category</label>
              <input value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Furniture" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Quantity *</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min={0} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="200" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Unit price ($)</label>
              <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} min={0} step="0.01" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="45.00" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Low stock alert at</label>
              <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} min={0} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="10" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Optional product description" />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={cn('flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition', loading && 'opacity-70 cursor-not-allowed')}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Adding…' : 'Add Item'}
          </button>
        </form>
      )}
    </div>
  )
}
