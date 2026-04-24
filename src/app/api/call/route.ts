import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { JobSpec } from '@/types'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const MOCK_TRANSCRIPT = `
Agent: Good morning, this is an AI assistant calling on behalf of a client. May I speak with someone from accounts payable?
Vendor: Yes, speaking. How can I help?
Agent: Thank you. I'm calling to confirm the payment status and expected date for invoice number 4821.
Vendor: Let me pull that up. One moment please.
Agent: Of course, take your time.
Vendor: Yes, I have invoice 4821 here. It was approved for payment last Tuesday. The payment is scheduled to go out on the 15th of next month via bank transfer.
Agent: Perfect. And the full amount will be paid — no deductions or disputes?
Vendor: Correct, full amount, no disputes on our end.
Agent: Could I get your name for our records, please?
Vendor: This is Sarah Chen, accounts payable manager.
Agent: Thank you, Sarah. Just to confirm: invoice 4821, full payment, scheduled for the 15th via bank transfer, confirmed by Sarah Chen. Is that all correct?
Vendor: That's all correct, yes.
Agent: Wonderful. Thank you for your time. Have a great day.
Vendor: You too, goodbye.
`.trim()

const MOCK_AUDIO_SNIPPET_URL =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA='

type ApiErrorCode = 'BAD_REQUEST' | 'UNAUTHORIZED' | 'SERVICE_UNAVAILABLE' | 'SERVER_ERROR'

interface ApiError {
  code: ApiErrorCode
  message: string
}

interface ApiEnvelope<TData> {
  data: TData | null
  error: ApiError | null
}

interface CallRequestBody {
  jobSpec: JobSpec
  vendorPhone: string
}

interface CallExecutionResult {
  callId: string
  rawTranscript: string
  audioUrl: string | null
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
  data: CallExecutionResult & { isMock: boolean }
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

interface GensparkCallPayload {
  recipient: string
  contact_info: string
  is_place_id: boolean
  purpose: string
}

interface GenericRecord {
  [key: string]: unknown
}

interface ErrorWithCode {
  code?: unknown
  cause?: unknown
}

type GensparkCallStatus = 'completed' | 'failed' | 'busy' | 'no-answer' | 'canceled' | 'unknown'

interface GensparkContact {
  title?: string
  phone?: string
  address?: string
}

interface GensparkResultData {
  call_status?: GensparkCallStatus
  call_summary?: string
  duration_seconds?: number
  recipient?: string
  call_id?: string
}

interface GensparkStreamEvent {
  step?: 'resolved' | 'calling'
  contact?: GensparkContact
  heartbeat?: boolean
  elapsed_seconds?: number
  call_step?: string
  message?: string
  project_id?: string
  status?: 'ok' | 'error'
  data?: GensparkResultData
}

class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceUnavailableError'
  }
}

const GENSPARK_CALL_ENDPOINT = 'https://www.genspark.ai/api/tool_cli/phone_call/initiate'

const FAILED_CALL_STATUSES = new Set<GensparkCallStatus>(['failed', 'busy', 'no-answer', 'canceled'])

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function asRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as GenericRecord
}

function getSystemErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const errorWithCode = error as ErrorWithCode
  if (typeof errorWithCode.code === 'string') {
    return errorWithCode.code
  }

  if (errorWithCode.cause && typeof errorWithCode.cause === 'object') {
    const causeWithCode = errorWithCode.cause as ErrorWithCode
    if (typeof causeWithCode.code === 'string') {
      return causeWithCode.code
    }
  }

  return null
}

function buildCallPurpose(jobSpec: JobSpec): string {
  const requiredQuestions = jobSpec.requiredQuestions.map((question, index) => `${index + 1}. ${question}`)
  const guardrails = jobSpec.escalationGuardrails.map((guardrail, index) => `${index + 1}. ${guardrail}`)

  return [
    jobSpec.objective,
    '',
    `Required questions:\n${requiredQuestions.join('\n')}`,
    '',
    `Escalation guardrails:\n${guardrails.join('\n')}`,
    '',
    `Echo mitigation prompt:\n${jobSpec.echoMitigationPrompt}`,
  ].join('\n')
}

function getGensparkCallEndpoint(): string {
  const configuredEndpoint = process.env.GENSPARK_CALL_ENDPOINT
  if (isNonEmptyString(configuredEndpoint)) {
    return configuredEndpoint.trim()
  }

  return GENSPARK_CALL_ENDPOINT
}

