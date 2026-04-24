'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import NavBar from '@/components/NavBar'
import PresenterBanner from '@/components/PresenterBanner'
import SupplierStats from '@/components/SupplierStats'
import InventoryTable from '@/components/InventoryTable'
import AddInventoryForm from '@/components/AddInventoryForm'
import IncomingTicketCard from '@/components/IncomingTicketCard'
import { getStockLevel, STOCK_LEVEL_ORDER } from '@/lib/utils'
import type { InventoryItem, CallReport, Profile } from '@/types'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type IncomingTicket = CallReport & { customerName: string | null }

export default function SupplierPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [incomingCalls, setIncomingCalls] = useState<IncomingTicket[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchInventory = useCallback(async () => {
    const res = await fetch('/api/inventory')
    if (res.ok) {
      const data = await res.json() as { items: InventoryItem[] }
      setItems(data.items ?? [])
    }
  }, [])

  const fetchIncomingCalls = useCallback(async () => {
    const res = await fetch('/api/incoming-calls')
    if (res.ok) {
      const data = await res.json() as { tickets: IncomingTicket[] }
      setIncomingCalls(data.tickets ?? [])
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return }
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p as Profile | null)
      await Promise.all([fetchInventory(), fetchIncomingCalls()])
      setLoading(false)
    })
  }, [router, fetchInventory, fetchIncomingCalls])

  async function handleUpdate(id: string, quantity: number, unitPrice: number | null) {
    await fetch('/api/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, quantity, unitPrice }),
    })
    await fetchInventory()
  }

  async function handleDelete(id: string) {
    await fetch('/api/inventory', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function handleAdded(item: InventoryItem) {
    setItems(prev => [item, ...prev])
    setShowAddForm(false)
  }

  const sortedItems = useMemo(
    () => [...items].sort((a, b) =>
      STOCK_LEVEL_ORDER[getStockLevel(a.quantity, a.minStockAlert)] -
      STOCK_LEVEL_ORDER[getStockLevel(b.quantity, b.minStockAlert)]
    ),
    [items]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const showBanner = process.env.NEXT_PUBLIC_SHOW_PRESENTER_BANNER === 'true'

  return (
    <div className="min-h-screen bg-slate-950">
      {user && <NavBar user={user} profile={profile} />}
      {showBanner && <PresenterBanner />}

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Supplier Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            {profile?.companyName ?? 'Your company'} · Manage inventory and review incoming customer requests
          </p>
        </div>

        {/* Stats */}
        <SupplierStats items={items} incomingCount={incomingCalls.length} />

        {/* Inventory section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Inventory</h2>
              <p className="text-xs text-slate-500 mt-0.5">Your current stock levels</p>
            </div>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition border border-slate-700"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            )}
          </div>

          {showAddForm && (
            <AddInventoryForm
              onAdded={handleAdded}
              onClose={() => setShowAddForm(false)}
            />
          )}

          <InventoryTable
            items={sortedItems}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </section>

        {/* Incoming customer requests */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Incoming Requests
              {incomingCalls.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">({incomingCalls.length})</span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              AI-dispatched calls from your customers
            </p>
          </div>

          {incomingCalls.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-sm">No incoming requests yet. Customers will appear here when they call you.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {incomingCalls.map(ticket => (
                <IncomingTicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
