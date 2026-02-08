---
name: content-review
description: Expert content writer review of in-game text. Use this when asked to review dialogue, localization, lore consistency, tone, or translation quality.
---

## Content Review Process

Review all player-facing text in the game for quality, consistency, and authenticity. The game is set in a fictional Savoie ski resort — tone should blend professional ski operations with warm Savoyard hospitality and humor.

### Phase 1: Content extraction

Use explore agents to gather all content from these sources:

1. **`src/config/localization.ts`** — All UI strings, dialogues, taunts, tutorials, changelog across 5 languages (fr, en, de, it, es)
2. **`src/config/levels.ts`** — Level names, narrative context, difficulty descriptions
3. **`docs/GAMEPLAY.md`** — Player-facing level guide, character descriptions

### Phase 2: Review dimensions

Evaluate content across these dimensions, launching parallel explore agents:

1. **Voice & tone consistency**
   - Characters should have distinct voices: Jean-Pierre (gruff mentor), Thierry (cautious/technical), Marie (warm café owner), Émilie (encouraging colleague)
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
   - Humor and wordplay should be adapted, not translated literally
   - Check for missing translations, placeholder text, or English left in non-English languages

4. **Narrative coherence**
   - Difficulty progression should be reflected in dialogue tone (encouraging → challenging → intense)
   - Character appearances should match the level context (Marie at lower pistes, Thierry at hazardous levels)
   - Lore references should be consistent across levels (no contradictions in backstory)
   - Bonus objectives should feel achievable and well-described

5. **Clarity & UX writing**
   - Button labels should be unambiguous and action-oriented
   - Error/warning messages should tell the player what happened AND what to do
   - Tutorial hints should be concise — players should understand in <3 seconds
   - Accessibility labels should be descriptive and screen-reader friendly

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
4. Verify all 5 languages have matching keys (no missing translations)

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
