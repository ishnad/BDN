import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CallReport, StockLevel } from '@/types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const STOCK_LEVEL_ORDER: Record<StockLevel, number> = {
  critical: 0, warning: 1, caution: 2, healthy: 3, abundant: 4,
}

export function getStockLevel(currentQuantity: number, restockThreshold: number): StockLevel {
  if (restockThreshold === 0) return 'abundant'
  const ratio = currentQuantity / restockThreshold
  if (ratio < 1) return 'critical'
  if (ratio < 1.25) return 'warning'
  if (ratio < 1.75) return 'caution'
  if (ratio < 2.5) return 'healthy'
  return 'abundant'
}

export const STOCK_LEVEL_STYLES: Record<StockLevel, {
  rowBg: string
  textColor: string
  dotColor: string
  badgeBg: string
  badgeText: string
  glowClass: string
  label: string
}> = {
  critical: {
    rowBg: 'bg-red-500/8 hover:bg-red-500/15',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
    badgeBg: 'bg-red-500/15 border-red-500/30',
    badgeText: 'text-red-400',
    glowClass: 'animate-pulse-glow',
    label: 'Critical',
  },
  warning: {
    rowBg: 'bg-orange-500/6 hover:bg-orange-500/12',
    textColor: 'text-orange-400',
    dotColor: 'bg-orange-500',
    badgeBg: 'bg-orange-500/15 border-orange-500/30',
    badgeText: 'text-orange-400',
    glowClass: '',
    label: 'Warning',
  },
  caution: {
    rowBg: 'bg-amber-500/5 hover:bg-amber-500/10',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-400',
    badgeBg: 'bg-amber-500/15 border-amber-500/30',
    badgeText: 'text-amber-400',
    glowClass: '',
    label: 'Caution',
  },
  healthy: {
    rowBg: 'hover:bg-slate-800/30',
    textColor: 'text-teal-400',
    dotColor: 'bg-teal-400',
    badgeBg: 'bg-teal-500/15 border-teal-500/30',
    badgeText: 'text-teal-400',
    glowClass: '',
    label: 'Healthy',
  },
  abundant: {
    rowBg: 'hover:bg-slate-800/30',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
    badgeText: 'text-emerald-400',
    glowClass: '',
    label: 'Abundant',
  },
}

// Supabase returns snake_case column names — map to our camelCase CallReport interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapReport(row: Record<string, any>): CallReport {
  return {
    id: row.id,
    userId: row.user_id,
    supplierId: row.supplier_id ?? null,
    vendorName: row.vendor_name,
    naturalLanguageRequest: row.natural_language_request,
    jobSpec: typeof row.job_spec === 'string' ? JSON.parse(row.job_spec) : row.job_spec,
    rawTranscript: row.raw_transcript,
    cleanedTranscript: row.cleaned_transcript,
    resolutionStatus: row.resolution_status,
    paymentDate: row.payment_date,
    confidenceScore: row.confidence_score,
    nextStep: row.next_step,
    orderStatus: row.order_status ?? 'preparing',
    restockItems: row.restock_items ?? null,
    createdAt: row.created_at,
  }
}
