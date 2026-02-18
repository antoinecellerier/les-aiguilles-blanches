# Game Design Document — Les Aiguilles Blanches

## Core Fantasy

You are a snow groomer operator preparing pistes at a Savoie ski resort before the lifts open. The game captures the meditative rhythm of grooming — methodical passes up and down the mountain, the hum of the engine, Chopin on the radio — punctuated by moments of real danger: steep slopes, avalanche zones, night operations.

The setting is authentically Savoyard: tartiflette at Chez Marie, génépi in the cold, ski patrol radio chatter, and the pressure of a FIS inspection.

## Design Pillars

1. **Authentic simulation** — Mechanics model real groomer operations (tiller, winch, blade, fuel management)
2. **Progressive mastery** — Each level introduces one new concept; difficulty emerges from combining concepts
3. **Environmental storytelling** — The mountain is a character: weather, wildlife, terrain tell the story
4. **Strategic pit stops** — Resource management (fuel, stamina, food buffs) creates meaningful routing decisions

## Player Verbs

| Verb | Input | Current State | Notes |
|------|-------|---------------|-------|
| **Move** | WASD / stick / touch | ✅ Solid | Drag-based physics, 150px/s |
| **Groom** (tiller) | Space / A / ❄️ | ⚠️ Binary | No quality dimension — see [Grooming Quality](#grooming-quality). Steering stability determines quality |
| **Winch** | Shift / LB / 🔗 | ⚠️ Limited | Artificial cable length — see [Winch](#winch-infinite-extension) |
| **Refuel** | Drive to station | ✅ Solid | 50% max refill, strategic placement |
| **Eat** | Drive to Chez Marie | ✅ Implemented | Auto-selects best dish — see [Food Buffs](#food-buffs) |
| **Push snow** (blade) | — | ❌ Not implemented | See [Snow Pushing](#snow-pushing-front-blade) |
| **Ski/Snowboard** | WASD / stick / touch / brake | ✅ Implemented | Post-grooming reward run — see [Ski/Snowboard Reward Run](#skisnoboard-reward-run) |

## Level Progression

```
Tutorial → Marmottes → Chamois → Air Zone → Aigle → Glacier → Tube → Verticale → Col Dangereux → Tempête → Coupe des Aiguilles
(tutorial)  (green)     (blue)    (park)     (red)    (red)     (park)  (black)     (black)         (red)     (black)
```

### Difficulty Curve

| # | Level | Teaches | New Stressor |
|---|-------|---------|--------------|
| 0 | Tutorial | Movement + grooming basics | None (safe sandbox) |
| 1 | Marmottes | Independent grooming, time pressure | Timer, obstacles |
| 2 | Chamois | Slope awareness, efficiency | Steep zones (25°), tighter coverage |
| 3 | Air Zone | Precision around features | Kickers/rails, 80% coverage |
| 4 | Aigle | Fuel management, route planning | Service roads, winding piste, fuel scarcity |
| 5 | Glacier | Winch operation | 35–40° slopes, tumble risk |
| 6 | Tube | Halfpipe-specific grooming | Directional scoring (planned) |
| 7 | Verticale | Night visibility, mortal danger | Headlights only, 50° slopes, cliff falls |
| 8 | Col Dangereux | Avalanche awareness | Hidden risk meter, zone avoidance |
| 9 | Tempête | Endurance under storm | Reduced visibility, snow drifts, long mission |
| 10 | Coupe des Aiguilles | Everything combined | Night + 45° + 3 winch + 85% coverage |

### Pacing Notes

- **L9 (Tempête, red) after two blacks** is intentional — shifts from "don't die" to "keep pushing" as a narrative breather. Marie (comfort character) is the perfect speaker for the exhaustion moment before the L10 finale.
- **Park levels (L3, L6)** serve as palate cleansers between escalating terrain difficulty.
- **Jean-Pierre bookends** the game (Tutorial, L1, L4, L10) — mentor at start, witness at finale.

## Characters & Economy

### Characters

| Character | Role | Personality | Levels |
|-----------|------|-------------|--------|
| **Jean-Pierre** | Head Groomer | Gruff mentor, knows every contour | Tutorial, 1, 4, 10 |
| **Émilie** | Event Organizer | Demanding, perfectionist | 2, 3, 6 |
| **Thierry** | Ski Patrol Chief | Safety-focused, terse | 5, 7, 8 |
| **Marie** | Restaurant Owner | Warm, maternal, Savoyard pride | 9 |

### Chez Marie — Food Economy

Current state: the restaurant restores stamina and provides named buffs, but **only staminaRegen actually affects gameplay**. The other 4 buffs are placeholder.

| Dish | Stamina | Buff | Duration | Strategic Role (planned) |
|------|---------|------|----------|--------------------------|
| Tartiflette | +100% | Cold resist | 120s | Night/storm insulation |
| Croziflette | +50% | Speed | 20s | Fast coverage, high fuel burn |
| Fondue | +30% | Stamina regen | 30s | Sustained steep climbing |
| Génépi | +20% | Precision | 15s | Tight coverage targets |
| Vin Chaud | +40% | Warmth | 25s | Counter frost vignette |
| Café | +25% | None | — | Quick top-up, no detour |

---

## Proposed Improvements

### Grooming Quality

**Problem**: Grooming is binary — hold button, area groomed. The core verb has no skill expression.

**Proposal**: Quality determined by two factors: **steering stability** and **fall-line alignment**.

#### Factor 1: Steering Stability (50% weight)

Clean, committed passes = high quality. Erratic zigzagging = low quality. Authentic to real grooming — professionals follow the piste contour with smooth, decisive lines.

**Key distinction**: Smooth turns are fine. Only *jerky, indecisive steering* reduces quality. A sweeping arc along a serpentine piste maintains full stability. Rapid direction changes (zigzag, oscillation) tank it.

- Measure **angular acceleration** (rate of change of angular velocity), not angular velocity itself
- A steady curve has constant angular velocity → zero angular acceleration → high stability
- A zigzag has rapidly changing angular velocity → high angular acceleration → low stability
- Track angular acceleration over a rolling window (~0.5s)
- Formula: `stability = clamp(1.0 - |angularAcceleration| / maxAngularAcceleration, 0.2, 1.0)`
- This naturally handles serpentine pistes: committed arcs score well, panicked corrections score poorly

#### Factor 2: Fall-Line Alignment (50% weight)

Grooming along the fall line (up/down the slope) = higher quality. This is how real groomers work — especially on steep terrain with winch, they make vertical passes up and down. Perpendicular passes are used for snow redistribution, not for corduroy finishing.

- The fall line is vertical (straight down the slope, increasing Y in screen coords)
- Compute alignment: `cos²(groomerAngle - fallLineAngle)` — 1.0 when parallel, 0.0 when perpendicular
- Minimum alignment quality: 30% (perpendicular isn't useless, just suboptimal)
- Formula: `alignment = 0.3 + 0.7 * cos²(groomerAngle - π/2)`

#### Combined Quality

```
tileQuality = stability * 0.5 + alignment * 0.5
```

Range: 10% (worst: zigzagging perpendicular) to 100% (best: straight pass along fall line).

#### Storage & Re-grooming

- Each tile stores a continuous 0–100% quality value (in the `SnowCell` grid)
- Re-grooming upgrades quality (best-of-N passes) — rewards going back over rough patches with steady fall-line passes
- Coverage remains binary (groomed or not) for win/loss. Quality feeds bonus objectives only

#### Bonus Objective

New `precision_grooming` type — target average quality across all groomed tiles. Example: "Achieve 80% average grooming quality." Available on levels where precision matters (park levels L3/L6, steep levels L5/L7, finale L10).

#### Visual Feedback

Groomed snow texture varies based on quality — smooth parallel corduroy lines for high quality, rough uneven texture for low quality. Retro SkiFree pixel art style. No floating text or HUD additions.

#### Impact on Levels

- **Early levels (L1–L3)**: Simple straight pistes make high quality natural. Bonus objective optional
- **Mid levels (L4–L6)**: Winding pistes make fall-line passes harder. Quality becomes a conscious choice
- **Park levels (L3, L6)**: Wide piste but precision features demand careful lines
- **Steep + winch levels (L5, L7, L8, L10)**: Winch naturally encourages fall-line passes → synergy with quality mechanic
- **Finale (L10)**: Night + steep + serpentine = maintaining quality is the ultimate mastery challenge

#### Input Compatibility

Works identically on keyboard, gamepad, and touch — all have rotational control. No analog throttle needed. The mechanic rewards *planning your line* and *committing to it*, not raw dexterity.

### Food Buffs ✅ IMPLEMENTED

Marie auto-selects the best dish based on current game state. No new inputs needed — same drive-into-restaurant interaction. Priority: Warmth → Speed → Precision → Stamina Regen.

| Buff | Dish | Condition | Effect | Duration |
|------|------|-----------|--------|----------|
| **Warmth** | Vin Chaud 🍷 | Night or storm level | Halves stamina drain | 25s |
| **Speed** | Croziflette 🍝 | Time remaining < 40% | +30% speed, +40% fuel burn | 20s |
| **Precision** | Génépi 🥃 | Coverage > 70% | +1 grooming radius | 15s |
| **Stamina Regen** | Fondue 🧀 | Default fallback | Passive stamina regen | 30s |

Short burst durations create a pit-stop rhythm — players loop through Marie's restaurant. One buff active at a time; revisiting replaces the current buff and refills stamina to 100%.

**Future**: coldResist (tartiflette) deferred — warmth buff already counters frost.

### Frost Vignette ✅ IMPLEMENTED

Cold exposure mechanic adding resource pressure to late-game levels.

- Icy vignette overlay creeps from screen edges; intensity scales with frost level
- **Rates**: Night 25%/min, Storm 35%/min, Light snow 15%/min
- At 50% frost: speed -10% (cold hands)
- At 75% frost: speed -20% (numb fingers)
- **Warmth buff** (vin chaud) pauses frost accumulation
- Visiting Chez Marie resets frost to 0%
- HUD shows ❄️ percentage with color: blue → orange → red at penalty thresholds
- **Difficulty curve**: L8 introduces frost gently (light snow, daytime), L9 ramps up (storm), L10 combines with night
- L7 (Verticale) is exempt — already introduces night + cliffs + triple winch

**Affected levels**: L8 (Col Dangereux), L9 (Tempête), L10 (Coupe des Aiguilles).

### Halfpipe Scoring ✅ IMPLEMENTED

**Problem**: Le Tube (L6) plays identically to normal levels — just drive over snow, hit 80% coverage.

**Implementation**: Direction-aware quality scoring + halfpipe walls.

- Halfpipe walls (3 tiles wide) narrow the groomable floor area
- Grooming **along** the pipe axis = 100% quality (cos² formula)
- Grooming **across** the axis = 30% quality
- Blue dye boundary lines and direction arrows guide the player
- Kickers and rails on L3 (Air Zone) also have directional zone scoring
- Driving onto a feature = instant fail (forgiving ~70% hitbox)

**Visual**: Gradient banks along piste edges + direction chevrons on floor.

**Bonus objective**: `pipe_mastery` on L6 — achieve 80%+ average quality. `precision_grooming` on L3.

### Snow Pushing (Front Blade)

**Problem**: The groomer has two tools — tiller (rear, textures snow) and blade (front, moves snow). Only the tiller exists in-game.

**Proposal**: Toggle-able front blade for clearing snow drifts.

- **Activation**: Dedicated button (or auto-activates when driving into a drift)
- **Effect**: Pushes snow mass forward and to the sides as you drive
- **Cost**: +30% fuel consumption, -20% speed while blade is lowered
- **Use case**: Storm levels (L9) have snow drifts on the piste. Without blade, you groom around them. With blade, you clear them first for better coverage
- Cleared drift snow accumulates at piste edges (visual only)

**Level impact**: Primarily L9 (Tempête). Could add drift hazards to L10 as well.

**Priority**: Lower than other proposals — adds a new verb which increases control complexity. Consider adding after food buffs and grooming quality are proven.

### Winch Infinite Extension

**Problem**: Cable has artificial length limit. Unrealistic — real winch cables extend hundreds of meters.

**Proposal**: Remove cable length cap. Winch only provides uphill pulling force.

- Cable can extend indefinitely
- Pull force remains constant (WINCH_FORCE: 0.3)
- Visual: cable rendered at any length (already works, just needs cap removal)
- Gameplay impact: Players can attach at bottom and groom wider areas while tethered

**Priority**: Low effort, low impact. Quick win.

### Wildlife Interaction (Future)

**Problem**: 6 animal species with flee AI, procedural sprites, track systems — but zero gameplay interaction.

**Possible directions** (not yet designed in detail):
- **Careful groomer bonus**: Complete level without scaring any animal within X tiles → bonus objective
- **Track preservation**: Animal tracks add charm. Bonus for leaving certain tracks ungroomed?
- **Rescue events**: Injured animal near cliff edge → drive carefully to it without tumbling

**Priority**: Low. Wildlife serves its purpose as atmospheric decoration. Interaction risks feeling gimmicky unless carefully designed.

### Ski/Snowboard Reward Run

**Problem**: After completing a level, the player sees a stats screen and moves on. There's no payoff for the effort — no moment of "look what I built."

**Proposal**: Optional post-grooming descent. After winning a level, a **"Ski it!"** button lets the player ski or snowboard down the piste they just groomed.

**Core design**:
- **Fun with consequences** — Cliff danger zones cause wipeouts (freeze + respawn), obstacles cause bumps. Quick recovery keeps it enjoyable.
- **Same top-down perspective** — Reuses existing camera, geometry, obstacles, and wildlife systems.
- **Gravity-driven movement** — Player automatically moves downhill; input is lateral steering only (left/right).
- **Slope-aware speed** — Steep zones (from level data) increase gravity and acceleration. Flat sections decelerate naturally.
- **Grooming quality matters** — Groomed tiles = fast and smooth; ungroomed tiles = powder friction slowdown. Thorough grooming is directly rewarded with a better ski experience.
- **Braking** — Winch key (Shift / LB / touch top quarter) acts as a snow plow brake.
- **Carving physics** — Turning bleeds speed proportional to turn sharpness.
- **Soft boundaries** — Hitting the piste edge creates slowdown. Obstacles cause a bump with cooldown to prevent chain-stuns.
- **Replayable** — Ski again from the win screen as many times as desired. Groomed tile state persists across replays.

**Ski vs. Snowboard**:
- Player chooses ski or snowboard in Settings (Bonus section). Default: ski.
- **Cosmetic only (v1)** — Same physics, different top-down sprite (24×36px).
- Skier: tuck position with parallel skis, poles, goggles. Snowboarder: sideways stance on wide board, arms out.
- Button text adapts: "Ski it!" vs. "Ride it!" based on preference.

**Entry point**: "Ski it!" / "Ride it!" button on the Level Complete screen (win only, not on fail). Button reappears after each ski run for replays. Dev shortcut: press K during gameplay to auto-groom and launch.

**Physics model**:
- `GRAVITY_SPEED`: Base downhill velocity, scaled by slope angle via `SLOPE_SPEED_FACTOR`.
- `LATERAL_SPEED`: Steering responsiveness (left/right).
- `BRAKE_DECELERATION`: Strong deceleration while brake held.
- `CARVE_DRAG`: Speed bleed proportional to lateral input intensity.
- Groomed tile speed multiplier vs. ungroomed tile friction.
- Obstacle collision: brief speed reduction + bump animation (cooldown prevents rapid re-triggering).
- Cliff danger zones: wipeout → freeze → respawn at last safe on-piste position.
- Jump: groom key triggers a speed-dependent jump. At ≥30 km/h, becomes a cliff jump (longer air, bigger scale) that clears danger zones. Landing on groomed snow gives a 1.15× speed boost.

**Visual effects**:
- Snow spray on sharp carves and powder contact.
- Speed lines at high velocity.
- Trail behind skier/snowboarder.
- Wildlife flees as the player descends (reuse WildlifeSystem).

**Audio**:
- Wind sound pitched to velocity.
- Edge carving sound on sharp turns.
- Powder spray sound on ungroomed terrain.
- Bump/thud on obstacle contact (reuse existing sounds).
- Ascending chime on slalom gate pass, soft buzz on miss.

**Slalom gates** (levels 4, 5, 10):
- Paired red/blue poles placed along the piste at even intervals.
- Non-punitive: ✓/✗ visual feedback per gate, counter in HUD, stats on level complete.
- Gate width narrows with difficulty: L4 (5 tiles, 8 gates), L5 (4 tiles, 10 gates), L10 (3 tiles, 12 gates).
- Alternating lateral offset from piste center for slalom feel.
- Missing a gate dims the poles to 30% alpha; no speed penalty.
- Music continues from level mood (or lighter variant).

**HUD**: Visor strip matching the grooming HUD design — dark semi-transparent bar with accent stripe. Shows mode icon + level name, speed, and elapsed time. No resource bars.

**Post-run flow**: After reaching the bottom, brief celebration animation, then return to Level Complete screen with "Ski it!" button available for replay. Groomed tile state only clears when navigating to menu or next level.

**v2 enhancements** (not in scope for v1):
- Slalom gates on appropriate levels (timed gate runs).
- ~~Freestyle elements on park levels (L3 Air Zone, L6 Le Tube) — kickers, rails, trick scoring.~~ ✅ Implemented: air tricks (kicker + halfpipe) and grind tricks (rail) with visual animations and trick name popups. Scoring integration deferred.
- Per-level terrain modifications for variety.
- Best time tracking and ghost replay.

**Level suitability**: All levels support the reward run since all have piste geometry. Steep/dangerous levels become thrilling descents. Park levels feature interactive kickers, rails, and halfpipe walls with trick animations.

### Ghost Replay (Future)

Record player inputs for best run per level. On replay, show a semi-transparent ghost groomer following the recorded path.

- Motivates self-improvement without competitive leaderboards
- Shows routing efficiency visually
- Low priority but high replayability value

---

## Prioritized Implementation Order

Based on impact/effort ratio:

| Priority | Feature | Effort | Impact | Why First |
|----------|---------|--------|--------|-----------|
| 1 | **Food buffs** | Medium | High | Makes existing system meaningful; touches 7 levels |
| 2 | **Frost vignette** | Medium | High | Pairs with food buffs; adds pressure to 3 levels |
| 3 | **Grooming quality** | Medium | High | Transforms core loop; natural difficulty scaling |
| 4 | **Ski/snowboard reward run** | Medium–High | High | Satisfying payoff for grooming; reuses existing systems |
| 5 | **Halfpipe scoring** | Medium | Medium | Makes L6 distinctive; self-contained change |
| 6 | **Winch infinite** | Low | Low | Quick fix, already queued |
| 7 | **Snow pushing** | High | Medium | New verb — defer until core mechanics are polished |
| 8 | **Ghost replay** | High | Medium | Replayability — defer to post-launch polish |
| 9 | **Wildlife interaction** | Low–Med | Low | Nice-to-have, risk of being gimmicky |

## Open Questions

- ~~Should grooming quality affect the star rating formula, or just the coverage percentage?~~ → **Resolved**: Quality feeds into bonus objectives only, not coverage
- Should frost vignette affect the tutorial or only levels that explicitly have night/storm?
- How does the precision buff (+1 tile radius) interact with grooming quality? Does wider radius mean harder to maintain quality?
- Should snow drifts be a separate mechanic (front blade) or just a harder-to-groom surface (more passes needed)?
- Ski reward run: should v2 slalom gates contribute to the level star rating, or be a separate "ski score"?
- Ski reward run: should the descent camera reverse direction (looking downhill) or keep the same uphill-facing perspective as grooming?

## Settled Design Decisions

- **Grooming quality input**: Steering stability (angular acceleration) + fall-line alignment. Works on all input methods
- **Stability metric**: Angular *acceleration*, not velocity — smooth committed turns are fine, only jerky zigzag penalizes
- **Quality granularity**: Continuous 0–100%, not discrete tiers
- **Re-grooming**: Best-of-N — re-grooming at steadier steering upgrades the tile
- **Quality vs. coverage**: Quality is bonus/mastery, coverage stays binary for win/loss
- **Quality visual**: Snow texture variation only (retro pixel art), no floating text or HUD

## Daily Runs (Procedural Generation)

Post-campaign mastery mode unlocked after completing Level 10. Generates fresh pistes with seeded RNG for replayable grooming challenges.

### Playlists

- **Daily Shift** — date-seeded (`YYYYMMDD`), same mountain for everyone. Compare runs.
- **Random Run** — new seed each run, displayed as 4-6 char shareable code (e.g., `7X2M`).

### Difficulty Ranks

Player picks a rank; seed builds the mountain within those rules.

| Rank | Piste | Shapes | Steep | Mechanics | Conditions | Park Chance |
|------|-------|--------|-------|-----------|------------|-------------|
| **Green** | Wide, gentle | gentle_curve, funnel | None | Basic grooming | Day, clear | 80% |
| **Blue** | Medium, curved | gentle_curve, winding, dogleg | 1 zone (25-30°) | Tighter time | Day, clear | 0% |
| **Red** | Narrower, winding | winding, serpentine, hourglass, dogleg, funnel | 2 zones (30-40°) | Winch, service roads (≥30° only) | May have snow | 0% |
| **Black** | Narrow, serpentine | winding, serpentine, dogleg, hourglass | 3 zones (35-50°) | Winch, avalanche | Night or storm | 0% |

### Park Runs

Green rank has 80% park chance; other ranks generate regular pistes only. When park is rolled, steep/winch/avalanche are replaced with park features:
- 5 feature combos: halfpipe+kickers, kickers+rails, kickers, halfpipe+kickers+rails, rails+kickers
- Procedural Y placement, mixed lanes (40% chance to alternate kicker/rail), halfpipe feature offset when both types present
- Coverage target raised to 90-95%, time relaxed
- No obstacles on park levels

### Ski Mode on Daily Runs

Every daily run has a ski payoff after grooming:
- **Regular runs**: player skis on their own groomed piste. Slalom gates generated by chance (Blue 30% / Red 50% / Black 70%), with count (6-12) and width (3-5 tiles) scaling with rank.
- **Park runs**: freestyle trick scoring from kickers/rails/halfpipe. No slalom.
- Groomed tiles saved by seed code for replay.

### Narrative

Daily runs are the "resort keeps running" epilogue. Characters appear in short radio-chatter one-liners:
- Jean-Pierre: dispatches
- Thierry: hazard warnings
- Marie: food reminders
- Émilie: rival PB teases

### Level Variety

7 piste shapes (straight, gentle_curve, winding, serpentine, dogleg, funnel, hourglass) with `pisteVariation` (freqOffset, ampScale, phase, widthPhase) making the same shape look different per seed. Steep zones placed with randomized gaps instead of fixed bands. Service roads generated only for dangerous zones (≥30°); safe zones on blue rank have no bypass. Winch anchors placed only above dangerous zones. Slalom gates cover 5% from top to bottom minus finish buffer.

### Validation

Generated levels validated for: flood-fill reachability, minimum piste width (≥4 tiles), winch feasibility, halfpipe width (≥9 tiles), park feature bounds, start safety. Bad seeds regenerate with seed+1 (max 10 attempts).
