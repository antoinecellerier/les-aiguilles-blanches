---
name: docs-update
description: Ensures all documentation, roadmaps, and copilot instructions stay in sync with code changes. Use this before every commit to verify docs are up to date. Triggers on commit, pre-commit, documentation, roadmap, changelog, or docs update requests.
---

## Pre-Commit Documentation Checklist

Before every commit, verify that ALL documentation is in sync with the code changes being committed. Run `git --no-pager diff --cached --name-only` (or `git --no-pager diff HEAD --name-only` for unstaged) to identify changed files, then check each doc category below.

### 1. ARCHITECTURE.md

Update `docs/ARCHITECTURE.md` if any of these changed:

- **Project structure tree** — new files/directories added or removed
- **Scene flow diagram** — scene transitions changed
- **Utility patterns** — new utilities created, existing ones changed
- **Lifecycle patterns** — shutdown cleanup, event listener patterns changed
- **Config/theme patterns** — new constants, theme values, or config patterns
- **Known gotchas** — new Phaser quirks, browser compat issues discovered

### 2. ROADMAP.md

Update `docs/ROADMAP.md`:

- **Work queue** — move completed items from queue to "Recently Completed"
- **Recently Completed** — add a one-line summary of what was done
- **Technical Debt** — add any new debt discovered, remove resolved items
- **Test Coverage Gaps** — update if tests were added or gaps identified
- **Patterns to Watch** — add new patterns that future devs must follow

### 3. GAMEPLAY.md

Update `docs/GAMEPLAY.md` if:

- Controls changed (keyboard, gamepad, touch)
- Level mechanics changed (objectives, hazards, scoring)
- New game features added (items, mechanics, zones)

### 4. ART_STYLE.md

Update `docs/ART_STYLE.md` if:

- Visual style changed (colors, textures, pixel art patterns)
- New visual elements added (markers, buildings, effects)
- UI styling changed (button styles, fonts, theme colors)

### 5. TESTING.md

Update `docs/TESTING.md` if:

- New test helpers or fixtures added to conftest.py
- New test patterns established
- Debugging techniques discovered
- Known flaky tests identified or resolved

### 6. In-Game Changelog

Update the changelog entries in `src/config/localization.ts` if:

- Any player-visible change was made (UI, controls, gameplay, visuals)
- Look for the `changelog` key in each language's translations
- Add a dated entry describing the change in user-facing language

### 7. Copilot Instructions

Update `.github/copilot-instructions.md` if:

- **Key files** changed (new important files, renamed files)
- **Critical patterns** changed (localStorage keys, placeholder syntax)
- **Quick commands** changed (new scripts, changed test commands)
- **Domain knowledge** changed (new game concepts, terminology)
- **Custom agents/skills** added or modified
- **Pre-commit checklist** itself needs updating

### 8. Skills and Agents

Update `.github/skills/` or `.github/agents/` if:

- Workflow processes changed (audit steps, review criteria)
- New tools or patterns should be codified for reuse
- Visual style rules changed (update art-review skill alongside ART_STYLE.md)

### 9. README.md

Update `README.md` if:

- **Project structure tree** changed — new directories, files, or reorganization
- **Features list** changed — new gameplay features, input methods, accessibility
- **Controls table** changed — new bindings, new input types
- **Quick start / testing instructions** changed — new commands, new setup steps
- **Localization** changed — new languages added or removed
- **Accessibility** features changed

The README is the public face of the project. Keep it accurate but concise.

## How to Apply

For each changed source file, ask: "Does this change affect any documentation?" Walk through categories 1–9 above. If a doc needs updating but the change is trivial (typo fix, internal refactor with no API change), skip it.

**Do NOT:**
- Update docs for changes that don't affect them
- Add verbose explanations — keep entries concise
- Create new doc files unless explicitly asked
- Update dates/timestamps in docs (they use git history)

**Do:**
- Keep the project structure tree in ARCHITECTURE.md current
- Keep ROADMAP.md as the single source of truth for work status
- Keep changelog entries in ALL 12 languages
- Keep copilot-instructions.md lean — it's injected into every prompt
