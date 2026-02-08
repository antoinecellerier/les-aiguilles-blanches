---
name: game-design
description: Experienced game designer review of narrative arc, difficulty curve, character development, and mechanics coherence. Use this when asked to review game design, pacing, progression, story, or balance.
---

## Game Design Review Process

Review the game's overall design for narrative coherence, difficulty progression, character utilization, and mechanical balance. The game is a snow groomer simulation across 9 levels at a fictional Savoie ski resort — it should feel like a well-paced learning journey from rookie to expert.

**This skill is advisory only.** It produces findings and recommendations but **always asks the user for confirmation before making any changes.** Game design decisions are inherently subjective.

### Phase 1: Data extraction

Use explore agents to gather the complete game design picture from these sources:

1. **`src/config/levels.ts`** — All 9 level definitions: difficulty, dimensions, time limits, coverage targets, obstacles, steep zones, winch anchors, access paths, hazards, wildlife, bonus objectives, intro dialogue keys
2. **`src/config/gameConfig.ts`** — BALANCE constants: stamina/fuel/food rates, movement physics, slope/tumble/winch thresholds, wildlife distances, avalanche risk values
3. **`src/config/localization.ts`** (FR block only) — All dialogue keys: jeanPierreIntro, level*Intro, thierryWarning, marieWelcome, taunt* categories, tutorial steps
4. **`docs/GAMEPLAY.md`** — Player-facing level guide, character descriptions, controls, food items
5. **`docs/ROADMAP.md`** — Planned features that would affect design (special missions, advanced mechanics)

Build a **level progression matrix** in SQL:

```sql
CREATE TABLE IF NOT EXISTS design_review (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    affected_levels TEXT,
    status TEXT DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS level_matrix (
    level_id INTEGER PRIMARY KEY,
    name TEXT,
    difficulty TEXT,
    time_limit INTEGER,
    target_coverage INTEGER,
    new_mechanic TEXT,
    character_speaker TEXT,
    obstacles TEXT,
    has_winch BOOLEAN,
    is_night BOOLEAN,
    weather TEXT,
    bonus_objectives TEXT,
    notes TEXT
);
```

### Phase 2: Review dimensions

Evaluate across 5 dimensions, launching parallel explore agents:

#### 1. Narrative arc & story coherence

- **Does the story have a clear three-act structure?** Act I (learning the ropes, levels 0-2), Act II (rising challenge, levels 3-5), Act III (mastery & high stakes, levels 6-8)
- **Do character appearances match the narrative moment?** Jean-Pierre for mentoring, Thierry for hazard warnings, Marie for warmth/respite, Émilie for peer encouragement
- **Is there emotional progression?** Encouragement → confidence → tension → triumph
- **Do failure taunts match the level's emotional tone?** Early levels should be gentler, late levels can be more dramatic
- **Are there missed story opportunities?** Moments where a character should speak but doesn't, or narrative gaps between levels

#### 2. Difficulty curve & mechanic introduction

- **One new concept per level rule** — Does each level teach exactly one new mechanic?
  - L0 (Tutorial): Basic movement + grooming
  - L1 (Green): Independent grooming, obstacles
  - L2 (Blue): Steeper slopes, tighter time
  - L3 (Park): Precision grooming, special features
  - L4 (Red): Fuel management + service roads + cat tracks
  - L5 (Park): Competition pressure, halfpipe precision
  - L6 (Black): Night operations + winch
  - L7 (Black): Avalanche hazards
  - L8 (Red): Storm weather, endurance
- **Are coverage targets and time limits calibrated?** Plot target_coverage vs time_limit vs level_area — is there a smooth curve or sudden jumps?
- **Is the difficulty gap between adjacent levels appropriate?** No level should feel trivially easy after the previous, nor impossibly hard
- **Are bonus objectives achievable on first attempt?** They should reward skillful play, not require foreknowledge

#### 3. Character development & utilization

- **Character frequency** — Count how many levels each character appears in via dialogue. Are any underused?
- **Character consistency** — Does each character maintain their established voice across all appearances?
- **Character purpose** — Each character should serve a narrative function:
  - Jean-Pierre: progression gating, mentorship, technical knowledge
  - Thierry: safety exposition, hazard mechanics introduction
  - Marie: emotional anchor, food/rest mechanics, resort atmosphere
  - Émilie: peer motivation, competition context, modern perspective
- **Character arc** — Does the player's relationship with each character evolve? (Jean-Pierre: skeptic → respectful, Émilie: colleague → friendly rival)

#### 4. Mechanics coherence & balance

