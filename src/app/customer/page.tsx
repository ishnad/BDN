'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import NavBar from '@/components/NavBar'
import PresenterBanner from '@/components/PresenterBanner'
import IntakeForm from '@/components/IntakeForm'
import ReportCard from '@/components/ReportCard'
import SupplierOfferCard from '@/components/SupplierOfferCard'
import StockSummaryBar from '@/components/StockSummaryBar'
import CustomerInventoryTable from '@/components/CustomerInventoryTable'
import RestockCallButton from '@/components/RestockCallButton'
import AddCustomerInventoryForm from '@/components/AddCustomerInventoryForm'
import { mapReport, getStockLevel, STOCK_LEVEL_ORDER } from '@/lib/utils'
import type { CallReport, SupplierOffer, Profile, CustomerInventoryItem, StockSummary } from '@/types'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export default function CustomerPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reports, setReports] = useState<CallReport[]>([])
  const [offers, setOffers] = useState<SupplierOffer[]>([])
  const [inventory, setInventory] = useState<CustomerInventoryItem[]>([])
  const [showAddInventoryForm, setShowAddInventoryForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const fetchReports = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('call_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setReports((data ?? []).map(mapReport))
  }, [])

  const fetchOffers = useCallback(async () => {
    const res = await fetch('/api/offers')
    if (res.ok) {
      const data = await res.json() as { offers: SupplierOffer[] }
      setOffers(data.offers ?? [])
    }
  }, [])

  const fetchInventory = useCallback(async () => {
    const res = await fetch('/api/customer-inventory')
    if (res.ok) {
      const data = await res.json() as { items: CustomerInventoryItem[] }
      setInventory(data.items ?? [])
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) { router.push('/auth/login'); return }
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p as Profile | null)
      await Promise.all([fetchReports(), fetchOffers(), fetchInventory()])
      setLoading(false)
    })
  }, [router, fetchReports, fetchOffers, fetchInventory])

  async function handleInventoryUpdate(id: string, patch: { currentQuantity?: number; restockThreshold?: number }) {
    await fetch('/api/customer-inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    await fetchInventory()
  }

  async function handleInventoryDelete(id: string) {
    await fetch('/api/customer-inventory', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setInventory(prev => prev.filter(i => i.id !== id))
  }

  const sortedInventory = useMemo(
    () => [...inventory].sort((a, b) =>
      STOCK_LEVEL_ORDER[getStockLevel(a.currentQuantity, a.restockThreshold)] -
      STOCK_LEVEL_ORDER[getStockLevel(b.currentQuantity, b.restockThreshold)]
    ),
    [inventory]
  )

  const stockSummary = useMemo<StockSummary>(() => {
    const s: StockSummary = { critical: 0, warning: 0, caution: 0, healthy: 0, abundant: 0 }
    for (const item of inventory) s[getStockLevel(item.currentQuantity, item.restockThreshold)]++
    return s
  }, [inventory])

  const lowStockItems = useMemo(
    () => inventory.filter(i => i.currentQuantity <= i.restockThreshold && i.supplierId != null),
    [inventory]
  )

  const filteredReports = filter && filter !== 'all'
    ? reports.filter(r => r.nextStep === filter)
    : reports

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const showBanner = process.env.NEXT_PUBLIC_SHOW_PRESENTER_BANNER === 'true'

  return (
    <div className="min-h-screen bg-slate-950">
      {user && <NavBar user={user} profile={profile} />}
      {showBanner && <PresenterBanner />}

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            {profile?.companyName ?? 'Your company'} · Track stock, dispatch AI vendor calls, browse supplier offers
          </p>
        </div>

        {/* ── Inventory Dashboard ─────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Inventory Dashboard</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track your company stock · One click to reorder from suppliers
              </p>
            </div>
            {!showAddInventoryForm && (
              <button
                onClick={() => setShowAddInventoryForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition border border-slate-700"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            )}
          </div>

          {showAddInventoryForm && (
            <AddCustomerInventoryForm
              onAdded={item => { setInventory(prev => [item, ...prev]); setShowAddInventoryForm(false) }}
              onClose={() => setShowAddInventoryForm(false)}
            />
          )}

          {inventory.length > 0 && (
            <StockSummaryBar
              summary={stockSummary}
              totalItems={inventory.length}
              lowStockCount={lowStockItems.length}
            />
          )}

          {lowStockItems.length > 0 && (
            <RestockCallButton
              lowStockItems={lowStockItems}
              onRestockComplete={() => { fetchInventory(); fetchReports() }}
            />
          )}

          <CustomerInventoryTable
            items={sortedInventory}
            onUpdate={handleInventoryUpdate}
            onDelete={handleInventoryDelete}
          />
        </section>

        {/* ── Supplier Offers ──────────────────────────────────────── */}
        {offers.length > 0 && (
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Supplier Offers</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                AI-curated offers from your supplier network · {offers.length} active
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {offers.map(offer => (
                <SupplierOfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          </section>
        )}

        {/* ── New Call Request ─────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">New Call Request</h2>
          <IntakeForm onCallComplete={fetchReports} />
        </section>

        {/* ── Call Reports ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Call Reports
              {reports.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">({reports.length})</span>
              )}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {['all', 'Mark as Resolved', 'Needs Human Approval', 'Draft Email'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === f
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-sm">
                {reports.length === 0
                  ? 'No calls yet. Dispatch your first request above.'
                  : 'No reports match this filter.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredReports.map(report => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
