'use client'

/**
 * Utility for Google Analytics 4 event tracking
 * NEXT_PUBLIC_GA_ID must be set in .env
 */

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID

// Standard GA4 event types
type GTagEvent = {
  action: string
  category?: string
  label?: string
  value?: number
  [key: string]: any
}

/**
 * Log a custom event to Google Analytics
 */
export const trackEvent = ({ action, category, label, value, ...others }: GTagEvent) => {
  if (typeof window !== 'undefined' && (window as any).gtag && GA_TRACKING_ID) {
    ;(window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      ...others,
    })
  }
}

/**
 * Specific Business Metrics for SkillHive
 */
export const analytics = {
  // Wallet Events
  trackWalletConnect: (address: string, method: string) => {
    trackEvent({
      action: 'wallet_connect',
      category: 'engagement',
      label: method,
      wallet_address: address, // Note: Be careful with PII, usually address is fine for web3 apps
    })
  },

  // Skill Interaction Events
  trackSkillCall: (skillId: string, skillName: string, price: number) => {
    trackEvent({
      action: 'skill_call',
      category: 'conversion',
      label: skillName,
      value: price,
      skill_id: skillId,
    })
  },

  // Search/Discovery Events
  trackSkillSearch: (query: string) => {
    trackEvent({
      action: 'search',
      category: 'engagement',
      label: query,
    })
  },

  // Navigation
  trackViewSkill: (skillId: string, skillName: string) => {
    trackEvent({
      action: 'view_item',
      category: 'engagement',
      label: skillName,
      skill_id: skillId,
    })
  },
}