- **Do BALANCE values create the intended experience?**
  - Stamina: Does LOW_STAMINA_THRESHOLD (30%) create meaningful pressure without frustration?
  - Fuel: Do consumption rates create urgency on fuel-management levels without being punishing on earlier ones?
  - Slopes: Does TUMBLE_SLOPE (40°) feel fair? Is there enough warning before tumbling?
  - Winch: Does WINCH_FORCE (0.3) make winch feel necessary on steep slopes?
  - Avalanche: Does RISK_PER_FRAME (0.015) create tension without being random?
- **Service point placement** — Are fuel stations and Chez Marie placed at narratively and mechanically appropriate locations?
- **Bonus objectives** — Do they align with the level's teaching goal? (e.g., fuel_efficiency on the fuel-management level)

#### 5. Pacing & flow

- **Session length** — Total playtime estimate for all 9 levels. Is it appropriate for a browser game (30-60 min ideal)?
- **Breather moments** — Are there levels that provide respite between high-intensity ones? (Park levels should be fun/creative, not stressful)
- **Level variety** — Do levels feel distinct in both mechanics and atmosphere? (Day/night, weather, terrain shape)
- **Replayability hooks** — Do bonus objectives and time-based scoring encourage replaying levels?
- **Flow state** — Are time limits generous enough to allow exploration but tight enough to create urgency?

### Phase 3: Cross-model consultation

For comprehensive design reviews:
- When running as Opus: consult `gpt-5.2` (creative/narrative strength) and `gemini-3-pro-preview` (analytical/balance)
- When running as any other model: consult `claude-opus-4.6`

Prompt reviewers with the level progression matrix and ask them to evaluate:
- Narrative pacing and emotional arc
- Difficulty curve smoothness (plot it mentally)
- Any "dead zones" where nothing new is introduced
- Missing player motivations or unclear goals
- Whether the game delivers on its premise (learning to be a ski groomer)

Skip cross-model for minor reviews (single level tweaks, number adjustments).

### Phase 4: Prioritized findings

| Severity | Criteria | Examples |
|----------|----------|---------|
| **HIGH** | Broken progression, impossible/trivial levels, missing core mechanic introduction | Level teaches nothing new, coverage target unreachable in time limit, character contradiction |
| **MEDIUM** | Suboptimal pacing, weak narrative beats, miscalibrated values | Difficulty spike too steep, character underused, bonus objective misaligned with level theme |
| **LOW** | Polish opportunities, enhanced immersion | Additional dialogue for atmosphere, better breather pacing, richer lore connections |

Track in SQL:

```sql
INSERT INTO design_review (id, severity, category, title, description, affected_levels)
VALUES ('example-id', 'MEDIUM', 'pacing', 'Title', 'Description', '3,4');
```

### Phase 5: Recommendations

For each finding, provide:

1. **What** — The specific issue
2. **Why it matters** — Impact on player experience
3. **Suggested fix** — Concrete change (new dialogue, adjusted BALANCE value, reordered level, added mechanic)
4. **Affected files** — Which source files need changes
5. **Risk** — Whether the fix could break existing mechanics or tests

**IMPORTANT: Always ask the user for confirmation before implementing any changes.** Present findings as recommendations and wait for approval. Game design decisions are subjective — the user has final say on narrative direction, difficulty tuning, and character voice.

**Implementation priority:**
- HIGH findings: fix in localization.ts, levels.ts, or gameConfig.ts as appropriate
- MEDIUM findings: propose changes for user approval
- LOW findings: document in ROADMAP.md for future work

**Verification after changes:**
1. `npx tsc --noEmit` — Type-check passes
2. `./run-tests.sh --browser chromium` — No regressions
3. Cross-reference GAMEPLAY.md — Update if level descriptions changed

## Design principles

### Core experience pillars

1. **Progressive mastery** — Each level should make the player feel they've learned something real about snow grooming
2. **Authentic Savoie atmosphere** — The resort should feel like a real place with real people
3. **Respectful challenge** — Difficulty should come from skill, not from obscurity or randomness
4. **Simulation depth** — Mechanics should reflect real groomer operations (winch, fuel, weather, slopes)

### Level design guidelines

- **Teach, test, reward** — Introduce a concept (dialogue), let the player practice (early level), then test mastery (late level/bonus)
- **Safe failure** — Early failures should feel recoverable and educational, not punishing
- **Environmental storytelling** — Level geography, weather, and time of day should reinforce the narrative
- **Bonus as depth** — Bonus objectives reveal the level's hidden mastery dimension without blocking progression

### Balance philosophy

- **Generous-then-tight** — Start levels with comfortable margins, tighten on replays via bonus objectives
- **Visible consequences** — Players should see/feel the impact of their choices (fuel gauge dropping, snow quality visible)
- **Fair warnings** — Never punish the player for something they weren't told about (Thierry's warnings, tutorial hints)
- **Satisfying arcs** — Each level should have a mini-arc: setup → tension → resolution
