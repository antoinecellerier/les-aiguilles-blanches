# Gameplay Guide

## 🏔️ Welcome to Les Aiguilles Blanches

You've just been hired as a snow groomer operator at one of Savoie's most beautiful ski resorts. Your job is critical: prepare the pistes each night so skiers enjoy perfect corduroy snow in the morning.

## 🚜 Your Machine: The Snow Groomer

Your vehicle is inspired by the legendary **PistenBully 600**, a powerful snow grooming machine used in ski resorts worldwide.

### Components

| Part | Function | Control |
|------|----------|---------|
| **Tracks** | Propulsion and traction on snow | Movement keys |
| **Blade** (front) | Pushes and levels snow | Automatic |
| **Tiller** (rear) | Creates corduroy pattern | Hold Groom button |
| **Winch** | Anchors to steep slopes | Hold Winch button |
| **Cabin** | Protects operator, houses controls | Your home! |

### Grooming Quality

Not all grooming is equal. Quality depends on two factors:

- **Steering stability** — Smooth, committed passes produce better results than erratic zigzagging. Sweeping arcs are fine; rapid direction changes reduce quality.
- **Fall-line alignment** — Grooming along the fall line (up/down the slope) produces higher quality than perpendicular passes, matching real groomer technique.

Three visual tiers of groomed snow: smooth corduroy (high quality), uneven ridges (medium), and rough choppy (low). Re-grooming a tile with steadier steering upgrades its quality.

Quality doesn't affect win/loss coverage — it feeds into the **precision grooming** bonus objective on select levels (Air Zone, Le Tube, Coupe des Aiguilles).

## 📊 HUD Elements

```
┌─────────────────────────────────────────────────────────┐
│ Level Name  [buff icon]  [🔗 WINCH]          ⏱️ 4:32   │
│ ⛽ ████░░ 72%  💪 █████░ 85%  ❄️ ██████░░ 45%          │
│ ★ Fuel Efficiency ✓   ★ No Tumbles ✓                   │
└─────────────────────────────────────────────────────────┘
```

**Row 1:** Level name, active food buff with countdown, winch status (when active), timer (right).

**Row 2:** Three horizontal bars side by side:
- **⛽ Fuel**: Depletes while moving. Refuel at fuel stations (bottom of level). Shows ⛽+ feedback when refueling.
- **💪 Stamina**: Operator energy. Drains faster on steep slopes without winch, slower with winch. Below 30%, grooming width decreases. Visit Chez Marie for food buffs.
- **❄️ Coverage**: Percentage of piste groomed. Reach target to win.

**Row 3:** Bonus objectives (when present) — each shows ★ label, turns green ✓ when met, red ✗ on irreversible failure.

**Timer (⏱️)**: Time remaining. Complete before it hits 0:00. Hidden on levels with no time limit.

**❄️ Frost** (L8+): Cold exposure on snow/night levels. Creeps up over time — at 50% your speed drops 10%, at 75% it drops 20%. The warmth buff pauses frost; visiting Chez Marie resets it to 0%.

## 🍽️ Service Points

### Fuel Station (⛽)
Located at the bottom of each level. Drive over it to refuel automatically. Visual feedback shows when fuel is being added.

### Chez Marie (🍲)
The resort restaurant near the top of the level. Drive over it for full stamina restoration + a food buff. Also resets frost to 0%. Marie reads your situation and serves the best dish:

| Dish | Buff | When served | Effect | Duration |
|------|------|-------------|--------|----------|
| 🍷 Vin Chaud | Warmth | Night or storm levels | Halves stamina drain + pauses frost | 25s |
| 🍝 Croziflette | Speed | Time remaining < 40% | +30% speed, +40% fuel burn | 20s |
| 🥃 Génépi | Precision | Coverage > 70% | +1 grooming radius | 15s |
| 🧀 Fondue | Stamina Regen | Default | Passive stamina regen | 30s |
| ☕ Café | — | Anytime | Quick stamina boost (+25%), no buff | — |

Only one buff active at a time — revisiting replaces the current buff. The HUD shows the active buff icon and countdown next to the level name.

Pro tip: Time your visits strategically! Need to finish grooming edges? Visit at 70%+ coverage for precision. Running low on time? The speed boost helps but burns fuel fast.

## 🎮 Controls

### Keyboard (QWERTY/AZERTY/QWERTZ compatible)

