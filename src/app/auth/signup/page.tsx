'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, Loader2, Building2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    // Pass role + company in metadata so the DB trigger picks them up automatically
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { role, company_name: companyName || null, phone_number: role === 'supplier' ? (phoneNumber || null) : null },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2.5 bg-blue-600 rounded-xl">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">Vendor Wrangler</div>
            <div className="text-xs text-slate-400">Ops Concierge</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
          <p className="text-slate-400 text-sm mb-6">Choose your role to get started</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(['customer', 'supplier'] as UserRole[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition cursor-pointer',
                  role === r
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                )}
              >
                {r === 'customer' ? (
                  <User className={cn('w-5 h-5', role === r ? 'text-blue-400' : 'text-slate-400')} />
                ) : (
                  <Building2 className={cn('w-5 h-5', role === r ? 'text-blue-400' : 'text-slate-400')} />
                )}
                <span className={cn('text-sm font-medium capitalize', role === r ? 'text-blue-300' : 'text-slate-400')}>
                  {r}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                placeholder="Acme Corp (optional)"
              />
            </div>

            {role === 'supplier' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Phone number
                  <span className="ml-1.5 text-xs text-slate-500">(customers will call you on this)</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                  placeholder="+65 6123 4567"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                placeholder="Min 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition flex items-center justify-center gap-2',
                loading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
