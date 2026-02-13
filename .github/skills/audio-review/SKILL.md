---
name: audio-review
description: Audio director / sound designer review of game audio code. Use this when asked to review sound effects, music, audio mixing, spatial audio, or before committing audio-related changes.
---

## Audio Director / Sound Designer Review Process

Review all audio-related code for quality, immersion, and technical correctness. The game is a snow groomer simulation set in a fictional Savoie ski resort — audio should reinforce the alpine atmosphere, provide clear mechanical feedback, and respect the retro SkiFree aesthetic.

**This skill is advisory only.** It produces findings and recommendations but **always asks the user for confirmation before making any changes.** Sound design decisions are inherently subjective.

### Phase 1: Scope detection

Identify which changed files contain audio code:

```
src/systems/AudioSystem.ts       # Core audio system (if exists)
src/scenes/GameScene.ts          # Gameplay SFX triggers
src/scenes/MenuScene.ts          # Menu music/SFX
src/scenes/HUDScene.ts           # UI feedback sounds
src/scenes/PauseScene.ts         # Pause/resume audio
src/scenes/DialogueScene.ts      # Dialogue audio cues
src/scenes/LevelCompleteScene.ts # Victory fanfare
src/scenes/SettingsScene.ts      # Volume controls, audio settings
src/config/gameConfig.ts         # Audio constants (BALANCE)
src/config/levels.ts             # Per-level audio config (ambience, music)
```

Use `git --no-pager diff --cached --name-only` (or `git --no-pager diff HEAD --name-only` for unstaged) to identify changed files. If no audio-related files changed, report "No audio changes detected" and skip the review.

### Phase 2: Code review

Read all audio-related source files, then launch parallel explore agents to check each dimension:

#### 1. Sound palette & aesthetic coherence

- **Retro authenticity** — Audio generation should match the SkiFree-inspired aesthetic: simple waveforms, short samples, chiptune-influenced SFX
- **Procedural generation** — Prefer procedurally generated sounds (Web Audio API oscillators, noise buffers) over external audio files, consistent with the game's procedural visual approach
- **Alpine atmosphere** — Ambience should evoke mountain environment: wind, snow crunch, distant echoes, engine rumble
- **Consistency** — Similar game events should produce similar sound categories (all UI clicks share a family, all warnings share a family)
- **Voice style** — Character voice audio uses **Celeste-style gibberish speech**: short, expressive phoneme-like utterances that convey emotion and personality without real words. Each character should have a distinct pitch range and cadence (Jean-Pierre: low/gruff, Marie: warm/melodic, Thierry: mid/nervous, Émilie: bright/quick). This avoids translation requirements while adding personality.

#### 2. Music direction

- **Primary style: Chopin's Nocturnes** — The soundtrack draws from Op. 9 No. 1 (B♭ minor) and No. 2 (E♭ major): gentle piano melodies, expressive dynamics, rubato phrasing, and a sense of solitary beauty that matches the alpine night atmosphere
- **Grand piano synthesis** — Realistic procedural piano via Web Audio API: string-pair detuning, pitch settling, felt-hammer attack, harmonic series with inharmonicity, sympathetic resonance, soundboard filtering. Not chiptune — the goal is warm, organic piano tone
- **Polyphonic texture** — Counter-melody (diatonic thirds), ornamental echoes (neighbor-tone turns), distant cadential echoes, Picardy third coloring. Phrase-level dynamic swell (surges and ebbs). Triplet 12/8 bass subdivision
- **Section form** — Night mood uses A–B–A' structure: ornamented outer sections in B♭ minor, contrasting middle in D♭ major (ascetic, octave doubling sotto voce, no ornaments)
- **Dramatic exceptions** — High-intensity moments (avalanche warnings, storm levels, competition finale) may depart from the nocturne style toward more urgent, rhythmic compositions. These exceptions should feel like dramatic contrast, not a different game
- **Level-appropriate mood** — Early tutorial levels: simple, sparse arrangements. Night levels (L8): full nocturne expression with section form. Storm levels (L9-L10): building intensity. Credits: triumphant reprise
- **Silence and space** — Nocturnes breathe. Allow rests, let notes decay naturally, don't fill every moment with sound. Mountain silence is part of the soundtrack

#### 3. Mechanical feedback & game feel

