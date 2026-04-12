/**
 * Formatting utilities for SWARM Marketplace UI.
 * No private fields (endpoint, system_prompt, tool_config) are ever referenced here.
 */

/**
 * Convert lamports to SOL string with 4 decimal places.
 * e.g. 1_000_000 → "0.0010"
 */
export function lamportsToSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(4)
}

/**
 * Convert lamports to USD string using a live SOL/USD price.
 * e.g. lamports=1_000_000, solUsd=150 → "$0.15"
 */
export function lamportsToUsd(lamports: number, solUsd: number): string {
  const usd = (lamports / 1_000_000_000) * solUsd
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

/**
 * Abbreviate a wallet address to first 4 + last 4 chars.
 * e.g. "7xKp...3Fg2"
 */
export function truncateWallet(wallet: string): string {
  if (!wallet || wallet.length < 10) return wallet
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
}

/**
 * Format large call counts with k/M abbreviation.
 * e.g. 1200 → "1.2k", 2_500_000 → "2.5M"
 */
export function formatCallCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

/**
 * Map a reputation score (0–1000) to a 0–5 star rating.
 * e.g. 850 → 4.25 (caller rounds as needed)
 */
export function reputationToStars(score: number): number {
  return Math.min(5, (score / 1000) * 5)
}

/**
 * Format a SOL amount string for display (trims trailing zeros after 2 dp min).
 * e.g. "0.0010" → "0.001 SOL"
 */
export function formatSol(lamports: number): string {
  const sol = lamports / 1_000_000_000
  const fixed = sol.toFixed(4)
  // remove trailing zeros but keep at least 2 decimal places
  const trimmed = fixed.replace(/(\.\d{2}?)0+$/, '$1')
  return `${trimmed} SOL`
}

/**
 * Tier number → human-readable label.
 */
export function tierLabel(tier: number): string {
  switch (tier) {
    case 1: return 'Prompt'
    case 2: return 'MCP'
    case 3: return 'Custom'
    default: return `Tier ${tier}`
  }
}

/**
 * Tier number → Tailwind badge color classes.
 */
export function tierColor(tier: number): string {
  switch (tier) {
    case 1: return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 2: return 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    case 3: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }
}

/**
 * Format a date string or timestamp into a short human-readable form.
 */
export function formatDate(dateStr: string | number): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
