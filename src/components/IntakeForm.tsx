'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Phone, FileText, Loader2, X } from 'lucide-react'
import CallStatusMachine from './CallStatusMachine'
import OutcomeCard from './OutcomeCard'
import type { CallStatus, JobSpec, CallOutcomeSummary } from '@/types'

interface FlowState {
  status: CallStatus
  message: string
  jobSpec?: JobSpec
  outcome?: CallOutcomeSummary
  reportId?: string
  error?: string
}

interface ApiError {
  code: string
  message: string
}

interface ApiEnvelope<TData> {
  data: TData | null
  error: ApiError | null
}

interface CallApiResponse {
  callId: string
  rawTranscript: string
  audioUrl: string | null
  isMock: boolean
}

type CallStreamStage = 'queued' | 'dialing' | 'in-progress'

interface CallStreamProgressEvent {
  type: 'progress'
  stage: CallStreamStage
  message: string
}

interface CallStreamHeartbeatEvent {
  type: 'heartbeat'
  elapsedSeconds: number
  message: string
}

interface CallStreamCompleteEvent {
  type: 'complete'
  data: CallApiResponse
}

interface CallStreamErrorEvent {
  type: 'error'
  error: ApiError
}

type CallStreamEvent =
  | CallStreamProgressEvent
  | CallStreamHeartbeatEvent
  | CallStreamCompleteEvent
  | CallStreamErrorEvent

const STATUS_MESSAGES: Partial<Record<CallStatus, string>> = {
  planning: 'Claude is generating your call brief…',
  queued: 'Call queued, connecting to vendor…',
  dialing: 'Dialing vendor number…',
  'in-progress': 'Call in progress, AI is speaking with vendor…',
  extracting: 'Claude is processing the transcript…',
  done: 'Call complete — report saved.',
}

