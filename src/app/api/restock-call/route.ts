import { NextRequest } from 'next/server'
import type { CustomerInventoryItem } from '@/types'

function buildNLRequest(supplierName: string, items: CustomerInventoryItem[]): string {
  const itemLines = items.map(item => {
    const unitsNeeded = Math.max(
      item.restockThreshold * 2 - item.currentQuantity,
      item.restockThreshold - item.currentQuantity + 5
    )
    return `${item.itemName}${item.sku ? ` (SKU: ${item.sku})` : ''} — currently ${item.currentQuantity} units in stock, need ${unitsNeeded} more`
  }).join('; ')

  return `Call ${supplierName} to place a restock order. We need to reorder the following items: ${itemLines}. Please confirm availability, unit pricing, and earliest delivery date for each item. Ask if a single consolidated delivery is possible.`
}

async function readCallStream(
  response: Response,
  onProgress: (msg: string) => void,
): Promise<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let rawTranscript: string | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')

      if (!line) continue
      try {
        const event = JSON.parse(line) as Record<string, unknown>
        if (event.type === 'complete') {
          const data = event.data as Record<string, unknown>
          rawTranscript = data.rawTranscript as string
        } else if (event.type === 'error') {
          const err = event.error as Record<string, unknown>
          throw new Error((err.message as string) ?? 'Call failed')
        } else if (event.type === 'heartbeat' || event.type === 'progress') {
          onProgress((event.message as string) ?? '')
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }

  if (!rawTranscript) throw new Error('Call completed without transcript')
  return rawTranscript
}

export async function POST(request: NextRequest) {
  const { supplierId, supplierPhone, supplierName, items } = await request.json() as {
    supplierId: string
    supplierPhone: string
    supplierName: string
    items: CustomerInventoryItem[]
  }

  const cookieHeader = request.headers.get('cookie') ?? ''
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      try {
        const naturalLanguageRequest = buildNLRequest(supplierName, items)

        emit({ status: 'planning', message: 'Claude is generating your restock brief…' })

        const planRes = await fetch(`${baseUrl}/api/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: JSON.stringify({ naturalLanguageRequest, vendorPhoneNumber: supplierPhone }),
        })
        if (!planRes.ok) throw new Error('Planning failed')
        const { jobSpec } = await planRes.json() as { jobSpec: Record<string, unknown> }

        emit({ status: 'queued', message: 'Call queued, connecting to supplier…', jobSpec })

        // Start the call immediately — /api/call is now a streaming NDJSON response
        const callRes = await fetch(`${baseUrl}/api/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: JSON.stringify({ jobSpec, vendorPhone: supplierPhone }),
        })
        if (!callRes.ok) throw new Error('Call failed')

        emit({ status: 'dialing', message: 'Dialing supplier number…' })

        // Read the call stream, forwarding heartbeat/progress messages to client
        const rawTranscript = await readCallStream(callRes, msg => {
          emit({ status: 'in-progress', message: msg || 'Call in progress, AI is speaking with supplier…' })
        })

        emit({ status: 'extracting', message: 'Claude is processing the transcript…' })

        const restockItems = items.map(item => ({
          inventoryItemId: item.id,
          itemName: item.itemName,
          unitsOrdered: Math.max(
            item.restockThreshold * 2 - item.currentQuantity,
            item.restockThreshold - item.currentQuantity + 5,
          ),
        }))

        const extractRes = await fetch(`${baseUrl}/api/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: JSON.stringify({
            rawTranscript,
            jobSpec,
            naturalLanguageRequest,
            supplierId,
            restockItems,
          }),
        })
        if (!extractRes.ok) throw new Error('Extraction failed')
        const { report, outcome } = await extractRes.json() as {
          report: { id: string }
          outcome: Record<string, unknown>
        }

        emit({
          status: 'done',
          message: 'Restock order placed successfully.',
          reportId: report.id,
          outcome,
          itemsOrdered: items.map(i => i.itemName),
        })
      } catch (err) {
        emit({
          status: 'error',
          message: err instanceof Error ? err.message : 'Restock call failed',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
