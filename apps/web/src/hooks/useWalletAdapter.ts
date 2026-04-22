/**
 * Drop-in replacement for `useWallet()` from @solana/wallet-adapter-react.
 * Maps Dynamic's auth/wallet API to the same shape the rest of the app expects.
 */
import { useDynamicContext, useIsLoggedIn, useUserWallets } from '@dynamic-labs/sdk-react-core'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

export function useWallet() {
  const { primaryWallet, setShowAuthFlow, user } = useDynamicContext()
  const isAuthenticated = useIsLoggedIn()
  const wallets = useUserWallets()

  // Robustly find the Solana wallet. If primary isn't Solana, check the full list.
  const solanaWallet = primaryWallet && isSolanaWallet(primaryWallet) 
    ? primaryWallet 
    : wallets.find(w => isSolanaWallet(w)) ?? null

  const publicKey = solanaWallet?.address ? new PublicKey(solanaWallet.address) : null
  const connected = !!solanaWallet

  const signTransaction = async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
    if (!solanaWallet || !isSolanaWallet(solanaWallet)) throw new Error('No Solana wallet available')
    const signer = await solanaWallet.getSigner()
    return signer.signTransaction(tx as any) as Promise<T>
  }

  const signAllTransactions = async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
    if (!solanaWallet || !isSolanaWallet(solanaWallet)) throw new Error('No Solana wallet available')
    const signer = await solanaWallet.getSigner()
    return Promise.all(txs.map((tx) => signer.signTransaction(tx as any) as Promise<T>))
  }

  const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
    if (!solanaWallet || !isSolanaWallet(solanaWallet)) throw new Error('No Solana wallet available')
    const signer = await solanaWallet.getSigner()
    return (signer as any).signMessage(message)
  }

  const sendTransaction = async (tx: Transaction, connection: Connection): Promise<string> => {
    if (!solanaWallet || !isSolanaWallet(solanaWallet)) throw new Error('No Solana wallet available')
    const signer = await solanaWallet.getSigner()
    const signed = await signer.signTransaction(tx as any) as Transaction
    const raw = signed.serialize()
    return connection.sendRawTransaction(raw, { skipPreflight: false })
  }

  // Stable user identifier — wallet address if available, else Dynamic user ID (for social login users without a Solana wallet yet)
  const userId = publicKey?.toBase58() ?? user?.userId ?? null

  return {
    connected,
    publicKey,
    isAuthenticated,
    userId,
    signTransaction,
    signAllTransactions,
    signMessage,
    sendTransaction,
    // wallet.adapter.connected pattern for legacy compatibility
    wallet: solanaWallet ? { adapter: { connected: true } } : null,
    connecting: !connected && isAuthenticated, // True if logged in but wallet still pending
    disconnecting: false,
    openAuthModal: (_?: boolean) => setShowAuthFlow(true),
  }
}