| Action | Primary | Alternative |
|--------|---------|-------------|
| Move Up | W | ↑ Arrow |
| Move Down | S | ↓ Arrow |
| Move Left | A | ← Arrow |
| Move Right | D | → Arrow |
| Groom Snow | Space | - |
| Use Winch | Shift | - |
| Pause | Escape | P |
| Dismiss dialogue | Escape / Space / Enter / Click | - |

**Note:** If a dialogue is showing, Escape dismisses it instead of pausing.

All controls can be rebound in the Settings menu.

### Gamepad (Xbox, PlayStation, Nintendo Switch Pro)

| Action | Xbox | PlayStation | Nintendo |
|--------|------|-------------|----------|
| Move | D-pad / Left Stick | D-pad / Left Stick | D-pad / Left Stick |
| Groom | A | ✕ | A |
| Winch | LB | L1 | L |
| Pause | Start | Options | + |
| Menu Confirm | A | ✕ | A |
| Menu Back | B | ○ | B |
| Menu Navigate | D-pad / Left Stick | D-pad / Left Stick | D-pad / Left Stick |

**Controller Detection**: The game automatically detects your controller type and maps buttons correctly. On Nintendo controllers, the physical A button (right position) confirms, matching the expected behavior for that controller family.

### Touch (Mobile/Tablet)

Touch controls appear automatically on mobile devices. On desktop with touchscreen, they appear after first touch.

- **Left side**: Virtual joystick (8-directional) with directional indicators (▲▼◀▶)
- **Right side**: Action buttons with pixel art icons:
  - ❄️ **Groom**: Rake icon (3-prong tiller graphic)
  - 🔗 **Winch**: Anchor icon (stylized anchor shape)
  - Both buttons: Circular, beveled retro style, highlight on press
- **Auto-groom while winching**: On touch, holding the winch button automatically grooms — since both buttons are on the right side, only one thumb can reach them. Keyboard and gamepad users can control groom and winch independently.
- **Multitouch**: Move and groom simultaneously (up to 3 active pointers)
- **Top-right buttons** (stacked vertically, semi-transparent pill backgrounds):
  - ⏭ **Skip**: `>>` on narrow screens, `>> Skip` on wider mobile (repositioned left on ≤360px)
  - ☰ **Pause**: `||` button with dark pill background
  - ⛶ **Fullscreen**: `[]` (enter) or `X` (exit) with dark pill background

**Tutorial**: The tutorial adapts to your input method - showing keyboard, touch, or gamepad controls based on what's detected.

## 🎯 Level Progression

### Saving Progress

Your progress is automatically saved when you complete a level. Best star ratings, times, and bonus objectives are tracked per level. When you return to the game:
- **Resume**: Continue from where you left off
- **Level Select**: Trail map view — navigate the mountain to pick a run and aim for ⭐⭐⭐
- **New Game**: Start fresh from the tutorial

### Level Select

Once you've completed the tutorial, the **Level Select** button appears on the main menu. The trail map shows the full resort mountain with colored run paths in classic ski map style:
- **Click or tap** a marker to select it — a gold ring highlights the chosen run
- **Click again** (or press Enter) to start grooming; use the info panel buttons for Groom or Ski
- **Navigate** with arrow keys or gamepad (↑ towards summit, ↓ towards base)
- **Piste names** are also clickable touch targets for easy selection
- Marker colors match difficulty: 🟢 Green, 🔵 Blue, 🔴 Red, ⬛ Black, 🟠 Park
- Star ratings and best times shown for completed levels
- Locked levels are visible but grayed out

### Difficulty Scaling

The game's difficulty naturally increases as you progress:

- **Obstacles**: Easier pistes (tutorial, green, blue) have fewer rocks and trees on the groomable area. Harder pistes (red, black) have more obstacles to navigate around.
- **Resort buildings**: Near-resort pistes feature Savoyard chalets with snow-covered roofs and smoking chimneys. Higher altitude pistes show only natural terrain.
- **Time pressure**: Later levels have tighter time limits relative to area size.
- **Steepness**: Advanced levels require winch operation on steep sections.
- **Wildlife**: Decorative alpine animals (bouquetin, chamois, marmots, bunnies, birds) roam the slopes and flee when the groomer approaches.

### Level 1: Green Piste - Les Marmottes
*"Welcome aboard, rookie!"*

- **Difficulty**: ● Green (Beginner)
- **Objective**: Groom 80% of the beginner slope
- **Time**: 1:00
- **Skills**: Basic movement and grooming

