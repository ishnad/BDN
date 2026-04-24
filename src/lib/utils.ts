import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CallReport } from '@/types'

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

// Supabase returns snake_case column names — map to our camelCase CallReport interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapReport(row: Record<string, any>): CallReport {
  return {
    id: row.id,
    userId: row.user_id,
    vendorName: row.vendor_name,
    naturalLanguageRequest: row.natural_language_request,
    jobSpec: typeof row.job_spec === 'string' ? JSON.parse(row.job_spec) : row.job_spec,
    rawTranscript: row.raw_transcript,
    cleanedTranscript: row.cleaned_transcript,
    resolutionStatus: row.resolution_status,
    paymentDate: row.payment_date,
    confidenceScore: row.confidence_score,
    nextStep: row.next_step,
    createdAt: row.created_at,
  }
}
