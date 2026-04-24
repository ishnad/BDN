'use client'

import Link from 'next/link'
import { Phone, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/actions'
import type { Profile } from '@/types'
import type { User } from '@supabase/supabase-js'

interface NavBarProps {
  user: User
  profile: Profile | null
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition px-2 py-1 rounded-lg hover:bg-slate-800"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </form>
  )
}

export default function NavBar({ user, profile }: NavBarProps) {
  const role = profile?.role ?? 'customer'

  return (
    <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="p-1.5 bg-blue-600 rounded-lg group-hover:bg-blue-500 transition">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">Vendor Wrangler</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>

          {/* Role badge */}
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
              role === 'admin'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                : role === 'supplier'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
            )}
          >
            {role}
          </span>

          <SignOutButton />
        </div>
      </div>
    </nav>
  )
}
