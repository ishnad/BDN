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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
        await delay(800)
        emit({ status: 'dialing', message: 'Dialing supplier number…' })

        const callPromise = fetch(`${baseUrl}/api/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: JSON.stringify({ jobSpec, vendorPhone: supplierPhone }),
        })

        await delay(1200)
        emit({ status: 'in-progress', message: 'Call in progress, AI is speaking with supplier…' })

        const callRes = await callPromise
        if (!callRes.ok) throw new Error('Call failed')
        const callData = await callRes.json() as { rawTranscript: string }

        emit({ status: 'extracting', message: 'Claude is processing the transcript…' })

        const extractRes = await fetch(`${baseUrl}/api/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: JSON.stringify({
            rawTranscript: callData.rawTranscript,
            jobSpec,
            naturalLanguageRequest,
            supplierId,
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
