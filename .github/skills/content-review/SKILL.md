---
name: content-review
description: Expert content writer review of in-game text. Use this when asked to review dialogue, localization, lore consistency, tone, translation quality, or when changelog entries are added or modified.
---

## Content Review Process

Review all player-facing text **in the game** for quality, consistency, and authenticity. The game is set in a fictional Savoie ski resort — tone should blend professional ski operations with warm Savoyard hospitality and humor.

**Scope:** Only in-game content that players see (localization strings, dialogue, changelog overlay, level names). Do NOT review repository markdown files (ROADMAP.md, ARCHITECTURE.md, TESTING.md, etc.) — those are developer-facing documentation.

### Phase 1: Content extraction

Use explore agents to gather all content from these sources:

1. **`src/config/locales/*.ts`** — All UI strings, dialogues, taunts, tutorials, changelog across 14 languages (fr, en, de, it, es, sv, nb, fi, cs, pl, tr, sk, ja, ko)
2. **`src/config/levels.ts`** — Level names, narrative context, difficulty descriptions

### Phase 2: Review dimensions

Evaluate content across these dimensions, launching parallel explore agents:

1. **Voice & tone consistency**
   - Characters should have distinct voices: Jean-Pierre (gruff mentor, uses "petit"), Thierry (cautious/technical), Marie (warm café owner), Émilie (competitive/modern)
   - Characters must introduce themselves on first appearance (L2 Émilie, L5 Thierry, first restaurant Marie) — portrait shows the name, but dialogue should include a natural self-intro
   - Characters must NOT introduce themselves on subsequent appearances — no "It's Émilie" if she already spoke in a prior level
   - Characters must speak in first person when they are the `introSpeaker` — never refer to themselves in third person
   - Failure taunts should vary between humorous, dramatic, and sympathetic — never cruel or repetitive
   - Tutorial text should be clear and encouraging for beginners
   - Professional ski operations vocabulary where appropriate (damage, chenillette, canon à neige)

2. **Savoyard authenticity**
   - Food/drink references should be accurate (tartiflette, reblochon, génépi, vin chaud — not generic "cheese" or "wine")
   - Resort terminology should match real Savoie resorts (ESF, remontées mécaniques, damage)
   - Place names and character names should feel authentically Savoyard
   - Cultural references should be specific (FIS competitions, ski de fond, Beaufortain)

3. **Localization quality**
   - French is the source language — check that it reads naturally with proper register
   - Translations should be idiomatic, not literal — each language should feel native
   - Technical ski/grooming terms should use correct local terminology per language (German: Pistenraupe; Italian: gatto delle nevi; Spanish: máquina pisapistas)
   - The `groom` button label must use each language's specific grooming verb (FR=Damer, DE=Präparieren, IT=Battere, ES=Pisar, SV=Pista, FI=Tamppaa, JA=圧雪, KO=정설), not generic "prepare/maintain"
   - Humor and wordplay should be adapted, not translated literally (e.g., "yard sale" → local wipeout idiom, "soup" for slush → local ski slush term)
   - Check for missing translations, placeholder text, or English left in non-English languages — scan ALL keys, especially short UI labels (skiStyle, skiTricks, skiBestCombo, quitGame, showDebug)
   - **Register consistency**: the game uses informal address throughout (FR=tu, DE=du, CS=ty, SK=ty, etc.). Scan ALL taunts, tutorials, dialogues, hazard warnings, and credits for formal forms (FR=vous, DE=Sie, CS=vy/jste, SK=vy/ste). Every line must use informal register.
   - **Immersion**: the game is set in Savoie, France. Keep French references like Météo France, ESF, PIDA — do not replace with local equivalents (SMHI, 気象庁, etc.)
   - **Factual consistency across locales**: colors (jaune=yellow, not orange), currency conversions, proper nouns must match the FR source exactly

4. **Narrative coherence**
   - Difficulty progression should be reflected in dialogue tone (encouraging → challenging → intense)
   - Character appearances should match the level context (Marie at lower pistes, Thierry at hazardous levels)
   - Dialogue must match level mechanics — don't tell players to use equipment they don't have (e.g., winch on `hasWinch: false` levels)
   - One-shot dialogues (steep warning, Marie intro) persist via localStorage — verify they only trigger once, not per-level
   - Lore references should be consistent across levels (no contradictions in backstory)
   - Avoid opaque acronyms or jargon that players won't know (e.g., "PIDA protocol" → "avalanche safety protocol")
   - Bonus objectives should feel achievable and well-described
   - Players traverse levels bottom-to-top — zone encounter order matters. Higher `startY` = lower on map = encountered FIRST. Verify that tutorial/warning text appears on the gentler zone before the deadly one.

5. **Clarity & UX writing**
   - Button labels should be unambiguous and action-oriented
   - Error/warning messages should tell the player what happened AND what to do
   - Tutorial hints should be concise — players should understand in <3 seconds
   - Accessibility labels should be descriptive and screen-reader friendly
   - Check for hardcoded English strings in non-locale `.ts` files (e.g., `onStatus('Saved!')` instead of `t('saved')`) — all player-visible text must go through `t()`

