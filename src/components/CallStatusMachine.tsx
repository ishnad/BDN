'use client'

import { Phone, Radio, Zap, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CallStatus } from '@/types'

interface Step {
  id: CallStatus
  label: string
  icon: React.ElementType
}

const STEPS: Step[] = [
  { id: 'queued', label: 'Queued', icon: Radio },
  { id: 'dialing', label: 'Dialing', icon: Phone },
  { id: 'in-progress', label: 'In Progress', icon: Zap },
  { id: 'done', label: 'Completed', icon: CheckCircle2 },
]

const STATUS_ORDER: CallStatus[] = ['planning', 'queued', 'dialing', 'in-progress', 'extracting', 'done']

function getStepIndex(status: CallStatus): number {
  return STATUS_ORDER.indexOf(status)
}

interface CallStatusMachineProps {
  status: CallStatus
  message?: string
}

export default function CallStatusMachine({ status, message }: CallStatusMachineProps) {
  const currentIndex = getStepIndex(status)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-slate-300 mb-5 uppercase tracking-wide">Call Status</h3>

      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const stepIndex = getStepIndex(step.id)
          const isDone = currentIndex > stepIndex
          const isActive = status === step.id || (status === 'extracting' && step.id === 'in-progress')
          const StepIcon = step.icon

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500',
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-600/20'
                      : 'bg-slate-800 text-slate-600'
                  )}
                >
                  <StepIcon
                    className={cn(
                      'w-4 h-4',
                      isActive && 'animate-pulse-slow'
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isDone ? 'text-emerald-400' : isActive ? 'text-blue-400' : 'text-slate-600'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mb-5 mx-1 transition-all duration-500',
                    currentIndex > getStepIndex(step.id) ? 'bg-emerald-500' : 'bg-slate-800'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Status message */}
      {message && (
        <p className="mt-4 text-sm text-slate-400 text-center">{message}</p>
      )}

      {(status === 'dialing' || status === 'in-progress') && (
        <div className="mt-4 flex justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
