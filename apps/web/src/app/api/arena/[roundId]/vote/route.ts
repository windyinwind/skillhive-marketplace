import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { supabaseAnon, supabaseServiceRole } from '@/lib/supabase'
import { getRpcConnection } from '@/lib/solana'

export const runtime = 'nodejs'

interface VoteBody {
  entryId: string
  voterWallet: string
  txSignature: string
  amountLamports: number
}

function validateBody(body: unknown): body is VoteBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (typeof b.entryId      !== 'string' || !b.entryId)      return false
  if (typeof b.voterWallet  !== 'string' || !b.voterWallet)  return false
  if (typeof b.txSignature  !== 'string' || !b.txSignature)  return false
  if (typeof b.amountLamports !== 'number' || b.amountLamports <= 0) return false
  return true
}

// Scan parsed instructions for system transfers from fromWallet
function extractTransfers(tx: Awaited<ReturnType<ReturnType<typeof getRpcConnection>['getParsedTransaction']>>): Map<string, number> {
  const transfers = new Map<string, number>()
  if (!tx) return transfers
  for (const ix of tx.transaction.message.instructions) {
    if (!('parsed' in ix)) continue
    const parsed = ix as { parsed?: { type?: string; info?: { source?: string; destination?: string; lamports?: number } }; program?: string }
    if (parsed.program !== 'system') continue
    if (parsed.parsed?.type !== 'transfer') continue
    const info = parsed.parsed?.info
    if (typeof info?.lamports === 'number' && info.destination) {
      transfers.set(info.destination, (transfers.get(info.destination) ?? 0) + info.lamports)
    }
  }
  return transfers
}

// Verify a Solana tx transferred amountLamports from voter to a single recipient
async function verifyTransfer(
  txSignature: string,
  fromWallet: string,
  toWallet: string,
  amountLamports: number
): Promise<boolean> {
  try {
    const connection = getRpcConnection()
    const tx = await connection.getParsedTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })
    if (!tx) return false

    const feePayer = tx.transaction.message.accountKeys[0]?.pubkey.toBase58()
    if (feePayer !== fromWallet) return false

    const transfers = extractTransfers(tx)
    return (transfers.get(toWallet) ?? 0) >= amountLamports
  } catch {
    return false
  }
}

// Verify a Solana tx has transfers to ALL recipients with at least the required amounts
async function verifyMultiTransfer(
  txSignature: string,
  fromWallet: string,
  recipients: Record<string, number> // wallet → required lamports
): Promise<boolean> {
  try {
    const connection = getRpcConnection()
    const tx = await connection.getParsedTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })
    if (!tx) return false

    const feePayer = tx.transaction.message.accountKeys[0]?.pubkey.toBase58()
    if (feePayer !== fromWallet) return false

    const transfers = extractTransfers(tx)

    // Every recipient must have received at least their required amount
    for (const [wallet, required] of Object.entries(recipients)) {
      if ((transfers.get(wallet) ?? 0) < required) return false
    }
    return true
  } catch {
    return false
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  try {
    const { roundId } = (await params) as { roundId: string }
    const body: unknown = await req.json()

    if (!validateBody(body)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { entryId, voterWallet, txSignature, amountLamports } = body

    // Validate wallet address
    try { new PublicKey(voterWallet) } catch {
      return NextResponse.json({ error: 'Invalid voter wallet' }, { status: 400 })
    }

    // Check round + entry exist and belong together
    const { data: entry, error: entryErr } = await supabaseAnon
      .from('arena_entries')
      .select('id, round_id, owner_wallet, votes, sol_earned, contributing_owners')
      .eq('id', entryId)
      .eq('round_id', roundId)
      .single()

    if (entryErr || !entry) {
      return NextResponse.json({ error: 'Entry not found in this round' }, { status: 404 })
    }

    const { data: round } = await supabaseAnon
      .from('arena_rounds')
      .select('status')
      .eq('id', roundId)
      .single()

    if (round?.status === 'closed') {
      return NextResponse.json({ error: 'This round is closed' }, { status: 409 })
    }

    // Prevent replay: tx_signature must be unique
    const { data: existing } = await supabaseAnon
      .from('arena_votes')
      .select('id')
      .eq('tx_signature', txSignature)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Transaction already used' }, { status: 409 })
    }

    // Verify on-chain payment
    // Synthesis entries: verify multi-transfer to each contributing owner
    // Legacy single-skill entries: verify single transfer to skill owner
    const contributingOwners = (entry.contributing_owners ?? []) as Array<{ wallet: string; amountLamports: number }>
    let verified: boolean

    if (contributingOwners.length > 0) {
      // Group by wallet and sum required amounts
      const recipients: Record<string, number> = {}
      for (const co of contributingOwners) {
        recipients[co.wallet] = (recipients[co.wallet] ?? 0) + co.amountLamports
      }
      verified = await verifyMultiTransfer(txSignature, voterWallet, recipients)
    } else {
      verified = await verifyTransfer(txSignature, voterWallet, entry.owner_wallet, amountLamports)
    }

    // Insert vote (verified or pending — stored either way for audit)
    const { error: voteErr } = await supabaseServiceRole
      .from('arena_votes')
      .insert({
        round_id:        roundId,
        entry_id:        entryId,
        voter_wallet:    voterWallet,
        amount_lamports: amountLamports,
        tx_signature:    txSignature,
        verified,
      })

    if (voteErr) {
      if (voteErr.code === '23505') {
        return NextResponse.json({ error: 'Transaction already used' }, { status: 409 })
      }
      throw voteErr
    }

    if (!verified) {
      return NextResponse.json({ error: 'Payment could not be verified on-chain — vote recorded as pending.' }, { status: 202 })
    }

    // Update entry stats atomically
    const { data: updated } = await supabaseServiceRole
      .from('arena_entries')
      .update({
        votes:       entry.votes + 1,
        sol_earned:  entry.sol_earned + amountLamports,
      })
      .eq('id', entryId)
      .select()
      .single()

    return NextResponse.json({ entry: updated, verified })
  } catch (err) {
    console.error('[POST /api/arena/[roundId]/vote]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
