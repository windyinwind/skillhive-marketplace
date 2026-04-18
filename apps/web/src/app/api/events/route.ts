import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const callId = new URL(req.url).searchParams.get('callId')
  if (!callId) {
    return new Response('callId required', { status: 400 })
  }

  const encoder = new TextEncoder()
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  const redisKey = `call:${callId}:result`

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Send keepalive immediately
      controller.enqueue(encoder.encode(': keepalive\n\n'))

      let done = false
      let consecutiveErrors = 0
      const MAX_ERRORS = 5
      const intervalId = setInterval(async () => {
        if (done) return
        try {
          if (!redisUrl || !redisToken) {
            // Local dev without Redis: poll Supabase directly
            const { supabaseAnon } = await import('@/lib/supabase')
            const { data } = await supabaseAnon
              .from('calls')
              .select('status, result_hash, tx_signature')
              .eq('call_id', callId)
              .single()
            if (data && data.status !== 'pending') {
              send({ status: data.status, txSignature: data.tx_signature })
              done = true
              clearInterval(intervalId)
              controller.close()
            }
            consecutiveErrors = 0
            return
          }

          const res = await fetch(`${redisUrl}/get/${redisKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` },
            cache: 'no-store',
          })
          const json = await res.json() as { result?: string }
          if (json.result) {
            const payload = JSON.parse(json.result)
            send(payload)
            // Clean up the key
            await fetch(`${redisUrl}/del/${redisKey}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${redisToken}` },
            })
            done = true
            clearInterval(intervalId)
            controller.close()
          }
          consecutiveErrors = 0
        } catch (err) {
          console.error('[SSE poll error]', err)
          consecutiveErrors++
          if (consecutiveErrors >= MAX_ERRORS) {
            send({ status: 'error', message: 'Result polling failed — please refresh and try again' })
            done = true
            clearInterval(intervalId)
            controller.close()
          }
        }
      }, 3000) // 3s poll — balances responsiveness vs. Redis load

      // Timeout after 2 minutes
      setTimeout(() => {
        if (!done) {
          send({ status: 'timeout' })
          clearInterval(intervalId)
          controller.close()
        }
      }, 120_000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