6. **Dead key hygiene**
   - After changes, search for `// UNUSED` keys in locale files that may now be used (grep source code for the key name as a quoted string)
   - When commenting out keys, verify they aren't dynamically constructed (e.g., `showDialogue()` probes `key + 'Touch'` / `key + 'Gamepad'` variants)
   - `t()` in dev mode throws on missing keys — E2E tests will catch any removed key that's still referenced

7. **Changelog conciseness**
   - Each date entry should have 3–5 items max — highlight what players will notice
   - Lead with new content (levels, wildlife, characters), not technical fixes
   - Consolidate all bug fixes into a single catch-all line (e.g. "🔧 Corrections tactiles et accessibilité")
   - Drop items players won't notice (internal refactors, signage standards, sensitivity ranges, touch target sizes)
   - Keep entries short: one emoji + 2–3 words per line. No sub-clauses, no parenthetical details, no enumerations
   - Reference style (Feb 3–8 entries):
     ```
     🏔️ Le Glacier et Coupe des Aiguilles
     🦅 Faune alpine
     🎨 Portraits des personnages
     🎮 Navigation clavier/manette dans les paramètres
     🔧 Corrections tactiles, affichage et accessibilité
     ```
   - Bad patterns to avoid:
     - ❌ "11 niveaux : Le Glacier (treuil) et Coupe des Aiguilles (finale FIS)" — too many details
     - ❌ "Faune alpine : bouquetins, chamois, marmottes, lièvres et renards" — enumeration belongs in gameplay, not changelog
     - ❌ "Cibles tactiles agrandies (pause, plein écran, passer)" — players don't care which targets
     - ❌ "Signalétique conforme NF S52-102" — regulatory references mean nothing to players

### Phase 3: Cross-model consultation

For significant content reviews (new dialogues, major localization changes):
- When running as Opus: consult `gpt-5.2` for creative writing quality and `gemini-3-pro-preview` for multilingual/cultural accuracy
- When running as any other model: consult `claude-opus-4.6`
- Ask reviewers to flag: unnatural phrasing, cultural inaccuracies, tone breaks, missing humor adaptation

Skip for minor reviews (typo fixes, single-string changes).

### Phase 4: Prioritized findings

| Severity | Criteria | Examples |
|----------|----------|---------|
| **HIGH** | Incorrect/misleading information, broken UX | Wrong control hints, untranslated strings, confusing error messages |
| **MEDIUM** | Tone inconsistency, weak translations, missed lore | Generic phrasing where specific Savoyard detail fits, literal translations |
| **LOW** | Polish opportunities, enhanced flavor | Additional humor variants, richer cultural references, subtle wordplay |

Track findings in SQL:

```sql
CREATE TABLE IF NOT EXISTS content_review (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    language TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open'
);
```

### Phase 5: Implementation

For each fix:

1. **French first** — Write/fix the French source text, then adapt to other languages
2. **Adapt, don't translate** — Each language version should feel native and natural
3. **Preserve placeholders** — `{keys}`, `{groomKey}`, `{winchKey}` must remain intact in all languages
4. **Test string length** — Long strings may overflow UI elements; check visually
5. **Maintain changelog** — Player-visible text changes should be noted in the in-game changelog

### Phase 6: Verification

1. Run TypeScript compilation (`npx tsc --noEmit`) — localization strings are typed
2. Run test suite (`./run-tests.sh --browser chromium`) — some tests check for specific strings
3. Visual check — open the game and navigate through affected screens
4. Verify all 14 languages have matching keys (no missing translations)

## Content style guide

### Tone spectrum by context

| Context | Tone | Example |
|---------|------|---------|
| Tutorial | Warm, clear, encouraging | "Utilisez les flèches pour vous déplacer sur la piste" |
| Success | Celebratory, proud | "Magnifique ! La piste est parfaite pour les skieurs" |
| Failure (mild) | Sympathetic, humorous | "Même les meilleurs se prennent une gamelle parfois" |
| Failure (dramatic) | Theatrical, never mean | "400 000€ de chenillette dans le ravin... l'assurance va adorer" |
| Hazard warning | Urgent, professional | "Attention — risque d'avalanche élevé dans ce secteur" |
| Lore/flavor | Authentic, local color | "Marie a préparé sa fameuse tartiflette au reblochon" |

### Character voice reference

- **Jean-Pierre**: 30+ years experience, dry humor, uses professional jargon, occasionally nostalgic about "the old days"
- **Thierry**: Safety-conscious, precise, slightly anxious about hazards, references technical specs
- **Marie**: Warm hospitality, food-focused, knows everyone in the resort, motherly
- **Émilie**: Younger generation, enthusiastic, competitive, uses modern expressions

### Forbidden patterns

- Generic English gaming clichés ("Game Over", "You Died", "Try Again")
- Condescending failure messages
- Cultural stereotypes or caricatures
- Mixing registers within a single character's dialogue
- Placeholder text left in production (`TODO`, `FIXME`, `lorem ipsum`)
