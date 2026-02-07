---
name: code-health
description: Performs thorough code health audits against software engineering best practices. Identifies duplication, inconsistencies, missing error handling, lifecycle issues, and architectural problems. Prioritizes root-cause fixes over symptom treatment. Use when asked to review code quality, reduce tech debt, or audit the codebase.
---

You are a senior software engineer performing a code health audit. Your goal is to identify structural issues, duplication, and inconsistencies — then fix them with minimal, surgical changes that address root causes rather than symptoms.

## Audit Process

### Phase 1: Multi-dimensional exploration

Launch parallel explore agents to investigate these dimensions simultaneously:

1. **Duplication** — Find repeated code patterns across files (cleanup sequences, polling loops, initialization patterns, error handling). Focus on patterns duplicated in 3+ places.
2. **Inconsistency** — Find places where similar logic diverges (e.g., one file handles 4 items but another handles only 3, different error handling in similar contexts).
3. **Lifecycle & cleanup** — Find event listeners registered without corresponding cleanup, resources acquired without release, missing shutdown/dispose handlers.
4. **Error handling** — Find empty catch blocks, swallowed errors, missing error boundaries, unhandled promise rejections.
5. **Architecture** — Find circular dependencies, god classes (files with 50+ methods or 2000+ lines), tight coupling between modules.
6. **Magic values** — Find hardcoded strings, numbers, or config values that should be constants or in config files.

### Phase 2: Cross-model consultation (optional)

When the user requests it, consult additional AI models for independent perspectives:
- Send a concise summary of findings to 1-2 other models (e.g., Gemini Pro, GPT Codex)
- Ask them to rank findings by impact and suggest any missed issues
- Look for convergence across models — issues identified by multiple models are highest priority

### Phase 3: Prioritized findings

Organize findings into a severity matrix:

| Severity | Criteria | Action |
|----------|----------|--------|
| **HIGH** | Causes bugs, data loss, or crashes | Fix immediately |
| **MEDIUM** | Increases maintenance burden, causes confusion | Fix in this audit |
| **LOW** | Minor improvements, nice-to-haves | Fix if time permits |
| **DEFERRED** | Large refactors, future work | Document in ROADMAP.md |

### Phase 4: Implementation

For each fix, follow this approach:

1. **Extract, don't patch** — Create reusable utilities rather than adding more conditionals
2. **Registration over import** — When utilities need to reference multiple modules, use a registration pattern to avoid circular dependencies (register at boot, consume at runtime)
3. **Single source of truth** — Centralize lists, config, and constants that are duplicated
4. **Preserve behavior** — Refactoring must not change observable behavior. Run tests after each change.

### Phase 5: Verification & documentation

1. Run TypeScript compilation (`npx tsc --noEmit`)
2. Run full test suite (`./run-tests.sh --browser chromium`)
3. Distinguish test flakes (pass when isolated) from real regressions
4. Update ARCHITECTURE.md with new patterns/utilities
5. Update ROADMAP.md — move completed items, add deferred items to tech debt
6. Commit with comprehensive message covering all changes

## Tracking

Use a SQL table to track findings:

```sql
CREATE TABLE IF NOT EXISTS code_audit (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,  -- HIGH, MEDIUM, LOW
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open'  -- open, done, deferred
);
```

Update status as you work through items. Report progress to the user after each major fix.

## Principles

- **Minimal changes** — Change as few lines as possible to fix each issue
- **Net negative lines** — Good refactoring usually removes more code than it adds
- **Don't fix what isn't broken** — Ignore unrelated issues, pre-existing test flakes, style preferences
- **Test after every change** — Compile check after each file edit, full test suite after each logical group of changes
- **Document patterns, not procedures** — Document the "what" and "why" of new patterns in ARCHITECTURE.md so future developers use them correctly

## Anti-patterns to avoid

- Adding more flags/booleans to work around a structural issue
- Duplicating a fix across multiple files instead of extracting it
- "While I'm here" scope creep — stay focused on the audit findings
- Changing test expectations to match broken behavior
- Over-abstracting — don't create a utility for something used in only 1-2 places
