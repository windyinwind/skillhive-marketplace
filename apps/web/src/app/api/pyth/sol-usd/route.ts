import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Pyth SOL/USD price feed ID
const SOL_USD_FEED_ID = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'

export async function GET() {
  try {
    const res = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${SOL_USD_FEED_ID}`,
      { next: { revalidate: 10 } }
    )

    if (!res.ok) throw new Error(`Pyth returned ${res.status}`)

    const data = await res.json() as {
      parsed: Array<{
        price: { price: string; expo: number }
      }>
    }

    const priceData = data.parsed[0]?.price
    if (!priceData) throw new Error('No price data')

    const solUsd = Number(priceData.price) * Math.pow(10, priceData.expo)

    return NextResponse.json(
      { solUsd: Math.round(solUsd * 100) / 100, timestamp: Date.now() },
      { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=20' } }
    )
  } catch (err) {
    console.error('[GET /api/pyth/sol-usd]', err)
    // Fallback price to avoid breaking UI
    return NextResponse.json({ solUsd: null, timestamp: Date.now() })
  }
}
