'use client'

import { useState } from 'react'
import { Sparkles, Megaphone, X, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InventoryItem } from '@/types'

interface OfferDraft {
  title: string
  content: string
  highlightedItems: string[]
  items: InventoryItem[]
  expiresAt: string
  supplierName: string
}

interface OfferGeneratorProps {
  onBroadcast: () => void
}

export default function OfferGenerator({ onBroadcast }: OfferGeneratorProps) {
  const [step, setStep] = useState<'idle' | 'generating' | 'preview' | 'broadcasting' | 'done'>('idle')
  const [draft, setDraft] = useState<OfferDraft | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStep('generating')
    setError(null)
    try {
      const res = await fetch('/api/generate-offer', { method: 'POST' })
      const data = await res.json() as { draft?: OfferDraft; error?: string }
      if (!res.ok || !data.draft) throw new Error(data.error ?? 'Generation failed')
      setDraft(data.draft)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
      setStep('idle')
    }
  }

  async function broadcast() {
    if (!draft) return
    setStep('broadcasting')
    try {
      const res = await fetch('/api/generate-offer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error('Broadcast failed')
      setStep('done')
      onBroadcast()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
      setStep('preview')
    }
  }

  if (step === 'done') {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-300">Offer broadcast to all customers</p>
          <p className="text-xs text-emerald-500 mt-0.5">Customers will see it on their dashboard immediately</p>
        </div>
        <button onClick={() => setStep('idle')} className="ml-auto text-emerald-500 hover:text-emerald-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {step === 'idle' && (
        <button
          onClick={generate}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition"
        >
          <Sparkles className="w-4 h-4" />
          Generate AI Offer
        </button>
      )}

      {step === 'generating' && (
        <div className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          <p className="text-sm text-slate-400">Claude is reading your inventory and drafting an offer…</p>
        </div>
      )}

      {(step === 'preview' || step === 'broadcasting') && draft && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-purple-500/10 border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-300">AI-Generated Offer Preview</span>
            </div>
            <button onClick={() => setStep('idle')} className="text-slate-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <h3 className="text-lg font-bold text-white">{draft.title}</h3>

            {draft.highlightedItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draft.highlightedItems.map(item => (
                  <span key={item} className="px-2.5 py-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/20 rounded-full text-xs font-medium">
                    {item}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{draft.content}</p>

            <p className="text-xs text-slate-500">
              Expires: {new Date(draft.expiresAt).toLocaleDateString('en-SG', { dateStyle: 'medium' })}
            </p>
          </div>

          <div className="px-5 py-3 border-t border-slate-800 flex gap-3">
            <button
              onClick={broadcast}
              disabled={step === 'broadcasting'}
              className={cn(
                'flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition',
                step === 'broadcasting' && 'opacity-70 cursor-not-allowed'
              )}
            >
              {step === 'broadcasting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              {step === 'broadcasting' ? 'Broadcasting…' : 'Broadcast to Customers'}
            </button>
            <button onClick={generate} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition">
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
