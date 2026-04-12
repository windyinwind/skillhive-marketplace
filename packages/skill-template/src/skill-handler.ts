/**
 * skill-handler.ts — implement your skill's core logic here.
 *
 * This function receives the raw input string from the caller and returns
 * the result string that will be delivered back and settled on-chain.
 *
 * For Tier 3 agents, you control this logic entirely. The LISTEN action
 * in plugin-swarm detects incoming CallAccounts and calls this handler.
 */

export async function handleSkillCall(input: string): Promise<string> {
  // TODO: replace with your skill's actual logic
  // Examples:
  //   - Call an external API
  //   - Run a custom model
  //   - Execute a database query
  //   - Combine multiple data sources

  console.log(`[skill-handler] Processing input: ${input.slice(0, 100)}`)

  // Echo back for demonstration — replace this with real work
  return `Processed: ${input}`
}
