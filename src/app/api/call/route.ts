import { NextRequest, NextResponse } from 'next/server'
import type { JobSpec } from '@/types'

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

interface GensparkPayload {
  to: string
  task_description: string
  questions: string[]
  guardrails: string[]
  system_context: string
}

async function callGenspark(
  vendorPhone: string,
  jobSpec: JobSpec
): Promise<{ callId: string; rawTranscript: string; audioUrl: string | null }> {
  const payload: GensparkPayload = {
    to: vendorPhone,
    task_description: jobSpec.objective,
    questions: jobSpec.requiredQuestions,
    guardrails: jobSpec.escalationGuardrails,
    system_context: jobSpec.echoMitigationPrompt,
  }

  const response = await fetch('https://api.genspark.ai/v1/agents/call', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GENSPARK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Genspark error ${response.status}: ${body}`)
  }

  const data = await response.json() as { call_id: string; transcript: string; audio_url?: string }
  return {
    callId: data.call_id,
    rawTranscript: data.transcript,
    audioUrl: data.audio_url ?? null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { jobSpec, vendorPhone } = await request.json() as {
      jobSpec: JobSpec
      vendorPhone: string
    }

    // Mock fallback — guaranteed demo safety
    if (process.env.USE_MOCK_CALL === 'true') {
      await new Promise(resolve => setTimeout(resolve, 2500))
      return NextResponse.json({
        callId: `mock-${Date.now()}`,
        rawTranscript: MOCK_TRANSCRIPT,
        audioUrl: null,
        isMock: true,
      })
    }

    const result = await callGenspark(vendorPhone, jobSpec)
    return NextResponse.json({ ...result, isMock: false })
  } catch (error) {
    console.error('[/api/call]', error)
    return NextResponse.json({ error: 'Call failed' }, { status: 500 })
  }
}