function getGensparkProjectId(): string | null {
  const projectId = process.env.GENSPARK_PROJECT_ID ?? process.env.GSK_PROJECT_ID
  return toNonEmptyString(projectId)
}

function parseGensparkStreamEvent(line: string): GensparkStreamEvent | null {
  if (!line.startsWith('{')) {
    return null
  }

  try {
    const parsed = JSON.parse(line) as unknown
    const parsedRecord = asRecord(parsed)
    if (!parsedRecord) {
      return null
    }

    return parsedRecord as GensparkStreamEvent
  } catch {
    return null
  }
}

function formatContactForTranscript(contact: GensparkContact): string | null {
  const values = [contact.title, contact.phone, contact.address]
    .map(value => toNonEmptyString(value))
    .filter((value): value is string => value !== null)

  if (values.length === 0) {
    return null
  }

  return values.join(' | ')
}

function formatProgressEvent(event: GensparkStreamEvent): string | null {
  if (isNonEmptyString(event.call_step)) {
    return `Call step: ${event.call_step}`
  }

  if (event.contact) {
    const formattedContact = formatContactForTranscript(event.contact)
    if (formattedContact) {
      return `Contact: ${formattedContact}`
    }
  }

  return null
}

function composeTranscript(summary: string | null, progressEvents: GensparkStreamEvent[]): string | null {
  const lines: string[] = []

  if (summary) {
    lines.push(summary)
  }

  for (const event of progressEvents) {
    const line = formatProgressEvent(event)
    if (line) {
      lines.push(line)
    }
  }

  const transcript = lines.join('\n').trim()
  return transcript.length > 0 ? transcript : null
}

function extractCallId(finalEvent: GensparkStreamEvent, progressEvents: GensparkStreamEvent[]): string {
  const candidates: Array<string | null> = [
    toNonEmptyString(finalEvent.data?.call_id),
    toNonEmptyString(finalEvent.project_id),
  ]

  for (const event of progressEvents) {
    candidates.push(toNonEmptyString(event.project_id))
  }

  for (const candidate of candidates) {
    if (candidate) {
      return candidate
    }
  }

  return `gspk-${Date.now()}`
}

function isFailedCallStatus(callStatus: GensparkCallStatus): boolean {
  return FAILED_CALL_STATUSES.has(callStatus)
}

function hasTerminalCallStatus(event: GensparkStreamEvent): boolean {
  if (event.status === 'error') {
    return true
  }

  if (!event.status || !event.data?.call_status) {
    return false
  }

  return event.data.call_status === 'completed' || isFailedCallStatus(event.data.call_status)
}

function toStreamError(error: unknown): ApiError {
  if (error instanceof ServiceUnavailableError) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      message: error.message,
    }
  }

  if (error instanceof Error && isNonEmptyString(error.message)) {
    return {
      code: 'SERVER_ERROR',
      message: error.message,
    }
  }

  return {
    code: 'SERVER_ERROR',
    message: 'Call failed',
  }
}