**Tips**: Take your time. Follow the natural slope pattern. Jean-Pierre will guide you.

### Level 2: Blue Piste - Le Chamois
*"Time to pick up the pace!"*

- **Difficulty**: ■ Blue (Intermediate)
- **Objective**: Groom 85% before resort opens
- **Time**: 1:30
- **Skills**: Efficiency, coverage patterns

**Tips**: Work in parallel strips. Don't backtrack unnecessarily.

### Level 3: Snowpark - Air Zone
*"The freestylers are counting on you!"*

- **Difficulty**: Park
- **Objective**: Prepare freestyle features to 90%
- **Time**: 1:30
- **Skills**: Precision grooming around obstacles
- **Park Features**: 3 kickers (tabletop ramps) in a jump line, 3 rails (metallic bars) in a jib line

**Tips**: Kickers and rails are indestructible features — driving or grooming onto one ends the run immediately. The park has two parallel lines: a **jump line** (left) with three kickers and a **jib line** (right) with three rails. Groom the approach and landing zones around each feature with smooth, straight passes along the fall line. Blue and orange paint marks highlight takeoff and landing spots.

### Level 4: Red Piste - L'Aigle
*"Now we're talking steep!"*

- **Difficulty**: ◆ Red (Advanced)
- **Objective**: Groom 80% of steep terrain
- **Time**: 1:30
- **Skills**: Gradient handling, fuel management

**Tips**: Watch your fuel consumption on steep sections. Use service roads (yellow/black poles) to climb back up.

### Level 5: Red Piste - Le Glacier
*"Time to learn the winch."*

- **Difficulty**: ◆ Red (Advanced)
- **Objective**: Groom 80% using the winch
- **Time**: 1:30
- **Skills**: Winch operation, steep slope navigation

**Tips**: Thierry's set up the anchors. Press the winch key near a numbered post to attach — it stops you sliding on slopes ≥30° and tumbling on slopes ≥40°. Two service roads help you reach the anchors.

### Level 6: Half-pipe - Le Tube
*"Competition tomorrow!"*

- **Difficulty**: Park (Precision)
- **Objective**: Groom 95% coverage
- **Time**: 1:00
- **Skills**: Direction-aware halfpipe grooming
- **Park Features**: Halfpipe walls (3-tile banks on each side)

**Tips**: The halfpipe walls narrow the groomable floor. Groom in lengthwise passes (along the pipe axis, top to bottom) — this is how real halfpipes are prepared. Cross-passes score poorly. The **pipe mastery** bonus requires 80%+ average grooming quality. Blue dye lines and chevron arrows guide you.

### Level 7: Black Piste - La Verticale
*"Night shift on the steepest run."*

- **Difficulty**: ★ Black (Expert)
- **Objective**: Groom 75% in darkness
- **Time**: 2:00
- **Skills**: Night visibility, winch operation

**Tips**: Your groomer has directional headlights that illuminate the area in front and behind you. The lights rotate as you move, so they always shine where you're headed. Deploy the winch on steep sections - it only provides pulling force when you're downhill from the anchor.

### Level 8: Avalanche Zone - Col Dangereux
*"High risk, high reward."*

- **Difficulty**: ★ Black (Hazard)
- **Objective**: Prepare 70% of hazard zone
- **Time**: 1:30
- **Skills**: Safety awareness, strategic routing

**Tips**: Avoid marked avalanche zones. Listen to Thierry's safety briefing.

### Level 9: Storm Recovery
*"Nature's fury has passed. Time to clean up."*

- **Difficulty**: ◆ Red (Endurance)
- **Objective**: Clear 85% after heavy snowfall
- **Time**: 2:00
- **Skills**: Heavy snow handling, time management

**Tips**: Deep snow slows you down. Use the winch and eat hearty food for stamina.

### Level 10: Coupe des Aiguilles - FIS Finale
*"This is the big night. Show me what you've learned."*

- **Difficulty**: ★ Black (Mastery)
- **Objective**: Groom 85% — full mountain, night ops
- **Time**: 2:30
- **Skills**: Everything — winch, fuel, steep slopes, night visibility

**Tips**: Jean-Pierre's final test. The FIS inspects tomorrow — every piste must be perfect. Use all the skills you've learned across the season.

## 🧀 Savoyard Cuisine

### Chez Marie - Mountain Restaurant

Visit the restaurant (🏠) to restore stamina with authentic Savoyard dishes:

