/**
 * Drop-in replacement for `useWallet()` from @solana/wallet-adapter-react.
 * Maps Dynamic's auth/wallet API to the same shape the rest of the app expects.
 */
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

export function useWallet() {
  const { primaryWallet, setShowAuthFlow } = useDynamicContext()

  const connected = !!primaryWallet
  const solanaWallet = primaryWallet && isSolanaWallet(primaryWallet) ? primaryWallet : null
  const publicKey = solanaWallet?.address ? new PublicKey(solanaWallet.address) : null

  const signTransaction = async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) throw new Error('No Solana wallet connected')
    const signer = await primaryWallet.getSigner()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return signer.signTransaction(tx as any) as Promise<T>
  }

  const signAllTransactions = async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) throw new Error('No Solana wallet connected')
    const signer = await primaryWallet.getSigner()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Promise.all(txs.map((tx) => signer.signTransaction(tx as any) as Promise<T>))
  }

  const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) throw new Error('No Solana wallet connected')
    const signer = await primaryWallet.getSigner()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (signer as any).signMessage(message)
  }

  const sendTransaction = async (tx: Transaction, connection: Connection): Promise<string> => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) throw new Error('No Solana wallet connected')
    const signer = await primaryWallet.getSigner()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signed = await signer.signTransaction(tx as any) as Transaction
    const raw = signed.serialize()
    return connection.sendRawTransaction(raw, { skipPreflight: false })
  }

  return {
    connected,
    publicKey,
    signTransaction,
    signAllTransactions,
    signMessage,
    sendTransaction,
    // wallet.adapter.connected pattern → reflects Solana wallet specifically
    wallet: solanaWallet ? { adapter: { connected: true } } : null,
    connecting: false,
    disconnecting: false,
    // Expose Dynamic's auth modal trigger for components that previously called setVisible(true)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    openAuthModal: (_?: boolean) => setShowAuthFlow(true),
  }
}