function serializeNdjson(event: CallStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`)
}

function streamResponse(execute: (send: (event: CallStreamEvent) => void) => Promise<void>): NextResponse {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false

      const close = () => {
        if (!closed) {
          closed = true
          controller.close()
        }
      }

      const send = (event: CallStreamEvent) => {
        if (closed) {
          return
        }

        controller.enqueue(serializeNdjson(event))
      }

      execute(send)
        .catch(error => {
          send({
            type: 'error',
            error: toStreamError(error),
          })
        })
        .finally(() => {
          close()
        })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function toCallStreamProgressEvent(event: GensparkStreamEvent): CallStreamProgressEvent | CallStreamHeartbeatEvent | null {
  if (event.heartbeat) {
    const elapsedSeconds = typeof event.elapsed_seconds === 'number' ? Math.max(0, Math.floor(event.elapsed_seconds)) : 0
    return {
      type: 'heartbeat',
      elapsedSeconds,
      message: `Call in progress... ${elapsedSeconds}s`,
    }
  }

  if (event.step === 'resolved') {
    const recipient = toNonEmptyString(event.contact?.title)
    return {
      type: 'progress',
      stage: 'dialing',
      message: recipient ? `Resolved contact: ${recipient}` : 'Contact resolved, preparing call...',
    }
  }

  if (event.step === 'calling') {
    return {
      type: 'progress',
      stage: 'in-progress',
      message: 'Call connected, waiting for vendor response...',
    }
  }

  if (isNonEmptyString(event.call_step)) {
    return {
      type: 'progress',
      stage: 'in-progress',
      message: `Call in progress: ${event.call_step}`,
    }
  }

  if (event.contact) {
    const formattedContact = formatContactForTranscript(event.contact)
    if (formattedContact) {
      return {
        type: 'progress',
        stage: 'dialing',
        message: `Dialing ${formattedContact}`,
      }
    }
  }

  return null
}

async function* readNdjsonEvents(response: Response): AsyncGenerator<GensparkStreamEvent> {
  const parseLine = function* (line: string): Generator<GensparkStreamEvent> {
    const parsedEvent = parseGensparkStreamEvent(line.trim())
    if (!parsedEvent) {
      return
    }

    yield parsedEvent
  }

  if (!response.body) {
    const responseText = await response.text()
    for (const line of responseText.split('\n')) {
      yield* parseLine(line)
    }

    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    let newlineIndex = buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)
      yield* parseLine(line)
      newlineIndex = buffer.indexOf('\n')
    }
  }

  buffer += decoder.decode()
  const remaining = buffer.trim()
  if (remaining.length > 0) {
    yield* parseLine(remaining)
  }
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => isNonEmptyString(item))
}

function isJobSpec(value: unknown): value is JobSpec {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<JobSpec>
  return (
    isNonEmptyString(candidate.vendor) &&
    isNonEmptyString(candidate.objective) &&
    isNonEmptyStringArray(candidate.requiredQuestions) &&
    isNonEmptyStringArray(candidate.escalationGuardrails) &&
    isNonEmptyString(candidate.echoMitigationPrompt)
  )
}

function parseBody(body: unknown): CallRequestBody | null {
  if (!body || typeof body !== 'object') return null

  const candidate = body as {
    jobSpec?: unknown
    vendorPhone?: unknown
  }

  if (!isJobSpec(candidate.jobSpec) || !isNonEmptyString(candidate.vendorPhone)) {
    return null
  }

  return {
    jobSpec: candidate.jobSpec,
    vendorPhone: candidate.vendorPhone.trim(),
  }
}

function errorResponse(code: ApiErrorCode, message: string, status: number): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json(
    {
      data: null,
      error: { code, message },
    },
    { status }
  )
}

async function streamMockCall(send: (event: CallStreamEvent) => void): Promise<void> {
  send({ type: 'progress', stage: 'queued', message: 'Call queued, connecting to vendor...' })
  await new Promise(resolve => setTimeout(resolve, 800))

  send({ type: 'progress', stage: 'dialing', message: 'Dialing vendor number...' })
  await new Promise(resolve => setTimeout(resolve, 1200))

  send({ type: 'progress', stage: 'in-progress', message: 'Call in progress, AI is speaking with vendor...' })
  for (let elapsedSeconds = 5; elapsedSeconds <= 20; elapsedSeconds += 5) {
    await new Promise(resolve => setTimeout(resolve, 500))
    send({
      type: 'heartbeat',
      elapsedSeconds,
      message: `Call in progress... ${elapsedSeconds}s`,
    })
  }

  send({
    type: 'complete',
    data: {
      callId: `mock-${Date.now()}`,
      rawTranscript: MOCK_TRANSCRIPT,
      audioUrl: MOCK_AUDIO_SNIPPET_URL,
      isMock: true,
    },
  })
}

async function callGenspark(
  vendorPhone: string,
  jobSpec: JobSpec,
  apiKey: string,
  onProgress?: (event: GensparkStreamEvent) => void
): Promise<{ callId: string; rawTranscript: string; audioUrl: string | null }> {
  const endpoint = getGensparkCallEndpoint()
  const payload: GensparkCallPayload = {
    recipient: jobSpec.vendor,
    contact_info: vendorPhone,
    is_place_id: false,
    purpose: buildCallPurpose(jobSpec),
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/x-ndjson, application/json',
    'X-Api-Key': apiKey,
  }

  const projectId = getGensparkProjectId()
  if (projectId) {
    headers['X-Project-ID'] = projectId
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } catch (error) {
    const systemErrorCode = getSystemErrorCode(error)
    if (systemErrorCode === 'ENOTFOUND') {
      throw new ServiceUnavailableError(
        'Could not resolve the Genspark API host. Check DNS/network access, or set USE_MOCK_CALL=true for demo mode.'
      )
    }

    throw new ServiceUnavailableError(
      `Could not reach Genspark API${systemErrorCode ? ` (${systemErrorCode})` : ''}.`
    )
  }

  if (!response.ok) {
    const body = await response.text()
    const errorBody = body.trim()
    const safeBody = errorBody.length > 300 ? `${errorBody.slice(0, 300)}...` : errorBody

    if (response.status === 401 || response.status === 403) {
      const cloudflareHint = safeBody.toLowerCase().includes('just a moment')
        ? ' The request appears blocked by Cloudflare bot protection before reaching the API.'
        : ''

      throw new ServiceUnavailableError(
        `Genspark rejected the request at ${endpoint} with status ${response.status}. Ensure X-Api-Key uses a valid gsk_ key.${cloudflareHint}${safeBody ? ` ${safeBody}` : ''}`
      )
    }

    if (response.status === 404) {
      throw new ServiceUnavailableError(
        `Genspark endpoint not found at ${endpoint}. Expected /api/tool_cli/phone_call/initiate.${safeBody ? ` ${safeBody}` : ''}`
      )
    }

    throw new ServiceUnavailableError(
      `Genspark request failed with status ${response.status}.${safeBody ? ` ${safeBody}` : ''}`
    )
  }

  const progressEvents: GensparkStreamEvent[] = []
  let finalEvent: GensparkStreamEvent | null = null
  let latestStatusEvent: GensparkStreamEvent | null = null

  for await (const streamEvent of readNdjsonEvents(response)) {
    if (streamEvent.status) {
      latestStatusEvent = streamEvent

      if (hasTerminalCallStatus(streamEvent)) {
        finalEvent = streamEvent
        break
      }

      continue
    }

    onProgress?.(streamEvent)

    if (streamEvent.heartbeat) {
      continue
    }

    progressEvents.push(streamEvent)
  }

  if (!finalEvent && latestStatusEvent) {
    finalEvent = latestStatusEvent
  }

  if (!finalEvent || !finalEvent.status) {
    throw new ServiceUnavailableError('Genspark NDJSON stream ended without a final status event.')
  }

  const callStatus = finalEvent.data?.call_status ?? 'unknown'
  const callSummary = toNonEmptyString(finalEvent.data?.call_summary)
  const summarySuffix = callSummary ? ` ${callSummary}` : ''

  if (finalEvent.status === 'error' || isFailedCallStatus(callStatus)) {
    throw new ServiceUnavailableError(`Genspark call failed with status ${callStatus}.${summarySuffix}`)
  }

  const rawTranscript = composeTranscript(callSummary, progressEvents)
  if (!rawTranscript) {
    throw new ServiceUnavailableError('Genspark call completed but returned no call summary/transcript text.')
  }

  return {
    callId: extractCallId(finalEvent, progressEvents),
    rawTranscript,
    audioUrl: null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const requestBody = await request.json() as unknown
    const parsedBody = parseBody(requestBody)
    if (!parsedBody) {
      return errorResponse(
        'BAD_REQUEST',
        'Invalid payload. Expected non-empty vendorPhone and a valid jobSpec.',
        400
      )
    }

    // Mock fallback — guaranteed demo safety
    if (process.env.USE_MOCK_CALL === 'true') {
      return streamResponse(async send => {
        await streamMockCall(send)
      })
    }

    const gensparkApiKey = process.env.GSK_API_KEY ?? process.env.GENSPARK_API_KEY
    if (!isNonEmptyString(gensparkApiKey)) {
      return errorResponse(
        'SERVICE_UNAVAILABLE',
        'GSK_API_KEY (or GENSPARK_API_KEY) is not configured in this environment.',
        503
      )
    }

    return streamResponse(async send => {
      send({ type: 'progress', stage: 'queued', message: 'Call queued, connecting to vendor...' })

      const result = await callGenspark(parsedBody.vendorPhone, parsedBody.jobSpec, gensparkApiKey, event => {
        const streamEvent = toCallStreamProgressEvent(event)
        if (streamEvent) {
          send(streamEvent)
        }
      })

      send({
        type: 'complete',
        data: {
          ...result,
          isMock: false,
        },
      })
    })
  } catch (error) {
    console.error('[/api/call]', error)

    if (error instanceof ServiceUnavailableError) {
      return errorResponse('SERVICE_UNAVAILABLE', error.message, 503)
    }

    return errorResponse('SERVER_ERROR', 'Call failed', 500)
  }
}