| Dish | Stamina | Special Effect |
|------|---------|----------------|
| **Tartiflette** 🥔 | +100% | Cold resistance (120s) |
| **Croziflette** 🍝 | +50% | Speed boost (20s) |
| **Fondue Savoyarde** 🧀 | +30% | Stamina regeneration (30s) |
| **Génépi** 🥃 | +20% | Precision handling (15s) |
| **Vin Chaud** 🍷 | +40% | Warmth in storms (25s) |
| **Café** ☕ | +25% | Quick pick-me-up |

**Pro tip**: Before tackling Level 8's storm, grab some Vin Chaud!

## 🏆 Scoring

Each level awards 1-3 stars based on:

| Stars | Requirements |
|-------|--------------|
| ⭐ | Complete the level |
| ⭐⭐ | Finish in <75% of time with 5%+ over target coverage, or meet half the bonus objectives |
| ⭐⭐⭐ | Finish in <50% of time with 10%+ over target, or meet all bonuses with 5%+ over target |

### Bonus Objectives

Most levels have optional bonus challenges displayed in the HUD below the visor during gameplay:

| Objective | Description |
|-----------|-------------|
| **Fuel efficiency** | Complete using ≤ target % of fuel |
| **No tumbles** | Finish without tumbling on steep slopes |
| **Speed run** | Complete within a time target |
| **Winch mastery** | Successfully use the winch N times |
| **Exploration** | Visit all service roads on the level |
| **Precision grooming** | Achieve ≥ target % average grooming quality |
| **Pipe mastery** | Achieve ≥ target % halfpipe grooming quality |

Objectives turn green (✓) when met and red (✗) on irreversible failure (e.g., first tumble). On compact screens, objectives flash for 4 seconds at level start then fade, re-appearing briefly on status change.

## 🎭 Characters

### Jean-Pierre 👨‍🔧
*Head Groomer* — First appears: **L1 (Les Marmottes)**

Your mentor and the resort's most experienced operator. He's gruff but fair, and knows every contour of the mountain. Introduces himself after the tutorial and sets you up on the green piste.

### Marie 👩‍🍳
*Restaurant Owner* — First appears: **First restaurant visit** (any level)

Runs "Chez Marie" at mid-station. Her tartiflette is legendary, and she always has a kind word for the night crew. Introduces herself the first time you visit her restaurant — after that, she serves food silently.

### Thierry 🧑‍⚕️
*Ski Patrol Chief* — First appears: **L5 (Le Glacier)**

Coordinates safety across the resort. When he says an area is dangerous, believe him. Introduces the winch mechanic on Le Glacier and briefs you before hazardous missions.

### Émilie 📋
*Event Organizer* — First appears: **L2 (Les Chamois)**

Manages competitions and festivals. Introduces herself on your first blue piste and pushes you to prove yourself. When she needs the park perfect for tomorrow's event, the pressure is on!

## 🎪 Special Events

Unlock special challenge missions as you progress:

- **Coupe des Aiguilles Blanches**: Slalom race preparation - perfect corduroy required!
- **Fête de la Tartiflette**: Festival week - heavy traffic, tight schedules
- **Boardercross Championship**: Park must be absolutely pristine
- **Nuit des Flambeaux**: Torchlight descent - deadline is sunset!
- **Raclette Emergency**: Clear a path for the cheese delivery truck! 🧀

## 💡 Advanced Tips

1. **Efficient patterns**: Work in long parallel strips rather than random movement
2. **Use terrain**: Let gravity help on downhill sections
3. **Plan fuel stops**: Route past the station when tank is at 30%
4. **Buff stacking**: Multiple food effects can be active simultaneously
5. **Winch wisely**: It uses more fuel but prevents dangerous sliding
6. **Weather awareness**: Storms reduce visibility and speed - prepare accordingly
7. **Use service roads**: On steep pistes, look for orange/black striped poles marking service roads - these safe routes let you reach winch anchors without the winch

## 🛣️ Service Roads

On advanced levels (Red and Black pistes), you'll find **service roads** marked with orange and black striped poles. These are switchback paths outside the main piste that allow your groomer to bypass steep sections.

**How to use:**
1. Look for the 🚜 Service Road sign at the piste edge
2. Drive between the striped marker poles
3. Follow the winding path uphill to reach winch anchors
4. Exit at the "To Piste" sign to rejoin the main run

