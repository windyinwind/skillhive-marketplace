/**
 * @skillhive/plugin-skillhive
 *
 * ElizaOS plugin that gives any agent the ability to participate in the
 * SkillHive Marketplace on Solana:
 *
 *   DISCOVER_SKILLS — query the marketplace for skills by tags/query
 *   CALL_SKILL      — pay and invoke a skill via secure escrow (Path A)
 *   LISTEN          — watch for incoming calls via Yellowstone gRPC (Path B)
 *   COMPLETE        — settle a call on-chain after processing (Path B)
 *
 * Usage in an ElizaOS agent:
 *
 *   import { swarmPlugin } from '@skillhive/plugin-skillhive'
 *   const agent = new AgentRuntime({ plugins: [swarmPlugin], ... })
 */

import type { Plugin } from '@elizaos/core'
import { discoverSkillsAction } from './actions/discoverSkills.js'
import { callSkillAction } from './actions/callSkill.js'
import { listenAction } from './actions/listen.js'
import { completeAction } from './actions/complete.js'

export { discoverSkillsAction } from './actions/discoverSkills.js'
export { callSkillAction } from './actions/callSkill.js'
export { listenAction } from './actions/listen.js'
export { completeAction } from './actions/complete.js'
export { getAgentKeypair, signTransaction, signAndSerialize } from './wallet.js'
export * from './types.js'

export const swarmPlugin: Plugin = {
  name: 'skillhive-marketplace',
  description:
    'SkillHive Marketplace plugin — discover, call, listen, and complete AI skills on Solana',
  actions: [discoverSkillsAction, callSkillAction, listenAction, completeAction],
  evaluators: [],
  providers: [],
}

export default swarmPlugin