export default function IntakeForm() {
  const router = useRouter()
  const [request, setRequest] = useState('')
  const [phone, setPhone] = useState('')
  const [flow, setFlow] = useState<FlowState>({ status: 'idle', message: '' })

  function updateFlow(patch: Partial<FlowState>) {
    setFlow(prev => ({ ...prev, ...patch }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (flow.status !== 'idle' && flow.status !== 'error') return

    updateFlow({ status: 'planning', message: STATUS_MESSAGES.planning ?? '', error: undefined })

    try {
      // Step 1: Generate job spec
      const planRes = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naturalLanguageRequest: request, vendorPhoneNumber: phone }),
      })
      if (!planRes.ok) throw new Error('Planning failed')
      const { jobSpec } = await planRes.json() as { jobSpec: JobSpec }

      // Step 2: Execute call (simulated state progression)
      updateFlow({ status: 'queued', message: STATUS_MESSAGES.queued ?? '', jobSpec })

      await delay(800)
      updateFlow({ status: 'dialing', message: STATUS_MESSAGES.dialing ?? '' })

      const callPromise = fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobSpec, vendorPhone: phone }),
      })

      // Show "in-progress" after a short delay to let dialing feel real
      await delay(1200)
      updateFlow({ status: 'in-progress', message: STATUS_MESSAGES['in-progress'] ?? '' })

      const callRes = await callPromise
      if (!callRes.ok) {
        let message = 'Call failed'

        try {
          const callPayload = await callRes.json() as ApiEnvelope<CallApiResponse>
          message = callPayload.error?.message ?? message
        } catch {
          // Keep fallback message when the response body is not JSON.
        }

        throw new Error(message)
      }

      const callData = await readCallStream(callRes, event => {
        if (event.type === 'heartbeat') {
          updateFlow({ status: 'in-progress', message: event.message })
          return
        }

        if (event.type === 'progress') {
          if (event.stage === 'in-progress') {
            updateFlow({ status: 'in-progress', message: event.message })
            return
          }

          updateFlow({ message: event.message })
        }
      })

      // Step 3: Extract + save
      updateFlow({ status: 'extracting', message: STATUS_MESSAGES.extracting ?? '' })

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTranscript: callData.rawTranscript,
          jobSpec,
          naturalLanguageRequest: request,
        }),
      })
      if (!extractRes.ok) throw new Error('Extraction failed')
      const { report, outcome } = await extractRes.json() as {
        report: { id: string }
        outcome: CallOutcomeSummary
      }

      updateFlow({ status: 'done', message: STATUS_MESSAGES.done ?? '', outcome, reportId: report.id })
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      updateFlow({ status: 'error', message, error: message })
    }
  }

  function reset() {
    setFlow({ status: 'idle', message: '' })
    setRequest('')
    setPhone('')
  }

  const isRunning = flow.status !== 'idle' && flow.status !== 'done' && flow.status !== 'error'

  return (
    <div className="space-y-4">
      {/* Input form */}
      {(flow.status === 'idle' || flow.status === 'error') && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
        >
          {flow.error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <X className="w-4 h-4 shrink-0" />
              {flow.error}
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              What should the AI ask the vendor?
            </label>
            <textarea
              value={request}
              onChange={e => setRequest(e.target.value)}
              required
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition resize-none"
              placeholder="e.g. Call Acme Supplies and confirm the payment date and status of invoice #4821. Ask for the contact name handling this."
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <Phone className="w-4 h-4 text-slate-400" />
                Vendor phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                placeholder="+65 6123 4567"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition"
              >
                <Send className="w-4 h-4" />
                Dispatch Call
              </button>
            </div>
          </div>
        </form>
      )}

      {/* In-flight status */}
      {isRunning && (
        <div className="space-y-4">
          <CallStatusMachine status={flow.status} message={flow.message} />
          {flow.jobSpec && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Job Brief</p>
              <p className="text-sm text-slate-300 font-medium">{flow.jobSpec.objective}</p>
              <ul className="mt-2 space-y-1">
                {flow.jobSpec.requiredQuestions.map((q, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-2">
                    <span className="text-slate-600 shrink-0">{i + 1}.</span> {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Extracting state */}
      {flow.status === 'extracting' && (
        <div className="flex items-center gap-2 text-sm text-slate-400 px-1">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          {flow.message}
        </div>
      )}

      {/* Done — show outcome */}
      {flow.status === 'done' && flow.outcome && flow.reportId && (
        <div className="space-y-3">
          <CallStatusMachine status="done" message="Call complete" />
          <OutcomeCard outcome={flow.outcome} reportId={flow.reportId} />
          <button
            onClick={reset}
            className="text-sm text-slate-400 hover:text-slate-200 transition px-1"
          >
            ← Start a new call
          </button>
        </div>
      )}
    </div>
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCallStreamStage(value: unknown): value is CallStreamStage {
  return value === 'queued' || value === 'dialing' || value === 'in-progress'
}

function isCallApiResponse(value: unknown): value is CallApiResponse {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.callId === 'string' &&
    typeof value.rawTranscript === 'string' &&
    (typeof value.audioUrl === 'string' || value.audioUrl === null) &&
    typeof value.isMock === 'boolean'
  )
}

function parseCallStreamEvent(line: string): CallStreamEvent | null {
  const trimmedLine = line.trim()
  if (!trimmedLine.startsWith('{')) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmedLine) as unknown
  } catch {
    return null
  }

  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return null
  }

  if (parsed.type === 'progress') {
    if (!isCallStreamStage(parsed.stage) || typeof parsed.message !== 'string') {
      return null
    }

    return {
      type: 'progress',
      stage: parsed.stage,
      message: parsed.message,
    }
  }

  if (parsed.type === 'heartbeat') {
    if (typeof parsed.elapsedSeconds !== 'number' || typeof parsed.message !== 'string') {
      return null
    }

    return {
      type: 'heartbeat',
      elapsedSeconds: parsed.elapsedSeconds,
      message: parsed.message,
    }
  }

  if (parsed.type === 'complete') {
    if (!isCallApiResponse(parsed.data)) {
      return null
    }

    return {
      type: 'complete',
      data: parsed.data,
    }
  }

  if (parsed.type === 'error') {
    if (!isRecord(parsed.error) || typeof parsed.error.code !== 'string' || typeof parsed.error.message !== 'string') {
      return null
    }

    return {
      type: 'error',
      error: {
        code: parsed.error.code,
        message: parsed.error.message,
      },
    }
  }

  return null
}

async function readCallStream(
  response: Response,
  onEvent: (event: CallStreamEvent) => void
): Promise<CallApiResponse> {
  let completeEvent: CallApiResponse | null = null
  let streamError: Error | null = null
  let shouldStop = false

  const handleLine = (line: string) => {
    const parsedEvent = parseCallStreamEvent(line)
    if (!parsedEvent) {
      return
    }

    onEvent(parsedEvent)

    if (parsedEvent.type === 'error') {
      streamError = new Error(parsedEvent.error.message)
      shouldStop = true
      return
    }

    if (parsedEvent.type === 'complete') {
      completeEvent = parsedEvent.data
      shouldStop = true
    }
  }

  if (!response.body) {
    const responseText = await response.text()
    for (const line of responseText.split('\n')) {
      handleLine(line)
      if (shouldStop) {
        break
      }
    }
  } else {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (!shouldStop) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)
        handleLine(line)

        if (shouldStop) {
          await reader.cancel()
          break
        }

        newlineIndex = buffer.indexOf('\n')
      }
    }

    if (!shouldStop) {
      buffer += decoder.decode()
      const remaining = buffer.trim()
      if (remaining.length > 0) {
        handleLine(remaining)
      }
    }
  }

  if (streamError) {
    throw streamError
  }

  if (!completeEvent) {
    throw new Error('Call stream ended before completion')
  }

  return completeEvent
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