**Why use them?**
- Steep zones (40°+) cause your groomer to tumble without a winch
- Service roads have gentle inclines safe for unassisted travel
- Use them to reach the first winch anchor, then use the winch for steeper sections

## 🔧 Troubleshooting

**Q: My groomer won't move!**
A: Check fuel level. If at 0%, find the nearest fuel station.

**Q: I keep running out of time!**
A: Focus on coverage, not perfection. 80% groomed is better than 50% perfect.

**Q: The winch won't work!**
A: Winch is only available on levels with steep terrain. You must be near a numbered anchor post (within 3 tiles) to attach. The cable only provides pulling force when you're downhill from the anchor — a slack cable won't prevent sliding.

**Q: The winch cable looks loose!**
A: When your groomer is above or level with the anchor, the cable has slack and won't prevent steep slope sliding or tumbling. Move below the anchor to tension the cable.

**Q: The cable snapped!**
A: The winch cable has a maximum extension. If you move too far from the anchor, the cable turns red and you'll feel resistance. Go further and it snaps — stunning you briefly and draining stamina. Switch to a lower anchor before reaching the limit.

**Q: I can't reach the winch anchor!**
A: Look for service roads (orange/black poles) on the side of the piste. These provide safe access to anchors.

**Q: I can't see anything!**
A: Night levels have reduced visibility. Your headlights illuminate the path ahead.

---

## 🎿 Ski/Snowboard Reward Run

After completing any level, a **"Ski it!"** (or **"Ride it!"** for snowboard) button appears on the win screen. Press it to descend the piste you just groomed! You can replay the run as many times as you like.

### Controls

Same lateral controls as grooming — left/right to steer. Movement downhill is automatic (gravity-driven). The winch key doubles as a brake.

| Input | Action |
|-------|--------|
| A/D or ←/→ | Steer left/right |
| Left stick | Steer (gamepad) |
| Touch lower half | Drag left/right |
| S or ↓ | Tuck (crouch for speed) |
| D-pad down | Tuck (gamepad) |
| Touch TUK button | Tuck (touch) |
| Shift / LB | Brake (snow plow) |
| Touch top quarter | Brake |
| Space / X (gamepad) | Jump |
| Touch JMP button | Jump |
| ESC | Pause menu |

### How It Works

- **Slope-aware speed** — steeper sections accelerate faster, flat sections decelerate
- **Groomed snow = fast**, ungroomed snow = friction slowdown
- **Carving** — turning bleeds speed (sharper turns = more drag). Keyboard/D-pad steering ramps up over ~0.2s so quick taps feel like gentle corrections; gamepad analog stick bypasses the ramp.
- **Tuck** — hold the down key to crouch into a tuck position: +20% speed, 40% steering response, minimal carve drag and heading penalty. Great for straight sections; risky in tight turns. Crouched sprites for both skier and snowboarder.
- **Braking** — hold the winch key for a snow plow stop
- **Obstacles** cause a brief speed bump (cooldown prevents chain-stuns)
- **Cliff danger zones** — wipeout! Brief freeze then respawn at last safe position
- **Soft boundaries** — drifting off-piste enters deep powder (major slowdown). A packed-snow shoulder near piste edges softens the transition.
- **Ski tracks** — skis leave two parallel track lines on ungroomed and off-piste snow; snowboards leave a single wider track
- **Avalanche zones** — on hazardous levels (L8–L10), skiing through avalanche zones triggers burial much faster than in a groomer
- **Fatal crashes** — hitting a tree or rock above 40 km/h is fatal (wipeout instead of bump)
- **Jumping** — press the groom key (Space) to jump. Requires minimum speed (~6 km/h). Higher speed = longer air time and bigger scale-up. Landing on groomed snow gives a 15% speed boost. At 30+ km/h, jumps are cliff-strength — you can clear danger zones mid-air instead of wiping out.
- **Replayable** — ski again from the win screen as many times as you want

### Tricks (Park Levels)

On levels with terrain park features (L3, L6), the ski run includes interactive tricks:

