Update README.md and CLAUDE.md to reflect recent design and architecture changes.

## Steps

**1. Understand what changed**

Run these commands to gather context:
```
git log --oneline -20
git diff HEAD~10..HEAD --stat
git diff HEAD~10..HEAD -- 'apps/web/src/app/**' 'apps/web/src/components/**' 'apps/web/messages/en.json' 'packages/**' '.claude/**'
```

Also check for new or deleted files:
```
git diff HEAD~10..HEAD --diff-filter=A --name-only
git diff HEAD~10..HEAD --diff-filter=D --name-only
```

**2. Read the current docs**

Read README.md and CLAUDE.md in full before making any edits.

**3. Identify what's stale**

Compare what the diff shows was added/changed/removed against what README.md and CLAUDE.md currently say. Look for:

- New pages or routes added to `apps/web/src/app/[locale]/` that aren't mentioned
- New API routes in `apps/web/src/app/api/` not documented
- New components or UI patterns
- New i18n locales or namespaces in `apps/web/messages/`
- New hooks in `.claude/hooks/` or commands in `.claude/commands/`
- Changes to the three-tier skill model, call paths, or registration flow
- New environment variables
- New packages or dependencies added to the monorepo
- Build phase status changes (anything newly completed)
- Architecture decisions that changed (e.g. agent frameworks, payment paths)

**4. Update README.md**

Edit only the sections that are actually stale. Do not rewrite sections that are still accurate. Typical sections to check:

- **What's Built** table — add new features with ✅, update status of in-progress items
- Any feature descriptions that no longer match the code
- Do NOT change the overall structure unless it genuinely needs restructuring

**5. Update CLAUDE.md**

Edit only facts that changed. CLAUDE.md is the source of truth for AI behavior in this project — be precise. Typical sections to check:

- **Monorepo Structure** — new directories, removed directories (e.g. `apps/indexer/` was eliminated)
- **Three-Tier Skill Model** — if tiers changed
- **Three Call Paths** — if Path A/B/C changed
- **Environment Variables** — new vars added
- **Build Phases** — mark newly completed phases as ✅ DONE
- **Key Architectural Decisions** — only add new decisions, don't paraphrase existing ones
- **Critical Constraints** — only if new permanent rules were established

Do NOT add ephemeral work (specific bug fixes, minor tweaks, session-specific tasks) to CLAUDE.md. It should only contain durable architectural facts.

**6. Report what you changed**

After editing, briefly summarize:
- Which sections of README.md were updated and why
- Which sections of CLAUDE.md were updated and why
- Anything you noticed that's stale but needs human judgment to fix (e.g. a phase marked in-progress that might be done)
