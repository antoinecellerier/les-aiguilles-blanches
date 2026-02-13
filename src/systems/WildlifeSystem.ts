import Phaser from 'phaser';
import { BALANCE, DEPTHS, yDepth } from '../config/gameConfig';
import type { WildlifeSpawn } from '../config/levels';
import { FOX, foxHuntDecision } from '../utils/foxBehavior';
import { drawAnimal, ANIMAL_GRID, type AnimalType } from '../utils/animalSprites';

/** Per-species behavior constants */
const SPECIES = {
  bouquetin: { speedMult: 0.6, wanderSpeed: 15, wanderRange: 200 },
  chamois:   { speedMult: 1.8, wanderSpeed: 25, wanderRange: 300 },
  marmot:    { speedMult: 0,   wanderSpeed: 10, wanderRange: 30 },
  bunny:     { speedMult: 2.0, wanderSpeed: 35, wanderRange: 250 },
  bird:      { speedMult: 1.5, wanderSpeed: 40, wanderRange: 0 },  // 0 = world-width, set in createAnimal
  fox:       { speedMult: 1.4, wanderSpeed: 20, wanderRange: 300 },
} as const;

interface Animal {
  type: AnimalType;
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  state: 'idle' | 'fleeing' | 'hiding' | 'gone';
  fleeAngle: number;
  fleeTimer: number;
  wanderTimer: number;
  hopPhase: number;
  scale: number;
  boundLeft: number;
  boundRight: number;
  boundTop: number;
  boundBottom: number;
  // Marmot burrow
  burrowMask?: Phaser.Display.Masks.GeometryMask;
  burrowMaskShape?: Phaser.GameObjects.Graphics;
  spriteH?: number;
  hideTimer?: number;
  hideDuration?: number;
  trackTimer: number;        // ms until next track print
  lastTrackX: number;
  lastTrackY: number;
}

interface Track {
  image: Phaser.GameObjects.Image;
  age: number;              // ms since placed
  x: number;
  y: number;
}

const TRACK_INTERVAL = 300;   // ms between track prints
const TRACK_LIFETIME = 15000; // ms before full fade
const MAX_TRACKS = 80;        // cap total track objects

export interface ObstacleRect {
  x: number; y: number; w: number; h: number;
}

export class WildlifeSystem {
  private scene: Phaser.Scene;
  private animals: Animal[] = [];

  /** Optional sound callback when an animal flees. */
  onAnimalFlee: ((type: AnimalType) => void) | null = null;
  private tracks: Track[] = [];
  private tileSize: number;
  private worldW = 0;
  private worldH = 0;
  private isOnCliff: ((x: number, y: number) => boolean) | null = null;
  private buildings: ObstacleRect[] = [];

  constructor(scene: Phaser.Scene, tileSize: number) {
    this.scene = scene;
    this.tileSize = tileSize;
  }

  /** Register cliff check and building footprints so animals avoid them */
  setObstacles(
    cliffCheck: (x: number, y: number) => boolean,
    buildings: ObstacleRect[],
  ): void {
    this.isOnCliff = cliffCheck;
    this.buildings = buildings;
  }

