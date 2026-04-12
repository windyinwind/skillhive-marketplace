/**
 * Wallet utilities for the SWARM plugin.
 *
 * Loads the agent keypair from AGENT_WALLET_KEYPAIR (base58-encoded private key)
 * and exposes helpers for signing transactions.
 */

import { Keypair, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'

let _cached: Keypair | null = null

/**
 * Returns the agent Keypair loaded from AGENT_WALLET_KEYPAIR env var.
 * Result is cached after the first call.
 */
export function getAgentKeypair(): Keypair {
  if (_cached) return _cached

  const raw = process.env.AGENT_WALLET_KEYPAIR
  if (!raw) {
    throw new Error(
      '[plugin-swarm] AGENT_WALLET_KEYPAIR env var is not set. ' +
        'Set it to the base58-encoded private key of your agent wallet.',
    )
  }

  const secretKey = bs58.decode(raw)
  _cached = Keypair.fromSecretKey(secretKey)
  return _cached
}

/**
 * Signs a base64-encoded unsigned transaction and returns the signed transaction
 * serialised as a base64 string.
 */
export async function signTransaction(base64UnsignedTx: string): Promise<string> {
  const keypair = getAgentKeypair()
  const txBytes = Buffer.from(base64UnsignedTx, 'base64')
  const tx = Transaction.from(txBytes)

  // The server populates all accounts; we only need to add our signature.
  tx.partialSign(keypair)

  return tx.serialize({ requireAllSignatures: false }).toString('base64')
}

/**
 * Signs and fully serialises a transaction where the agent is the only required signer.
 */
export async function signAndSerialize(tx: Transaction): Promise<Buffer> {
  const keypair = getAgentKeypair()
  tx.sign(keypair)
  return tx.serialize()
}