- **Movement sounds** — Engine rumble varies with speed/slope, snow compression under tracks, gear changes
- **Grooming feedback** — Audible difference between groomed and ungroomed snow, coverage progress feedback
- **Hazard warnings** — Escalating audio cues for avalanche risk, low fuel, low stamina, steep slopes
- **Winch system** — Cable tension sounds, anchor attachment/detachment, motor strain on steep terrain
- **Wildlife** — Subtle ambient animal sounds that match species (marmot whistle, chamois bark, eagle cry)
- **Weather** — Wind intensity matching storm levels, snow/ice particle sounds, night ambience differences

#### 4. Audio mixing & balance

- **Volume hierarchy** — Establish clear priority: warnings > gameplay SFX > voice gibberish > ambience > music
- **Dynamic range** — Avoid compression artifacts; quiet moments (night levels) should feel genuinely quiet to let the nocturne breathe
- **Spatial audio** — Sounds should respect camera position; distant events quieter than nearby ones
- **Layering** — Multiple simultaneous sounds should not clip or create mud; limit concurrent voices
- **Ducking** — Music should duck under dialogue gibberish and important SFX
- **Fade transitions** — Scene transitions should crossfade audio, not cut abruptly

#### 5. Technical implementation

- **Web Audio API usage** — Correct AudioContext lifecycle (resume on user gesture, suspend on pause/background)
- **Resource management** — Audio nodes disconnected when done, buffers released on scene shutdown
- **Browser compatibility** — Handle autoplay restrictions, AudioContext state changes, Safari quirks
- **Performance** — Audio processing should not impact frame rate; use appropriate scheduling
- **Phaser integration** — Use Phaser's sound manager where appropriate, bypass only when Web Audio API features are needed
- **Error handling** — Graceful fallback when audio is unavailable or blocked by browser policy

#### 6. Player experience & accessibility

- **Volume controls** — Master, SFX, music, voice, and ambience sliders in settings; persist via `STORAGE_KEYS`
- **Mute toggle** — Quick mute accessible from pause menu and settings
- **Visual alternatives** — All audio cues must have a visual counterpart (screen flash for warnings, UI indicator for low fuel)
- **No audio-only information** — Game must be fully playable with sound off
- **Earphone safety** — No sudden loud sounds; peak volume should be reasonable
- **Respect system settings** — Honor device silent mode where detectable

#### 7. Emotional arc & pacing

- **Level progression** — Audio intensity should mirror difficulty curve: sparse nocturne fragments in tutorials → full nocturne expression in night levels → dramatic departure for storms → triumphant resolution in finale
- **Music transitions** — Intensity shifts at narrative beats (level start, bonus objective, near completion). Nocturne pieces should feel like they're unfolding naturally, not looping mechanically
- **Character voice motifs** — Each character's Celeste-style gibberish should be immediately recognizable: pitch, speed, and rhythm encode personality before the text even appears
- **Success/failure contrast** — Victory: a resolved cadence, warm and satisfying. Failure: a gentle descending phrase, sympathetic never punishing (matching content tone guide)
- **Silence as a tool** — Strategic silence for dramatic moments (avalanche warning, cliff edge, pre-dialogue pause)

### Phase 3: Cross-model consultation

For significant audio reviews (new audio system, major sound palette changes):
- When running as Opus: consult `gpt-5.2` (creative/aesthetic judgment) and `gemini-3-pro-preview` (technical analysis)
- When running as any other model: consult `claude-opus-4.6`

Share code and ask reviewers to evaluate:
- Nocturne-style music quality and emotional effectiveness
- Celeste-style voice gibberish character differentiation
- Mixing balance and volume hierarchy
- Browser compatibility risks
- Accessibility completeness

Skip for minor changes (single SFX tweak, volume adjustment).

### Phase 4: Prioritized findings

| Severity | Criteria | Examples |
|----------|----------|---------|
| **HIGH** | Audio blocks gameplay, accessibility violation, resource leak | AudioContext never resumed, no visual fallback for audio cue, audio nodes not cleaned up, autoplay crash |
| **MEDIUM** | Poor mixing, immersion break, style violation | Clipping audio, abrupt cuts, music doesn't feel nocturne-like, voice gibberish too uniform across characters, missing SFX for important action |
| **LOW** | Polish opportunities, enhanced atmosphere | Richer ambience layering, better spatial falloff, more varied SFX, subtle rubato in music |
| **DEFERRED** | Large audio systems, new compositions | Full nocturne suite, adaptive music system, expanded voice gibberish library |