  /** Erase animal tracks within a radius (called when grooming) */
  eraseTracksAt(x: number, y: number, radius: number): void {
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const t = this.tracks[i];
      const dx = t.x - x;
      const dy = t.y - y;
      if (dx * dx + dy * dy < radius * radius) {
        t.image.destroy();
        this.tracks.splice(i, 1);
      }
    }
  }

  private isInBuilding(x: number, y: number): boolean {
    for (const b of this.buildings) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    return false;
  }

  /**
   * Simulate pre-existing animal tracks at level start.
   * For each ground animal, lay a short trail of tracks leading to its current position
   * as if it had been wandering before the player arrived.
   */
  bootstrapTracks(): void {
    for (const animal of this.animals) {
      if (animal.type === 'bird') continue;
      // Random approach direction
      const angle = Math.random() * Math.PI * 2;
      const trailLen = 4 + Math.floor(Math.random() * 5);
      const spacing = 8 + Math.random() * 6;
      for (let i = trailLen; i >= 0; i--) {
        const tx = animal.x - Math.cos(angle) * spacing * i;
        const ty = animal.y - Math.sin(angle) * spacing * i;
        // Skip if off-world or on a building
        if (tx < 0 || tx > this.worldW || ty < 0 || ty > this.worldH) continue;
        if (this.isInBuilding(tx, ty)) continue;
        // Simulate an animal at this position for placeTrack
        const fake: Animal = { ...animal, x: tx, y: ty, vx: Math.cos(angle) * 10, vy: Math.sin(angle) * 10 };
        this.placeTrack(fake);
        // Age these tracks so they look old (partially faded)
        const track = this.tracks[this.tracks.length - 1];
        if (track) {
          track.age = TRACK_LIFETIME * (0.3 + Math.random() * 0.5);
          const fade = 1 - track.age / TRACK_LIFETIME;
          track.image.setAlpha(fade * 0.5);
        }
      }
    }
  }

  /**
   * Spawn wildlife for a level.
   * Animals are placed randomly on off-piste snow (outside the piste area).
   * Marmots additionally avoid access paths (cat tracks).
   */
  spawn(
    spawns: WildlifeSpawn[],
    worldWidth: number,
    worldHeight: number,
    pisteLeftEdge: number,
    pisteRightEdge: number,
    avoidRects?: { startY: number; endY: number; leftX: number; rightX: number }[],
  ): void {
    this.worldW = worldWidth;
    this.worldH = worldHeight;
    const margin = BALANCE.WILDLIFE_SPAWN_MARGIN;

    for (const { type, count } of spawns) {
      // Randomize count: ±1 from base, minimum 1
      const randomized = Math.max(1, count + Math.floor(Math.random() * 3) - 1);
      // Cluster same-species animals together (flock/colony behavior)
      const side = Math.random() < 0.5 ? 'left' : 'right';
      let clusterX: number;
      if (side === 'left') {
        clusterX = margin + Math.random() * Math.max(10, pisteLeftEdge - margin * 2);
      } else {
        clusterX = pisteRightEdge + margin + Math.random() * Math.max(10, worldWidth - pisteRightEdge - margin * 2);
      }
      const clusterY = margin + Math.random() * (worldHeight - margin * 2);

      for (let i = 0; i < randomized; i++) {
        // Spread within cluster — birds spread wider horizontally
        const spread = type === 'bird' ? 120 : 40;
        let x = clusterX + (Math.random() - 0.5) * spread;
        let y = clusterY + (Math.random() - 0.5) * spread * 0.6;
        x = Phaser.Math.Clamp(x, margin, worldWidth - margin);
        y = Phaser.Math.Clamp(y, margin, worldHeight - margin);

        // Marmots must not burrow on piste or cat tracks — retry placement
        if (type === 'marmot' && avoidRects && avoidRects.length > 0) {
          let onTrack = this.isOnPisteOrPath(x, y, pisteLeftEdge, pisteRightEdge, avoidRects);
          let attempts = 0;
          while (onTrack && attempts < 8) {
            x = margin + Math.random() * (worldWidth - margin * 2);
            y = margin + Math.random() * (worldHeight - margin * 2);
            onTrack = this.isOnPisteOrPath(x, y, pisteLeftEdge, pisteRightEdge, avoidRects);
            attempts++;
          }
          if (onTrack) continue; // couldn't find valid spot, skip this marmot
        }

        this.createAnimal(type, x, y, worldWidth, worldHeight);
      }
    }
  }

  private isOnPisteOrPath(
    x: number, y: number,
    pisteLeft: number, pisteRight: number,
    rects: { startY: number; endY: number; leftX: number; rightX: number }[],
  ): boolean {
    if (x >= pisteLeft && x <= pisteRight) return true;
    for (const r of rects) {
      if (y >= r.startY && y <= r.endY && x >= r.leftX && x <= r.rightX) return true;
    }
    return false;
  }

  private createAnimal(type: AnimalType, x: number, y: number, worldW: number, worldH: number): void {
    const scale = Math.max(1, Math.round(this.tileSize / 8));
    const g = this.scene.add.graphics();

    // Birds render above trees; ground animals use Y-based depth among trees
    if (type === 'bird') {
      g.setDepth(DEPTHS.AIRBORNE);
    } else {
      g.setDepth(yDepth(y));
    }

    drawAnimal(g, type, 0, 0, scale);
    g.setPosition(x, y);

    const spec = SPECIES[type];
    const range = spec.wanderRange || worldW * 0.4; // birds: world-width
    const animal: Animal = {
      type,
      graphics: g,
      x, y,
      homeX: x, homeY: y,
      vx: 0, vy: 0,
      state: 'idle',
      fleeAngle: 0,
      fleeTimer: 0,
      wanderTimer: Math.random() * 3000,
      hopPhase: 0,
      scale,
      boundLeft: Math.max(0, x - range),
      boundRight: Math.min(worldW, x + range),
      boundTop: Math.max(0, y - range * 0.5),
      boundBottom: Math.min(worldH, y + range * 0.5),
      trackTimer: Math.random() * TRACK_INTERVAL,
      lastTrackX: x,
      lastTrackY: y,
    };

    // Birds start already soaring in a random direction
    if (type === 'bird') {
      // Birds roam the full world
      animal.boundLeft = 0;
      animal.boundRight = worldW;
      animal.boundTop = 0;
      animal.boundBottom = worldH * 0.4;
      const initAngle = (Math.random() - 0.5) * Math.PI * 0.8;
      const initSpeed = 6 + Math.random() * 10;
      animal.vx = Math.cos(initAngle) * initSpeed;
      animal.vy = Math.sin(initAngle) * initSpeed * 0.5;
      animal.wanderTimer = 1500 + Math.random() * 2500;
    }

    // Marmot burrow mask
    if (type === 'marmot') {
      const maskShape = this.scene.make.graphics({ x: 0, y: 0 });
      const halfH = 2 * scale;
      maskShape.fillStyle(0xffffff);
      maskShape.fillRect(x - 30, y - 100, 60, 100 + halfH + 1);
      animal.burrowMask = maskShape.createGeometryMask();
      animal.burrowMaskShape = maskShape;
      animal.spriteH = 4 * scale + 4;
      g.setMask(animal.burrowMask);
    }

    this.animals.push(animal);
  }

  /**
   * Per-frame update: idle behaviors, proximity flee, and species-specific animation.
   */
  update(groomerX: number, groomerY: number, delta: number): void {
    const fleeDist = BALANCE.WILDLIFE_FLEE_DISTANCE;
    const dt = delta / 1000;
    const time = this.scene.time.now;
    const minDist = this.tileSize * 0.8; // minimum spacing between same-species

    for (const animal of this.animals) {
      if (animal.state === 'gone') continue;

      const dx = animal.x - groomerX;
      const dy = animal.y - groomerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Marmot burrow hiding
      if (animal.state === 'hiding') {
        animal.hideTimer = (animal.hideTimer || 0) - delta;
        const sH = animal.spriteH || 16;
        const dur = animal.hideDuration || 3000;
        const progress = Math.min(1, Math.max(0, 1 - (animal.hideTimer || 0) / dur));
        if (progress < 0.2) {
          const t = progress / 0.2;
          animal.graphics.setPosition(animal.x, animal.homeY + t * sH);
        } else if (progress > 0.8) {
          const t = (progress - 0.8) / 0.2;
          animal.graphics.setPosition(animal.x, animal.homeY + (1 - t) * sH);
        } else {
          animal.graphics.setPosition(animal.x, animal.homeY + sH);
        }
        if ((animal.hideTimer || 0) <= 0) {
          animal.state = 'idle';
          animal.graphics.setPosition(animal.x, animal.y);
          animal.wanderTimer = 1000 + Math.random() * 2000;
        }
        continue;
      }

      // Flee check
      if (animal.state === 'idle' && dist < fleeDist) {
        this.startFlee(animal, dx, dy);
      }

      if (animal.state === 'fleeing') {
        this.updateFlee(animal, delta, dt, time);
        // Fleeing ground animals leave tracks too
        if (animal.type !== 'bird') {
          animal.trackTimer -= delta;
          if (animal.trackTimer <= 0) {
            this.placeTrack(animal);
            animal.trackTimer = TRACK_INTERVAL * 0.5; // more frequent when running
          }
        }
        continue;
      }

      // === IDLE BEHAVIORS ===
      animal.wanderTimer -= delta;

      if (animal.wanderTimer <= 0) {
        this.pickWanderAction(animal);
      }

      // Move
      animal.x += animal.vx * dt;
      animal.y += animal.vy * dt;

      // Cliff check: only bouquetin and chamois can traverse cliffs
      if (animal.type !== 'bird' && animal.type !== 'bouquetin' && animal.type !== 'chamois') {
        if (this.isOnCliff && this.isOnCliff(animal.x, animal.y)) {
          animal.x -= animal.vx * dt;
          animal.y -= animal.vy * dt;
          animal.vx = -animal.vx * 0.5;
          animal.vy = -animal.vy * 0.5;
        }
      }

      // Building collision: animals walk around buildings
      if (animal.type !== 'bird' && this.isInBuilding(animal.x, animal.y)) {
        animal.x -= animal.vx * dt;
        animal.y -= animal.vy * dt;
        animal.vx = -animal.vx * 0.5;
        animal.vy = -animal.vy * 0.5;
      }

      // Boundary handling: birds wrap at world edges, marmots bounce, others soft-steer
      if (animal.type === 'bird') {
        if (animal.x > this.worldW + 30) animal.x = -30;
        else if (animal.x < -30) animal.x = this.worldW + 30;
        // Vertical bounce for birds
        if (animal.y < animal.boundTop) { animal.vy += 20 * dt; }
        else if (animal.y > animal.boundBottom) { animal.vy -= 30 * dt; }
      } else if (animal.type === 'marmot') {
        // Hard bounce near burrow
        if (animal.x < animal.boundLeft || animal.x > animal.boundRight) {
          animal.vx = -animal.vx;
          animal.x = Phaser.Math.Clamp(animal.x, animal.boundLeft, animal.boundRight);
        }
        if (animal.y < animal.boundTop || animal.y > animal.boundBottom) {
          animal.vy = -animal.vy;
          animal.y = Phaser.Math.Clamp(animal.y, animal.boundTop, animal.boundBottom);
        }
      } else {
        // Soft steer back toward home when far from bounds
        if (animal.x < animal.boundLeft) animal.vx += 15 * dt;
        else if (animal.x > animal.boundRight) animal.vx -= 15 * dt;
        if (animal.y < animal.boundTop) animal.vy += 10 * dt;
        else if (animal.y > animal.boundBottom) animal.vy -= 10 * dt;
      }
      // Gentle home pull
      if (animal.type !== 'bird') {
        if (Math.abs(animal.y - animal.homeY) > 30) animal.vy += (animal.homeY - animal.y) * 0.08 * dt;
        if (Math.abs(animal.x - animal.homeX) > 30) animal.vx += (animal.homeX - animal.x) * 0.08 * dt;
      }

      // Face movement direction
      if (animal.vx > 0.5) animal.graphics.setScale(1, 1);
      else if (animal.vx < -0.5) animal.graphics.setScale(-1, 1);

      // Y-based depth (ground animals only; birds stay above)
      if (animal.type !== 'bird') {
        animal.graphics.setDepth(yDepth(animal.y));
      }

      // Update burrow mask position
      if (animal.burrowMaskShape) {
        animal.burrowMaskShape.clear();
        animal.burrowMaskShape.fillStyle(0xffffff);
        animal.burrowMaskShape.fillRect(animal.x - 30, animal.y - 100, 60, 100 + (animal.spriteH || 16) / 2 + 1);
      }

      // Soft repulsion from same-species
      for (const b of this.animals) {
        if (b === animal || b.type !== animal.type || b.state !== 'idle') continue;
        const rdx = animal.x - b.x;
        const rdy = animal.y - b.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        if (rdist < minDist && rdist > 0.1) {
          const push = (minDist - rdist) * 0.3;
          animal.x += (rdx / rdist) * push;
          animal.y += (rdy / rdist) * push * 0.3;
        }
      }

      // Species-specific idle animation
      this.animateIdle(animal, time, dt);

      // Leave tracks in snow (ground animals only, when moving)
      if (animal.type !== 'bird') {
        animal.trackTimer -= delta;
        const moved = Math.abs(animal.x - animal.lastTrackX) + Math.abs(animal.y - animal.lastTrackY);
        if (animal.trackTimer <= 0 && moved > 2) {
          this.placeTrack(animal);
          animal.trackTimer = TRACK_INTERVAL;
          animal.lastTrackX = animal.x;
          animal.lastTrackY = animal.y;
        }
      }
      // Fox predator effect: scare nearby prey animals
      if (animal.type === 'fox' && animal.state === 'idle') {
        for (const prey of this.animals) {
          if (prey === animal || prey.state !== 'idle') continue;
          if (prey.type === 'fox' || prey.type === 'bird') continue;
          const pdx = prey.x - animal.x;
          const pdy = prey.y - animal.y;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pdist < FOX.SCARE_RADIUS) {
            this.startFlee(prey, pdx, pdy);
          }
        }
      }
    }

    // Age and cleanup tracks
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const track = this.tracks[i];
      track.age += delta;
      const fade = 1 - track.age / TRACK_LIFETIME;
      if (fade <= 0) {
        track.image.destroy();
        this.tracks.splice(i, 1);
      } else {
        track.image.setAlpha(fade * 0.5);
      }
    }
  }

  private placeTrack(animal: Animal): void {
    // Cap total tracks
    if (this.tracks.length >= MAX_TRACKS) {
      const oldest = this.tracks.shift();
      if (oldest) oldest.image.destroy();
    }

    const key = `track_${animal.type}`;
    const angle = Math.atan2(animal.vy, animal.vx);

    const img = this.scene.add.image(animal.x, animal.y, key);
    img.setDepth(DEPTHS.PISTE + 0.5);
    img.setRotation(angle);
    img.setAlpha(0.5);
    this.tracks.push({ image: img, age: 0, x: animal.x, y: animal.y });
  }

  private pickWanderAction(animal: Animal): void {
    switch (animal.type) {
      case 'bunny':
        // Energetic hop bursts — continue roughly same direction
        if (Math.random() < 0.65) {
          const prevAngle = Math.atan2(animal.vy || 0.1, animal.vx || (Math.random() - 0.5));
          const newAngle = prevAngle + (Math.random() - 0.5) * 1.2;
          const speed = 40 + Math.random() * 70;
          animal.vx = Math.cos(newAngle) * speed;
          animal.vy = Math.sin(newAngle) * speed * 0.4;
          animal.wanderTimer = 400 + Math.random() * 600;
        } else {
          animal.vx = 0; animal.vy = 0;
          animal.wanderTimer = 200 + Math.random() * 500;
        }
        break;
      case 'chamois':
        // Alert walk-stop pattern, occasional herd relocation
        if (Math.random() < 0.1) {
          // Herd relocation — pick a new area, all chamois follow
          const newX = animal.boundLeft + Math.random() * (animal.boundRight - animal.boundLeft);
          const newY = animal.boundTop + Math.random() * (animal.boundBottom - animal.boundTop);
          for (const c of this.animals) {
            if (c.type !== 'chamois') continue;
            c.homeX = newX + (Math.random() - 0.5) * 40;
            c.homeY = newY + (Math.random() - 0.5) * 20;
          }
          const angle = Math.atan2(newY - animal.y, newX - animal.x);
          animal.vx = Math.cos(angle) * 45;
          animal.vy = Math.sin(angle) * 15;
          animal.wanderTimer = 1500 + Math.random() * 1500;
        } else if (Math.random() < 0.45) {
          animal.vx = (Math.random() - 0.5) * 35;
          animal.vy = (Math.random() - 0.5) * 15;
          animal.wanderTimer = 1000 + Math.random() * 2000;
        } else {
          animal.vx = 0; animal.vy = 0;
          animal.wanderTimer = 1500 + Math.random() * 3000;
        }
        break;
      case 'marmot':
        // Waddle near home, long sunbathing pauses
        if (Math.random() < 0.35) {
          animal.vx = (Math.random() - 0.5) * 20;
          animal.vy = (Math.random() - 0.5) * 10;
          animal.wanderTimer = 400 + Math.random() * 800;
        } else {
          animal.vx = 0; animal.vy = 0;
          animal.wanderTimer = 2000 + Math.random() * 4000;
        }
        break;
      case 'bouquetin':
        // Slow deliberate movement
        if (Math.random() < 0.3) {
          animal.vx = (Math.random() - 0.5) * 15;
          animal.vy = (Math.random() - 0.5) * 8;
          animal.wanderTimer = 800 + Math.random() * 1500;
        } else {
          animal.vx = 0; animal.vy = 0;
          animal.wanderTimer = 2000 + Math.random() * 3000;
        }
        break;
      case 'bird': {
        // Alpine choughs: soar in wide arcs, change direction, vary speed
        const prevAngle = Math.atan2(animal.vy, animal.vx || 1);
        // Gentle turn — birds arc rather than fly straight
        const turnRate = (Math.random() - 0.5) * 0.6;
        const newAngle = prevAngle + turnRate;
        const speed = 6 + Math.random() * 10;
        animal.vx = Math.cos(newAngle) * speed;
        animal.vy = Math.sin(newAngle) * speed * 0.6;
        animal.wanderTimer = 1500 + Math.random() * 2500;
        break;
      }
      case 'fox': {
        let nearestDist = Infinity;
        let huntAngle = 0;
        for (const prey of this.animals) {
          if (prey === animal || prey.state !== 'idle') continue;
          if (prey.type === 'fox' || prey.type === 'bird') continue;
          const d = Math.sqrt((prey.x - animal.x) ** 2 + (prey.y - animal.y) ** 2);
          if (d < nearestDist) {
            nearestDist = d;
            huntAngle = Math.atan2(prey.y - animal.y, prey.x - animal.x);
          }
        }
        const decision = foxHuntDecision(nearestDist, huntAngle, animal.vx, animal.vy);
        animal.vx = decision.vx;
        animal.vy = decision.vy;
        animal.wanderTimer = decision.wanderTimer;
        break;
      }
    }
  }

  private animateIdle(animal: Animal, time: number, _dt: number): void {
    switch (animal.type) {
      case 'bunny':
        if (Math.abs(animal.vx) > 5) {
          animal.hopPhase += _dt * 10;
          const hop = -Math.abs(Math.sin(animal.hopPhase)) * 3;
          animal.graphics.setPosition(animal.x, animal.y + hop);
        } else {
          const twitch = Math.sin(time / 200 + animal.homeX) * 0.3;
          animal.graphics.setPosition(animal.x, animal.y + twitch);
        }
        break;
      case 'chamois':
        if (Math.abs(animal.vx) > 3) {
          const stride = Math.sin(time / 250 + animal.homeX) * 0.8;
          animal.graphics.setPosition(animal.x, animal.y + stride);
        } else {
          const alert = Math.sin(time / 800 + animal.homeX) * 0.4;
          animal.graphics.setPosition(animal.x, animal.y + alert);
        }
        break;
      case 'marmot':
        if (Math.abs(animal.vx) > 2) {
          const waddle = Math.sin(time / 150 + animal.homeX) * 0.6;
          animal.graphics.setPosition(animal.x + waddle * 0.3, animal.y);
        } else {
          const sentinel = Math.sin(time / 600 + animal.homeX) * 0.5;
          animal.graphics.setPosition(animal.x, animal.y + sentinel);
        }
        break;
      case 'bouquetin':
        if (Math.abs(animal.vx) > 2) {
          animal.hopPhase += _dt * 5;
          const hopArc = -Math.abs(Math.sin(animal.hopPhase)) * 2;
          animal.graphics.setPosition(animal.x, animal.y + hopArc);
        } else {
          const graze = Math.sin(time / 500 + animal.homeX) * 0.3;
          animal.graphics.setPosition(animal.x, animal.y + graze);
        }
        break;
      case 'bird': {
        // Soaring: maintain forward speed with smooth arcing turns
        const speed = Math.sqrt(animal.vx * animal.vx + animal.vy * animal.vy);
        if (speed < 5) {
          const boost = 8 / Math.max(speed, 0.1);
          animal.vx *= boost;
          animal.vy *= boost;
        }
        const turnRate = Math.sin(time / 3000 + animal.homeX * 0.2) * 0.4;
        const heading = Math.atan2(animal.vy, animal.vx);
        const newHeading = heading + turnRate * _dt;
        const curSpeed = Math.sqrt(animal.vx * animal.vx + animal.vy * animal.vy);
        animal.vx = Math.cos(newHeading) * curSpeed;
        animal.vy = Math.sin(newHeading) * curSpeed;
        animal.graphics.setPosition(animal.x, animal.y);
        break;
      }
      case 'fox':
        // Lunge bounce when sprinting, smooth trot, sniffing when still
        if (Math.abs(animal.vx) > FOX.LUNGE_ANIM_THRESHOLD) {
          const leap = -Math.abs(Math.sin(time / 100 + animal.homeX)) * 3;
          animal.graphics.setPosition(animal.x, animal.y + leap);
        } else if (Math.abs(animal.vx) > 3) {
          const trot = Math.sin(time / 200 + animal.homeX) * 0.5;
          animal.graphics.setPosition(animal.x, animal.y + trot);
        } else {
          const sniff = Math.sin(time / 400 + animal.homeX) * 0.6;
          animal.graphics.setPosition(animal.x + sniff * 0.4, animal.y);
        }
        break;
    }
  }

  private startFlee(animal: Animal, dx: number, dy: number): void {
    this.onAnimalFlee?.(animal.type);

    if (animal.type === 'marmot') {
      // Marmot: dive into burrow
      animal.vx = 0; animal.vy = 0;
      animal.state = 'hiding';
      animal.hideDuration = 3000 + Math.random() * 2000;
      animal.hideTimer = animal.hideDuration;
      return;
    }

    animal.state = 'fleeing';
    animal.fleeTimer = 0;
    animal.hopPhase = 0;
    animal.fleeAngle = Math.atan2(dy, dx);

    if (animal.type === 'bird') {
      // Birds flee upward
      animal.fleeAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    }

    // Face flee direction
    if (Math.cos(animal.fleeAngle) < 0) {
      animal.graphics.setScale(-1, 1);
    } else {
      animal.graphics.setScale(1, 1);
    }
  }

  private updateFlee(animal: Animal, delta: number, dt: number, time: number): void {
    const spec = SPECIES[animal.type];
    const baseSpeed = BALANCE.WILDLIFE_FLEE_SPEED_BASE;
    const speed = baseSpeed * spec.speedMult;
    animal.fleeTimer += delta;

    let moveX = Math.cos(animal.fleeAngle) * speed * dt;
    let moveY = Math.sin(animal.fleeAngle) * speed * dt;

    switch (animal.type) {
      case 'bunny':
        // Zigzag escape hops
        animal.hopPhase += dt * 10;
        moveX += Math.sin(animal.fleeTimer * 0.008) * speed * 0.7 * dt;
        animal.graphics.setPosition(
          animal.x, animal.y - Math.abs(Math.sin(animal.hopPhase)) * 3
        );
        break;
      case 'chamois':
        // Explosive sprint — straight line, fast
        moveX *= 1.5;
        moveY *= 0.5;
        break;
      case 'bouquetin':
        // Deliberate hops away
        animal.hopPhase += dt * 6;
        animal.graphics.setPosition(
          animal.x, animal.y - Math.abs(Math.sin(animal.hopPhase)) * 4
        );
        break;
      case 'bird':
        // Fly away — no visual scaling
        break;
    }

    animal.x += moveX;
    animal.y += moveY;
    animal.graphics.setPosition(animal.x, animal.y);

    // After fleeing long enough, settle at new position
    if (animal.fleeTimer > 1500) {
      animal.state = 'idle';
      animal.homeX = animal.x;
      animal.homeY = animal.y;
      const spec2 = SPECIES[animal.type];
      const range = spec2.wanderRange || this.worldW * 0.4;
      animal.boundLeft = Math.max(0, animal.x - range);
      animal.boundRight = Math.min(this.worldW, animal.x + range);
      animal.boundTop = Math.max(0, animal.y - range * 0.5);
      animal.boundBottom = Math.min(this.worldH, animal.y + range * 0.5);
      animal.vx = 0; animal.vy = 0;
      animal.wanderTimer = 1000 + Math.random() * 2000;
    }
  }

  /** Count of visible (non-gone) animals */
  get activeCount(): number {
    return this.animals.filter(a => a.state !== 'gone').length;
  }

  /** Total spawned animals */
  get totalCount(): number {
    return this.animals.length;
  }

  reset(): void {
    for (const animal of this.animals) {
      if (animal.burrowMask) animal.graphics.clearMask(true);
      if (animal.burrowMaskShape) animal.burrowMaskShape.destroy();
      animal.graphics.destroy();
    }
    this.animals = [];
    for (const track of this.tracks) {
      track.image.destroy();
    }
    this.tracks = [];
    this.buildings = [];
    this.isOnCliff = null;
  }
}
