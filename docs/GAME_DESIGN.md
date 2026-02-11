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
| **Groom** (tiller) | Space / A / ❄️ | ⚠️ Binary | No quality dimension — see [Grooming Quality](#grooming-quality) |
| **Winch** | Shift / LB / 🔗 | ⚠️ Limited | Artificial cable length — see [Winch](#winch-infinite-extension) |
| **Refuel** | Drive to station | ✅ Solid | 50% max refill, strategic placement |
| **Eat** | Drive to Chez Marie | ⚠️ Shallow | Only staminaRegen works — see [Food Buffs](#food-buffs) |
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
| 3 | Air Zone | Precision around features | Kickers/rails, 90% coverage |
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
| Tartiflette | +100% | Cold resist | 2 min | Night/storm insulation |
| Croziflette | +50% | Speed | 2 min | Fast coverage, high fuel burn |
| Fondue | +30% | Stamina regen | 3 min | Sustained steep climbing |
| Génépi | +20% | Precision | 1.5 min | Tight coverage targets |
| Vin Chaud | +40% | Warmth | 2.5 min | Counter frost vignette |
| Café | +25% | None | — | Quick top-up, no detour |

---

## Proposed Improvements

### Grooming Quality

**Problem**: Grooming is binary — hold button, area groomed. The core verb has no skill expression.

**Proposal**: Speed-dependent grooming quality.

- Grooming at low speed (≤40% of max) = **100% quality** (smooth, packed snow)
- Grooming at medium speed (40–70%) = **80% quality** (acceptable, minor ridges)
- Grooming at high speed (>70%) = **50% quality** (choppy, rough texture)
- Final coverage score = `Σ(tile_quality) / total_tiles` instead of binary count
- Low-quality tiles can be re-groomed to improve them

**Impact on levels**:
- Early levels (L1–L3): Barely noticeable — targets are low enough that 80% quality suffices
- Mid levels (L4–L6): Players must slow down on precision sections
- Late levels (L7–L10): Speed vs. quality becomes a real trade-off against the timer

**Visual feedback**: Groomed snow texture varies — smooth parallel lines for high quality, rough cross-hatching for low quality.

**HUD**: No new HUD element needed. The coverage % already captures quality since partial-quality tiles contribute less. Optional: brief floating text "+100%" / "+80%" / "+50%" when grooming, throttled.

### Food Buffs

**Problem**: Only staminaRegen buff is implemented. Chez Marie has no strategic depth — always pick tartiflette (max stamina).

**Proposal**: Implement all 4 remaining buffs as real gameplay modifiers.

| Buff | Mechanical Effect | When Useful |
|------|-------------------|-------------|
| **Speed** (Croziflette) | +30% max speed, +40% fuel consumption | Large open levels (L1, L4, L9) where coverage area is huge and time is tight |
| **Precision** (Génépi) | +1 tile grooming radius | Tight-coverage levels (L3 Air Zone at 90%, L10 at 85%) where reaching edges matters |
| **Warmth** (Vin Chaud) | Prevents frost vignette buildup for duration | Night/storm levels (L7, L9, L10) — see [Frost Vignette](#frost-vignette) |
| **Cold Resist** (Tartiflette) | Halves frost accumulation rate (stacks with warmth) | Extended night operations where warmth alone isn't enough |

**Design goal**: Different levels reward different food choices. The "right" buff depends on what you're about to face.

### Frost Vignette

**Problem**: Night and storm levels reduce visibility (headlights, fog) but create no resource pressure. The player adapts to low visibility and it becomes a non-factor.

**Proposal**: Cold exposure mechanic.

- On night and storm levels, a frost overlay gradually creeps from the screen edges
- Rate: ~2% opacity per minute (night) or ~4% per minute (storm)
- At 60% frost, movement speed drops 10% (cold hands)
- At 80% frost, grooming radius shrinks (numb fingers)
- **Warmth buff** pauses frost accumulation for its duration
- **Cold resist buff** halves frost rate
- Visiting Chez Marie resets frost to 0%
- Creates a natural "come in from the cold" loop on long night missions

**Affected levels**: L7 (Verticale), L9 (Tempête), L10 (Coupe des Aiguilles).

### Halfpipe Scoring

**Problem**: Le Tube (L6) plays identically to normal levels — just drive over snow, hit 80% coverage.

**Proposal**: Direction-aware quality scoring.

- The halfpipe has a defined axis (its length direction)
- Grooming **along** the axis (±30°) = 100% quality
- Grooming at **45°** to axis = 60% quality
- Grooming **across** the axis (±30° of perpendicular) = 30% quality
- Authentic to real halfpipe preparation: groomers make lengthwise passes, not cross-cuts

**Visual**: Flow arrows on the halfpipe surface show the optimal grooming direction.

**Bonus objective**: Replace `speed_run` with `pipe_mastery` — achieve 90%+ average quality across the halfpipe zone.

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
- Music continues from level mood (or lighter variant).

**HUD**: Visor strip matching the grooming HUD design — dark semi-transparent bar with accent stripe. Shows mode icon + level name, speed, and elapsed time. No resource bars.

**Post-run flow**: After reaching the bottom, brief celebration animation, then return to Level Complete screen with "Ski it!" button available for replay. Groomed tile state only clears when navigating to menu or next level.

**v2 enhancements** (not in scope for v1):
- Slalom gates on appropriate levels (timed gate runs).
- Freestyle elements on park levels (L3 Air Zone, L6 Le Tube) — kickers, rails, trick scoring.
- Per-level terrain modifications for variety.
- Best time tracking and ghost replay.

**Level suitability**: All levels support the reward run since all have piste geometry. Steep/dangerous levels become thrilling descents. Park levels naturally lend themselves to v2 freestyle additions.

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

- Should grooming quality affect the star rating formula, or just the coverage percentage?
- Should frost vignette affect the tutorial or only levels that explicitly have night/storm?
- How does the precision buff (+1 tile radius) interact with grooming quality? Does wider radius mean harder to maintain quality?
- Should snow drifts be a separate mechanic (front blade) or just a harder-to-groom surface (more passes needed)?
- Ski reward run: should v2 slalom gates contribute to the level star rating, or be a separate "ski score"?
- Ski reward run: should the descent camera reverse direction (looking downhill) or keep the same uphill-facing perspective as grooming?
