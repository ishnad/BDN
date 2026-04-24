import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { JobSpec } from '@/types'

const anthropic = new Anthropic()

const ECHO_MITIGATION =
  'You are participating in a live stage demonstration via speakerphone. You may hear background audience noise or slight echoes of your own voice. IGNORE ALL ECHOES. Under no circumstances should you repeat a phrase if you hear it echoed back to you. Proceed linearly with your task.'

const JOB_SPEC_SCHEMA = {
  type: 'object' as const,
  properties: {
    vendor: { type: 'string', description: 'Name of the vendor being called' },
    objective: { type: 'string', description: 'Clear, single-sentence objective for the call' },
    requiredQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific questions to ask to achieve the objective',
    },
    escalationGuardrails: {
      type: 'array',
      items: { type: 'string' },
      description: 'Conditions under which to end the call and escalate to a human',
    },
    echoMitigationPrompt: {
      type: 'string',
      description: 'Echo mitigation instructions — must be included verbatim',
    },
  },
  required: ['vendor', 'objective', 'requiredQuestions', 'escalationGuardrails', 'echoMitigationPrompt'],
}

export async function POST(request: NextRequest) {
  try {
    const { naturalLanguageRequest, vendorPhoneNumber } = await request.json() as {
      naturalLanguageRequest: string
      vendorPhoneNumber: string
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: 'You are an AI operations assistant that converts natural language vendor call requests into precise, actionable job specifications. Be specific about questions and guardrails.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Convert this vendor call request into a structured job specification.

User request: "${naturalLanguageRequest}"
Vendor phone: ${vendorPhoneNumber}

Echo mitigation prompt (include VERBATIM in echoMitigationPrompt field):
"${ECHO_MITIGATION}"

Generate 3-5 specific questions and 2-3 clear escalation guardrails.`,
        },
      ],
      tools: [
        {
          name: 'create_job_spec',
          description: 'Create a structured job specification for the vendor call',
          input_schema: JOB_SPEC_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'create_job_spec' },
    })

    const toolUse = message.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('No job spec generated')
    }

    return NextResponse.json({ jobSpec: toolUse.input as JobSpec })
  } catch (error) {
    console.error('[/api/plan]', error)
    return NextResponse.json({ error: 'Failed to generate job spec' }, { status: 500 })
  }
}