- **Kicker air tricks** — pass over a kicker to launch into an air trick. 5 random tricks: 360, 720, Backflip, Frontflip, Method grab. Skier scales up with a ground shadow.
- **Rail grind tricks** — pass over a rail to grind with sparks. 4 random tricks: Boardslide (yellow sparks), 50-50 (cyan), Lipslide (orange-red), Tailslide (green). Each has a distinct rotation angle and spark color.
- **Halfpipe tricks** — on L6, carve into a halfpipe wall to launch bigger air. 5 pipe-specific tricks: McTwist, Crippler, 900, Alley-oop, Stalefish. Higher amplitude and longer airtime than kicker tricks.
- All tricks show the trick name in a popup and give a 1.3× speed boost.
- **Trick scoring** — Each trick awards base points: kicker (100), rail (150), halfpipe (200). A speed multiplier (1.0–2.0×) rewards faster tricks. Consecutive unique tricks build a variety combo (+0.25× per unique trick); repeating the same trick resets the combo. Total score, trick count, and best combo are shown on the level complete screen.
- **Progressive turning** — initial turns barely slow you down; only sustained carving bleeds speed (drag ramps 10%→100% over 0.4s).
- Works identically for both skier and snowboarder modes.

### Slalom Gates (L4, L5, L10)

Certain levels feature slalom gates — paired red/blue poles placed along the piste:

- **Pass through** a gate (between the poles) for a ✓ and a chime sound
- **Miss** a gate for a ✗ and a buzz — the poles dim but there's no speed penalty
- **Gate counter** shows progress in the HUD (e.g., "Gates: 5/8")
- **Results** displayed on the level complete screen (perfect run highlighted in green)
- Gate difficulty scales: L4 has 8 wide gates, L5 has 10 tighter gates, L10 has 12 tight gates at night

### Dev Shortcuts

These shortcuts are available during gameplay for development and testing. They are ignored if the key conflicts with a rebound game control.

| Key | Action |
|-----|--------|
| K | Auto-groom to target coverage & launch ski run |
| N | Skip to next level |
| P | Go to previous level |
| Select (gamepad) | Skip to next level |

### Preference

Choose between Random, Ski, or Snowboard in **Settings → Bonus → Descent Mode**. Defaults to **Random** (50/50 each run). The choice is cosmetic (same physics, different sprite).

---

*Bonne chance et bonne glisse!* 🎿

## 🗂️ Daily Runs (Procedural Mode)

Unlocked after completing all 10 campaign levels. Generates fresh pistes from a shareable seed code.

### Playlists

- **Daily Shift** — Same mountain for everyone (date-seeded). Compare runs with friends.
- **Random Run** — New seed each run, shown as a shareable 4-6 character code.

### Difficulty Ranks

| Rank | Terrain | Shapes | Features |
|------|---------|--------|----------|
| 🟢 Green | Wide, gentle slopes | gentle_curve, funnel | 80% park, basic grooming |
| 🔵 Blue | Curved, narrower | gentle_curve, winding, dogleg | Tighter time, 30% slalom chance |
| 🔴 Red | Winding, steep zones | winding, serpentine, hourglass, dogleg, funnel | Winch, service roads on dangerous slopes (≥30°), 50% slalom |
| ⚫ Black | Serpentine, narrow | winding, serpentine, dogleg, hourglass | Night/storm, avalanche, 70% slalom |

### Park Runs

Green rank has 80% park chance; other ranks generate regular pistes only. Park runs use one of 5 feature combos (halfpipe+kickers, kickers+rails, kickers, halfpipe+kickers+rails, rails+kickers) with procedural Y placement and mixed lanes (40% chance to alternate kicker/rail):
- Coverage target ~95%, no steep zones or avalanche
- Ski mode includes freestyle trick scoring

### Ski Mode

After grooming a daily run, "Ski it!" lets you descend on your own work. Regular runs may include slalom gates; park runs include freestyle tricks.

### Pause Menu in Daily Runs

Pausing during a daily run shows a daily-run-aware menu:
- **Quit** returns to the Daily Runs screen (not main menu)
- **New Run** (random runs only) generates a fresh seed at the same difficulty rank

### Sharing Runs

Each procedural level has a unique 4–6 character seed code (Base36). Share runs with friends:
- **📋 Share button** on the Daily Runs screen copies a formatted message with URL (e.g., `?seed=ABC123&rank=blue`) to the clipboard
- **Share after winning** — the level complete screen for daily runs includes a Share button
- **Opening a share URL** takes you straight to the Daily Runs screen with the seed and rank preset, ready to play
- If the shared seed matches today's Daily Shift, no extra button appears — it's already the daily run
- **Recipients who haven't unlocked Daily Runs** see a locked preview showing the piste name, rank badge, weather, stats, and seed code — with a message to complete all campaign levels first
