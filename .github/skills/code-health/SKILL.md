---
name: code-health
description: Guide for performing thorough code health audits. Use this when asked to review code quality, audit the codebase, reduce tech debt, find duplication, or check for engineering best practices.
---

## Code Health Audit Process

When performing a code health audit on this codebase, follow this structured process.

### Phase 1: Multi-dimensional exploration

Launch parallel explore agents to investigate these dimensions simultaneously:

1. **Duplication** — Find repeated code patterns across files (cleanup sequences, polling loops, initialization patterns, error handling). Focus on patterns duplicated in 3+ places.
2. **Inconsistency** — Find places where similar logic diverges (e.g., one file handles 4 items but another handles only 3, different error handling in similar contexts).
3. **Lifecycle & cleanup** — Find event listeners registered without corresponding cleanup, resources acquired without release, missing shutdown/dispose handlers.
4. **Error handling** — Find empty catch blocks, swallowed errors, missing error boundaries, unhandled promise rejections.
5. **Architecture** — Find circular dependencies, god classes (files with 50+ methods or 2000+ lines), tight coupling between modules.
6. **Magic values** — Find hardcoded strings, numbers, or config values that should be constants or in config files.
7. **Regression test coverage** — Cross-reference recent bug fixes (git log, ROADMAP.md recently completed) with test files. Flag fixes that lack a corresponding regression test reproducing the original failure condition.

### Phase 2: Cross-model consultation

Always consult additional AI models for independent perspectives:
- Send a concise summary of findings to 2 other models — pick the strongest available models that differ from the current one (prefer premium/standard tiers over fast/cheap)
- Ask them to rank findings by impact, confirm or refute each, and suggest any missed issues
- Look for convergence — issues identified by multiple models are highest priority

### Phase 3: Prioritized findings

Organize findings into a severity matrix:

| Severity | Criteria | Action |
|----------|----------|--------|
| **HIGH** | Causes bugs, data loss, or crashes | Fix immediately |
| **MEDIUM** | Increases maintenance burden, causes confusion | Fix in this audit |
| **LOW** | Minor improvements, nice-to-haves | Fix if time permits |
| **DEFERRED** | Large refactors, future work | Document in ROADMAP.md |

Track findings in SQL:

```sql
CREATE TABLE IF NOT EXISTS code_audit (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open'
);
```

### Phase 4: Implementation

For each fix:

1. **Extract, don't patch** — Create reusable utilities rather than adding more conditionals
2. **Registration over import** — When utilities need to reference multiple modules, use a registration pattern to avoid circular dependencies
3. **Single source of truth** — Centralize lists, config, and constants that are duplicated
4. **Preserve behavior** — Refactoring must not change observable behavior. Run tests after each change.

### Phase 5: Verification & documentation

1. Run TypeScript compilation (`npx tsc --noEmit`)
2. Run full test suite (`./run-tests.sh --browser chromium`)
3. Distinguish test flakes (pass when isolated) from real regressions
4. **Check for missing regression tests** — For each bug fix or behavioral change, verify a regression test exists. If not, flag it as a finding. A regression test should reproduce the specific failure condition (e.g., key held across scene transition, stale listener firing) so it catches regressions in the future.
5. Update `docs/ARCHITECTURE.md` with new patterns/utilities
6. Update `docs/ROADMAP.md` — move completed items, add deferred items
7. Commit with comprehensive message

## Principles

- **Minimal changes** — Change as few lines as possible
- **Net negative lines** — Good refactoring removes more code than it adds
- **Don't fix what isn't broken** — Ignore unrelated issues, pre-existing flakes, style preferences
- **Test after every change** — Compile after each edit, full suite after each group
- **Document patterns, not procedures** — Update ARCHITECTURE.md so future developers use patterns correctly

## Anti-patterns to avoid

- Adding flags/booleans to work around structural issues
- Duplicating a fix across files instead of extracting a utility
- "While I'm here" scope creep
- Changing test expectations to match broken behavior
- Over-abstracting — don't create utilities for things used in only 1-2 places