Track findings in SQL:

```sql
CREATE TABLE IF NOT EXISTS audio_review (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    file_path TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open'
);
```

### Phase 5: Recommendations

For each finding, provide:

1. **What** — The specific audio issue
2. **Why it matters** — Impact on player experience or technical health
3. **Suggested fix** — Concrete change (new sound, adjusted parameter, added fallback)
4. **Affected files** — Which source files need changes
5. **Risk** — Whether the fix could break existing behavior or tests

**IMPORTANT: Always ask the user for confirmation before implementing any changes.** Present findings as recommendations and wait for approval. Sound design decisions are subjective — the user has final say on audio direction, volume levels, and sound palette.

**Implementation priority:**
- HIGH findings: fix immediately (resource leaks, accessibility gaps, crashes)
- MEDIUM findings: propose changes for user approval
- LOW findings: document in ROADMAP.md for future work

**Verification after changes:**
1. `npx tsc --noEmit` — Type-check passes
2. `./run-tests.sh --browser chromium` — No regressions
3. Manual check — open the game, verify sounds play correctly and scene transitions are smooth
4. Verify mute/volume settings persist across scenes

## Audio design principles

### Core pillars

1. **Reinforcement, not decoration** — Every sound should communicate game state or provide feedback
2. **Procedural where possible** — Generate sounds in code, consistent with the game's procedural art approach
3. **Alpine authenticity** — Audio should evoke Savoie mountains: wind, snow, mechanical rumble, distant echoes
4. **Accessible by default** — The game works perfectly in silence; audio enriches but never gates
5. **Nocturne soul** — The soundtrack channels the contemplative beauty of Chopin's nocturnes, rendered through realistic procedural grand piano synthesis
6. **Celeste-style voice** — Character speech is expressive gibberish: no real words, no translation needed, pure personality

### Sound palette guidelines

| Category | Character | Examples |
|----------|-----------|---------|
| Engine/mechanical | Low, warm, rhythmic | Diesel rumble, hydraulic hiss, track clank |
| Snow/terrain | Soft, textured, crunchy | Snow compression, ice scrape, powder whoosh |
| Weather/ambience | Layered, dynamic, spatial | Wind gusts, snowfall patter, night stillness |
| UI/feedback | Short, clear, distinct | Click, confirm, warning beep, error buzz |
| Wildlife | Natural, subtle, positional | Marmot whistle, eagle cry, distant cowbell |
| Music | Nocturne-inspired, grand piano | Polyphonic melodies, phrase dynamics, section form, breathing rests |
| Voice | Celeste-style gibberish | Per-character pitch/cadence, emotional inflection, no real words |

### Music reference

**Primary influence: Chopin Nocturnes**
- Op. 9 No. 1 (B♭ minor) — section form (A–B–A'), sonorous thirds/sixths, Picardy third ending
- Op. 9 No. 2 (E♭ major) — the lyrical, singing quality, ornamental variations, surges and ebbs
- Op. 48 No. 1 (C minor) — the dramatic middle section for storm/avalanche intensity
- Op. 27 No. 2 (D♭ major) — the gentle ornamental beauty for night levels

**Rendering approach:**
- Grand piano synthesis via Web Audio API (not chiptune)
- String-pair detuning, pitch settling, felt-hammer attack, harmonic inharmonicity
- Polyphonic voices: counter-melody, ornamental echoes, cadential echoes
- Rubato (±12%) and phrase-level dynamic swell for breathing, organic feel
- Section form (A–B–A') for night mood with contrasting D♭ major middle
- Allowed departures: percussion and rhythmic urgency for hazard/competition moments

### Forbidden patterns

- ❌ Audio-only game information (always pair with visual)
- ❌ Sudden volume spikes or jump scares
- ❌ Looping sounds without variation (add subtle randomization)
- ❌ External audio file dependencies (prefer procedural generation)
- ❌ Ignoring AudioContext autoplay restrictions
- ❌ Audio processing on the main thread that could cause frame drops
- ❌ Hardcoded volume values (use constants from `gameConfig.ts`)
- ❌ Real words in character voice audio (Celeste-style gibberish only)
- ❌ Generic synth music that doesn't reference nocturne phrasing or texture
- ❌ Constant music with no breathing room (nocturnes need silence)
