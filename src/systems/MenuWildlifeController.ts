import Phaser from 'phaser';
import { DEPTHS } from '../config/gameConfig';
import { drawAnimal, drawBirdPerched, drawBirdSideFlying, ANIMAL_GRID } from '../utils/animalSprites';
import { FOX, foxHuntDecision } from '../utils/foxBehavior';
import { playAnimalCall } from './WildlifeSounds';
import type { AnimalType } from '../utils/animalSprites';

interface MenuAnimal {
  sprite: Phaser.GameObjects.Image;
  x: number; y: number;
  homeX: number; homeY: number;
  vx: number; vy: number;
  wanderTimer: number;
  type: 'ground' | 'bird' | 'climber';
  species?: string;
  boundLeft: number; boundRight: number;
  state?: 'flying' | 'perched' | 'climbing' | 'landing' | 'hiding' | 'sleeping';
  lastFleeSound?: number;
  hideTimer?: number;
  hideDuration?: number;
  burrowY?: number;
  burrowMask?: Phaser.Display.Masks.GeometryMask;
  burrowMaskShape?: Phaser.GameObjects.Graphics;
  spriteH?: number;
  perchTarget?: { x: number; y: number };
  climbPath?: { x: number; y: number }[];
  climbIndex?: number;
  hopPhase?: number;
  trackTimer?: number;
  feetOffsetY?: number;
  sleepZzz?: Phaser.GameObjects.Text[];
}

export class MenuWildlifeController {
  private scene: Phaser.Scene;
  private snowflakes: { rect: Phaser.GameObjects.Rectangle; speed: number; wobbleOffset: number }[] = [];
  private menuAnimals: MenuAnimal[] = [];
  private perchSpots: { x: number; y: number }[] = [];
  private menuTracks: { image: Phaser.GameObjects.Image; age: number }[] = [];
  private readonly MENU_TRACK_LIFETIME = 12000;
  private readonly MENU_MAX_TRACKS = 40;

  snowLineY = 0;
  snowBottomY = 0;
  menuZone = { left: 0, right: 0, top: 0, bottom: 0 };
  /** When true, birds render behind the dark backdrop overlay (sub-menu scenes) */
  behindBackdrop = false;
  private weatherConfig = { isNight: false, weather: 'clear' };
  private generatedTexKeys: string[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(width: number, height: number, snowLineY: number, footerHeight: number, scaleFactor: number, weather?: { isNight: boolean; weather: string }): void {
    this.weatherConfig = weather || { isNight: false, weather: 'clear' };
    this.generateAnimalTextures(scaleFactor);
    this.createMenuWildlife(width, height, snowLineY, footerHeight, scaleFactor);
    this.createSnowParticles(width, snowLineY);
  }

  update(time: number, delta: number): void {
    this.updateSnowflakes(time, delta);
    this.updateWildlife(time, delta);
    this.updateTracks(delta);
    this.updateSleepZzz(time);
  }

  destroy(): void {
    for (const a of this.menuAnimals) {
      if (a.burrowMask) a.sprite.clearMask(true);
      if (a.burrowMaskShape) a.burrowMaskShape.destroy();
      if (a.sleepZzz) a.sleepZzz.forEach(z => z.destroy());
      a.sprite.destroy();
    }
    this.menuAnimals.length = 0;
    for (const t of this.menuTracks) t.image.destroy();
    this.menuTracks.length = 0;
    for (const key of this.generatedTexKeys) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
    this.generatedTexKeys.length = 0;
  }

  /** Pre-bake animal sprites into textures so they render as cheap Images. */
  private generateAnimalTextures(scaleFactor: number): void {
    const s = Math.max(2, 3 * scaleFactor);
    const NEAREST = Phaser.ScaleModes.NEAREST;
    const species: { name: string; type: AnimalType; grid: { w: number; h: number } }[] = [
      { name: 'marmot', type: 'marmot', grid: ANIMAL_GRID.marmot },
      { name: 'chamois', type: 'chamois', grid: ANIMAL_GRID.chamois },
      { name: 'bunny', type: 'bunny', grid: ANIMAL_GRID.bunny },
      { name: 'fox', type: 'fox', grid: ANIMAL_GRID.fox },
      { name: 'bouquetin', type: 'bouquetin', grid: ANIMAL_GRID.bouquetin },
    ];
    for (const sp of species) {
      const key = `menu_${sp.name}`;
      if (this.scene.textures.exists(key)) continue;
      const w = sp.grid.w * s + 2;
      const h = sp.grid.h * s + 2;
      const g = this.scene.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options, false);
      drawAnimal(g, sp.type, w / 2, h / 2, s);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = this.scene.textures.get(key);
      if (tex?.source?.[0]) tex.source[0].scaleMode = NEAREST;
      this.generatedTexKeys.push(key);
    }
    // Bird textures: flying and perched variants
    const birdScale = Math.max(1.5, 2 * scaleFactor);
    for (const [suffix, drawFn, grid] of [
      ['flying', drawBirdSideFlying, ANIMAL_GRID.bird_flying],
      ['perched', drawBirdPerched, ANIMAL_GRID.bird_perched],
    ] as const) {
      const key = `menu_bird_${suffix}`;
      if (this.scene.textures.exists(key)) continue;
      const w = grid.w * birdScale + 2;
      const h = grid.h * birdScale + 2;
      const g = this.scene.make.graphics({ x: 0, y: 0 } as Phaser.Types.GameObjects.Graphics.Options, false);
      drawFn(g, w / 2, h / 2, birdScale);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = this.scene.textures.get(key);
      if (tex?.source?.[0]) tex.source[0].scaleMode = NEAREST;
      this.generatedTexKeys.push(key);
    }
  }

  private updateSnowflakes(time: number, delta: number): void {
    for (const flake of this.snowflakes) {
      flake.rect.y += flake.speed * (delta / 16);
      flake.rect.x += Math.sin(time / 1000 + flake.wobbleOffset) * 0.3;
      if (flake.rect.y > this.snowLineY) {
        flake.rect.y = -4;
        flake.rect.x = Phaser.Math.Between(0, this.scene.cameras.main.width);
      }
    }
  }

  private updateWildlife(time: number, delta: number): void {
    const dt = delta / 1000;
    const width = this.scene.cameras.main.width;
    // Collect all active pointers (supports multitouch flee)
    const pointers = this.scene.input.manager?.pointers || [];
    const activePointers = pointers.filter((p: Phaser.Input.Pointer) => p.isDown || p.wasTouch);
    // Fallback to active pointer if no pressed pointers (mouse hover)
    if (activePointers.length === 0) activePointers.push(this.scene.input.activePointer);

    for (const a of this.menuAnimals) {
      // Sleeping animals: gentle breathing bob, no wandering
      if (a.state === 'sleeping') {
        const bob = Math.sin(time / 800 + a.homeX) * 0.5;
        a.sprite.setPosition(a.x, a.y + bob);
        continue;
      }
      // Find closest pointer to this animal
      let pdx = 0, pdy = 0, pointerDist = Infinity;
      for (const p of activePointers) {
        const dx = a.x - p.worldX;
        const dy = a.y - p.worldY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < pointerDist) { pdx = dx; pdy = dy; pointerDist = d; }
      }
      const fleeRadius = a.type === 'bird' ? 50 : 60;

      if (a.type === 'bird') {
        this.updateBird(a, time, delta, dt, width, pointerDist, pdx, pdy, fleeRadius);
      } else if (a.type === 'climber') {
        this.updateClimber(a, time, delta, dt, pointerDist, fleeRadius);
      } else {
        this.updateGroundAnimal(a, time, delta, dt, width, pointerDist, pdx, pdy, fleeRadius);
      }
    }
  }

  private updateBird(a: MenuAnimal, time: number, delta: number, dt: number, width: number, pointerDist: number, pdx: number, pdy: number, fleeRadius: number): void {
    // Pointer scares birds — set flee velocity, transition perched→flying
    if (pointerDist < fleeRadius) {
      const fleeAngle = Math.atan2(pdy, pdx);
      if (a.state === 'perched' || a.state === 'landing') {
        a.state = 'flying';
        a.sprite.setTexture('menu_bird_flying');
        const now = Date.now();
        if (!a.lastFleeSound || now - a.lastFleeSound > 1000) {
          a.lastFleeSound = now;
          playAnimalCall('bird');
        }
      }
      a.vx = Math.cos(fleeAngle) * 60;
      a.vy = Math.sin(fleeAngle) * 30 - 10;
      if (a.vx > 0.5) a.sprite.setScale(1, 1);
      else if (a.vx < -0.5) a.sprite.setScale(-1, 1);
      a.wanderTimer = 2000 + Math.random() * 3000;
    }

    if (a.state === 'perched') {
      // Perched: sit still with tiny bob, take off after timer
      a.wanderTimer -= delta;
      const bob = Math.sin(time / 400 + a.homeX) * 0.3;
      a.sprite.setPosition(a.x, a.y + bob);
      a.sprite.setRotation(0);
      if (a.wanderTimer <= 0) {
        a.state = 'flying';
        a.sprite.setTexture('menu_bird_flying');
        const takeoffAngle = (Math.random() - 0.5) * Math.PI * 0.8;
        const takeoffSpeed = 8 + Math.random() * 6;
        a.vx = Math.cos(takeoffAngle) * takeoffSpeed;
        a.vy = -2 - Math.random() * 3;
        if (a.vx > 0.5) a.sprite.setScale(1, 1);
        else if (a.vx < -0.5) a.sprite.setScale(-1, 1);
        a.wanderTimer = 2000 + Math.random() * 3000;
      }
    } else if (a.state === 'landing' && a.perchTarget) {
      // Glide toward perch target
      const ldx = a.perchTarget.x - a.x;
      const ldy = (a.perchTarget.y - 4) - a.y;
      const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
      if (ldist < 4) {
        a.x = a.perchTarget.x;
        a.y = a.perchTarget.y - 4;
        a.state = 'perched';
        a.vx = 0; a.vy = 0;
        a.sprite.setRotation(0);
        a.sprite.setScale(1, 1);
        a.sprite.setTexture('menu_bird_perched');
        a.wanderTimer = 3000 + Math.random() * 5000;
      } else {
        a.vx += (ldx / ldist * 50 - a.vx) * dt * 2;
        a.vy += (ldy / ldist * 50 - a.vy) * dt * 2;
        if (a.vx > 0.5) a.sprite.setScale(1, 1);
        else if (a.vx < -0.5) a.sprite.setScale(-1, 1);
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.wanderTimer -= delta;
        if (a.wanderTimer <= 0) {
          a.state = 'flying';
          a.vx = 8; a.vy = -2;
          a.sprite.setScale(1, 1);
          a.wanderTimer = 3000 + Math.random() * 3000;
        }
      }
      a.sprite.setPosition(a.x, a.y);
    } else {
      // Flying: alpine chough soaring
      a.wanderTimer -= delta;
      if (a.wanderTimer <= 0) {
        if (Math.random() < 0.4 && this.perchSpots.length > 0) {
          let bestPerch: { x: number; y: number } | null = null;
          let bestDist = 150;
          for (const p of this.perchSpots) {
            if (p.x > this.menuZone.left && p.x < this.menuZone.right &&
                p.y > this.menuZone.top && p.y < this.menuZone.bottom) continue;
            const bdx = p.x - a.x;
            const bdy = (p.y - 4) - a.y;
            const bd = Math.sqrt(bdx * bdx + bdy * bdy);
            if (bd < bestDist) { bestDist = bd; bestPerch = p; }
          }
          if (bestPerch) {
            a.state = 'landing';
            a.perchTarget = bestPerch;
            const ldx2 = bestPerch.x - a.x;
            const ldy2 = (bestPerch.y - 4) - a.y;
            const ldist2 = Math.sqrt(ldx2 * ldx2 + ldy2 * ldy2);
            a.vx = (ldx2 / ldist2) * 40;
            a.vy = (ldy2 / ldist2) * 40;
            a.wanderTimer = 5000;
          }
        }
        if (a.state !== 'landing') {
          const prevAngle = Math.atan2(a.vy, a.vx || 1);
          const turnRate = (Math.random() - 0.5) * 0.6;
          const newAngle = prevAngle + turnRate;
          const speed = 6 + Math.random() * 10;
          a.vx = Math.cos(newAngle) * speed;
          a.vy = Math.sin(newAngle) * speed * 0.6;
          a.wanderTimer = 1500 + Math.random() * 2500;
        }
      }
      if (a.state === 'flying') {
        const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        if (speed < 5) {
          const boost = 8 / Math.max(speed, 0.1);
          a.vx *= boost;
          a.vy *= boost;
        }
        const turnRate = Math.sin(time / 3000 + a.homeX * 0.2) * 0.4;
        const heading = Math.atan2(a.vy, a.vx);
        const newHeading = heading + turnRate * dt;
        const curSpeed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        a.vx = Math.cos(newHeading) * curSpeed;
        a.vy = Math.sin(newHeading) * curSpeed;
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        if (a.vx > 0.5) a.sprite.setScale(1, 1);
        else if (a.vx < -0.5) a.sprite.setScale(-1, 1);
        const skyMin = this.snowLineY * 0.08;
        const skyMax = this.snowLineY * 0.55;
        if (a.y < skyMin) a.vy += 20 * dt;
        else if (a.y > skyMax) a.vy -= 30 * dt;
        if (a.x > width + 30) { a.x = -30; }
        else if (a.x < -30) { a.x = width + 30; }
      }
      a.sprite.setPosition(a.x, a.y);
    }
  }

  private updateClimber(a: MenuAnimal, time: number, delta: number, dt: number, pointerDist: number, fleeRadius: number): void {
    // Bouquetin climbing mountain: deliberate hop pattern
    if (pointerDist < fleeRadius && a.climbPath && a.climbIndex !== undefined) {
      a.climbIndex = (a.climbIndex + 1) % a.climbPath.length;
      a.wanderTimer = 0;
      const now = Date.now();
      if (!a.lastFleeSound || now - a.lastFleeSound > 1000) {
        a.lastFleeSound = now;
        playAnimalCall('bouquetin');
      }
    }
    if (a.climbPath && a.climbIndex !== undefined) {
      const target = a.climbPath[a.climbIndex];
      const cdx = target.x - a.x;
      const cdy = target.y - a.y;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
      const scared = pointerDist < 100;

      if (cdist < 3) {
        // At waypoint: stand still, slight head bob
        a.wanderTimer -= delta;
        a.hopPhase = 0;
        const graze = Math.sin(time / 400 + a.homeX) * 0.3;
        a.sprite.setPosition(a.x, a.y + graze);
        a.sprite.setDepth(1 + a.y * 0.001);
        if (a.wanderTimer <= 0) {
          a.climbIndex = (a.climbIndex + 1) % a.climbPath.length;
          a.wanderTimer = scared ? 200 : (800 + Math.random() * 2000);
          const next = a.climbPath[a.climbIndex];
          if (next.x > a.x) a.sprite.setScale(1, 1);
          else if (next.x < a.x) a.sprite.setScale(-1, 1);
        }
      } else {
        // Hop toward waypoint: fast burst with vertical arc
        const hopSpeed = scared ? 55 : 30;
        a.hopPhase = (a.hopPhase || 0) + dt * 6;
        const hopArc = -Math.abs(Math.sin(a.hopPhase)) * 4;
        a.x += (cdx / cdist) * hopSpeed * dt;
        a.y += (cdy / cdist) * hopSpeed * dt;
        if (a.y > this.snowLineY - 2) a.y = this.snowLineY - 2;
        a.sprite.setPosition(a.x, a.y + hopArc);
        a.sprite.setDepth(1 + a.y * 0.001);
      }
    }
  }

  private updateGroundAnimal(a: MenuAnimal, time: number, delta: number, dt: number, width: number, pointerDist: number, pdx: number, pdy: number, fleeRadius: number): void {
    // Marmots: dive into burrow when scared — slide down behind mask
    if (a.species === 'marmot' && a.state === 'hiding') {
      a.hideTimer = (a.hideTimer || 0) - delta;
      const sH = a.spriteH || 16;
      const dur = a.hideDuration || 3000;
      const progress = Math.min(1, Math.max(0, 1 - (a.hideTimer || 0) / dur));
      if (progress < 0.2) {
        const t = progress / 0.2;
        a.sprite.setPosition(a.x, a.homeY + t * sH);
      } else if (progress > 0.8) {
        const t = (progress - 0.8) / 0.2;
        a.sprite.setPosition(a.x, a.homeY + (1 - t) * sH);
      } else {
        a.sprite.setPosition(a.x, a.homeY + sH);
      }
      if ((a.hideTimer || 0) <= 0) {
        a.state = undefined;
        a.sprite.setPosition(a.x, a.y);
        a.wanderTimer = 1000 + Math.random() * 2000;
      }
      return; // skip normal updates while hiding
    } else if (pointerDist < fleeRadius) {
      const fleeAngle = Math.atan2(pdy, pdx);
      // Play flee sound (throttled per animal)
      const now = Date.now();
      if (a.species && (!a.lastFleeSound || now - a.lastFleeSound > 1000)) {
        a.lastFleeSound = now;
        playAnimalCall(a.species as AnimalType);
      }
      if (a.species === 'bunny') {
        a.vx = Math.cos(fleeAngle) * 120;
        a.vy = Math.sin(fleeAngle) * 50;
        a.wanderTimer = 300;
      } else if (a.species === 'chamois') {
        a.vx = Math.cos(fleeAngle) * 100;
        a.vy = Math.sin(fleeAngle) * 20;
        a.wanderTimer = 600;
      } else if (a.species === 'marmot') {
        a.vx = 0; a.vy = 0;
        a.state = 'hiding';
        a.hideDuration = 3000 + Math.random() * 2000;
        a.hideTimer = a.hideDuration;
      } else if (a.species === 'fox') {
        a.vx = Math.cos(fleeAngle) * 90;
        a.vy = Math.sin(fleeAngle) * 25;
        a.wanderTimer = 500;
      }
      if (a.vx > 0) a.sprite.setScale(1, 1);
      else a.sprite.setScale(-1, 1);
    } else {
      a.wanderTimer -= delta;
    }

    if (a.wanderTimer <= 0) {
      this.wanderDecision(a);
    }

    // Physics: position, boundary, depth
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    const sw = this.scene.scale.width;
    if (a.species === 'marmot') {
      if (a.x < a.boundLeft || a.x > a.boundRight) {
        a.vx = -a.vx;
        a.x = Phaser.Math.Clamp(a.x, a.boundLeft, a.boundRight);
      }
    } else {
      if (a.x < -20) { a.x = sw + 18; a.homeX = a.x; }
      else if (a.x > sw + 20) { a.x = -18; a.homeX = a.x; }
    }
    if (a.y < this.snowLineY + 5) { a.y = this.snowLineY + 5; a.vy = Math.abs(a.vy) * 0.5; }
    if (a.y > this.snowBottomY) { a.y = this.snowBottomY; a.vy = -Math.abs(a.vy) * 0.5; }
    const homePull = a.species === 'marmot' ? 0.5 : 0.08;
    if (Math.abs(a.y - a.homeY) > 30) a.vy += (a.homeY - a.y) * homePull * dt;
    if (a.vx > 0.5) a.sprite.setScale(1, 1);
    else if (a.vx < -0.5) a.sprite.setScale(-1, 1);
    a.sprite.setDepth(5 + (a.y + (a.feetOffsetY || 0)) * 0.001);

    // Update burrow mask to follow marmot position
    if (a.burrowMaskShape) {
      a.burrowMaskShape.clear();
      a.burrowMaskShape.fillStyle(0xffffff);
      a.burrowMaskShape.fillRect(a.x - 30, a.y - 100, 60, 100 + (a.spriteH || 16) / 2 + 1);
      a.burrowY = a.y;
    }

    // Soft repulsion: nudge apart from nearby same-species animals
    const minDist = 12;
    for (const b of this.menuAnimals) {
      if (b === a || b.type !== 'ground' || b.species !== a.species) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist > 0.1) {
        const push = (minDist - dist) * 0.3;
        a.x += (dx / dist) * push;
        a.y += (dy / dist) * push * 0.3;
      }
    }

    // Species-specific idle animation
    this.animateGroundAnimal(a, time, dt);

    // Fox scares nearby ground animals
    if (a.species === 'fox') {
      for (const prey of this.menuAnimals) {
        if (prey === a || prey.type !== 'ground' || prey.species === 'fox') continue;
        if (prey.state === 'hiding') continue;
        const fdx = prey.x - a.x;
        const fdy = prey.y - a.y;
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
        if (fdist < FOX.SCARE_RADIUS) {
          if (prey.species === 'marmot') {
            prey.vx = 0; prey.vy = 0;
            prey.state = 'hiding';
            prey.hideDuration = 4000 + Math.random() * 2000;
            prey.hideTimer = prey.hideDuration;
          } else {
            const fleeAngle = Math.atan2(fdy, fdx);
            prey.vx = Math.cos(fleeAngle) * 140;
            prey.vy = Math.sin(fleeAngle) * 40;
            prey.wanderTimer = 600;
          }
        }
      }
    }

    // Leave tracks on snow when moving
    if (Math.abs(a.vx) > 1 || Math.abs(a.vy) > 1) {
      a.trackTimer = (a.trackTimer || 0) - delta;
      if (a.trackTimer <= 0) {
        this.placeMenuTrack(a.x, a.y, a.species || 'marmot', a.vx, a.vy);
        a.trackTimer = 400;
      }
    }
  }

  private animateGroundAnimal(a: MenuAnimal, time: number, dt: number): void {
    if (a.species === 'bunny') {
      if (Math.abs(a.vx) > 5) {
        a.hopPhase = (a.hopPhase || 0) + dt * 10;
        const hop = -Math.abs(Math.sin(a.hopPhase)) * 3;
        a.sprite.setPosition(a.x, a.y + hop);
      } else {
        const twitch = Math.sin(time / 200 + a.homeX) * 0.3;
        a.sprite.setPosition(a.x, a.y + twitch);
      }
    } else if (a.species === 'chamois') {
      if (Math.abs(a.vx) > 3) {
        const stride = Math.sin(time / 250 + a.homeX) * 0.8;
        a.sprite.setPosition(a.x, a.y + stride);
      } else {
        const alert = Math.sin(time / 800 + a.homeX) * 0.4;
        a.sprite.setPosition(a.x, a.y + alert);
      }
    } else if (a.species === 'fox') {
      if (Math.abs(a.vx) > FOX.LUNGE_ANIM_THRESHOLD) {
        const leap = -Math.abs(Math.sin(time / 100 + a.homeX)) * 3;
        a.sprite.setPosition(a.x, a.y + leap);
      } else if (Math.abs(a.vx) > 3) {
        const trot = Math.sin(time / 200 + a.homeX) * 0.5;
        a.sprite.setPosition(a.x, a.y + trot);
      } else {
        const sniff = Math.sin(time / 400 + a.homeX) * 0.6;
        a.sprite.setPosition(a.x + sniff * 0.4, a.y);
      }
    } else {
      if (Math.abs(a.vx) > 2) {
        const waddle = Math.sin(time / 150 + a.homeX) * 0.6;
        a.sprite.setPosition(a.x + waddle * 0.3, a.y);
      } else {
        const sentinel = Math.sin(time / 600 + a.homeX) * 0.5;
        a.sprite.setPosition(a.x, a.y + sentinel);
      }
    }
  }

  private wanderDecision(a: MenuAnimal): void {
    if (a.species === 'bunny') {
      if (Math.random() < 0.65) {
        const prevAngle = Math.atan2(a.vy || 0.1, a.vx || (Math.random() - 0.5));
        const newAngle = prevAngle + (Math.random() - 0.5) * 1.2;
        const speed = 40 + Math.random() * 70;
        a.vx = Math.cos(newAngle) * speed;
        a.vy = Math.sin(newAngle) * speed * 0.3;
        a.wanderTimer = 400 + Math.random() * 600;
      } else {
        a.vx = 0; a.vy = 0;
        a.wanderTimer = 200 + Math.random() * 500;
      }
    } else if (a.species === 'chamois') {
      if (Math.random() < 0.1) {
        const newHomeX = 50 + Math.random() * (this.scene.scale.width - 100);
        const newHomeY = this.snowLineY + 10 + Math.random() * (this.snowBottomY - this.snowLineY - 20);
        for (const c of this.menuAnimals) {
          if (c.species !== 'chamois') continue;
          c.homeX = newHomeX + (Math.random() - 0.5) * 40;
          c.homeY = newHomeY + (Math.random() - 0.5) * 20;
        }
        const angle = Math.atan2(newHomeY - a.y, newHomeX - a.x);
        a.vx = Math.cos(angle) * 45;
        a.vy = Math.sin(angle) * 15;
        a.wanderTimer = 1500 + Math.random() * 1500;
      } else if (Math.random() < 0.45) {
        a.vx = (Math.random() - 0.5) * 35;
        a.vy = (Math.random() - 0.5) * 8;
        a.wanderTimer = 1000 + Math.random() * 2000;
      } else {
        a.vx = 0; a.vy = 0;
        a.wanderTimer = 1500 + Math.random() * 3000;
      }
    } else if (a.species === 'fox') {
      let nearestDist = Infinity;
      let huntAngle = 0;
      for (const prey of this.menuAnimals) {
        if (prey === a || prey.type !== 'ground' || prey.species === 'fox') continue;
        if (prey.state === 'hiding') continue;
        const d = Math.sqrt((prey.x - a.x) ** 2 + (prey.y - a.y) ** 2);
        if (d < nearestDist) {
          nearestDist = d;
          huntAngle = Math.atan2(prey.y - a.y, prey.x - a.x);
        }
      }
      const decision = foxHuntDecision(nearestDist, huntAngle, a.vx, a.vy);
      a.vx = decision.vx;
      a.vy = decision.vy;
      a.wanderTimer = decision.wanderTimer;
    } else {
      if (Math.random() < 0.35) {
        a.vx = (Math.random() - 0.5) * 20;
        a.vy = (Math.random() - 0.5) * 6;
        a.wanderTimer = 400 + Math.random() * 800;
      } else {
        a.vx = 0; a.vy = 0;
        a.wanderTimer = 2000 + Math.random() * 4000;
      }
    }
  }

  private updateTracks(delta: number): void {
    for (let i = this.menuTracks.length - 1; i >= 0; i--) {
      const t = this.menuTracks[i];
      t.age += delta;
      const fade = 1 - t.age / this.MENU_TRACK_LIFETIME;
      if (fade <= 0) {
        t.image.destroy();
        this.menuTracks.splice(i, 1);
      } else {
        t.image.setAlpha(fade * 0.5);
      }
    }
  }

  private placeMenuTrack(x: number, y: number, species: string, vx: number, vy: number): void {
    if (this.menuTracks.length >= this.MENU_MAX_TRACKS) {
      const oldest = this.menuTracks.shift();
      if (oldest) oldest.image.destroy();
    }
    const key = `track_${species}`;
    const angle = Math.atan2(vy, vx);
    const img = this.scene.add.image(x, y, key).setDepth(3.5).setRotation(angle).setAlpha(0.5);
    this.menuTracks.push({ image: img, age: 0 });
  }

  private createMenuWildlife(width: number, height: number, snowLineY: number, footerHeight: number, scaleFactor: number): void {
    const sx = width / 1024;
    const s = Math.max(2, 3 * scaleFactor);
    const mtnScale = snowLineY / 600;
    this.menuAnimals = [];
    const { isNight, weather } = this.weatherConfig;
    const isStorm = weather === 'storm';

    // Foreground snow area: from snowLineY to bottom minus footer
    const snowTop = snowLineY + 5;
    const snowBottom = height - footerHeight - 20;
    this.snowBottomY = snowBottom;

    // Feet offset: depth is based on bottom of sprite (feet), not center
    const feetOffset = (species: string) => {
      const grid = ANIMAL_GRID[species as keyof typeof ANIMAL_GRID];
      return grid ? (grid.h / 2) * s : 0;
    };

    const addGroundAnimal = (img: Phaser.GameObjects.Image, x: number, y: number, rangeX: number, species: string) => {
      const fo = feetOffset(species);
      img.setDepth(5 + (y + fo) * 0.001);
      this.menuAnimals.push({
        sprite: img, x, y, homeX: x, homeY: y,
        vx: 0, vy: 0, wanderTimer: Math.random() * 3000,
        type: 'ground', species,
        boundLeft: x - rangeX, boundRight: x + rangeX,
        hopPhase: 0,
        feetOffsetY: fo,
      });
    };

    // Perch spots: tree tops and mountain peaks (matching createMountains/createTrees positions)
    const treePerches = [
      { x: 100 * sx, y: snowLineY - 24 * scaleFactor },
      { x: 220 * sx, y: snowLineY - 22 * scaleFactor },
      { x: (width - 110 * sx), y: snowLineY - 24 * scaleFactor },
      { x: (width - 260 * sx), y: snowLineY - 20 * scaleFactor },
    ];
    const mountainPerches = [
      { x: 80 * sx,  y: snowLineY - 220 * mtnScale },   // Far left peak
      { x: 512 * sx, y: snowLineY - 300 * mtnScale },   // Center peak
      { x: 900 * sx, y: snowLineY - 260 * mtnScale },   // Far right peak
    ];
    const allPerches = [...treePerches, ...mountainPerches];
    this.perchSpots = allPerches;

    // Ground animal placement zones — left and right sides, avoiding center buttons
    // Randomized positions within zones
    const leftZone = { min: 60 * sx, max: 280 * sx };
    const rightZone = { min: width - 280 * sx, max: width - 60 * sx };
    const randInZone = (zone: { min: number; max: number }) =>
      zone.min + Math.random() * (zone.max - zone.min);

    // Storm shelter: animals huddle under a tree near the snowline
    const shelterTreeX = Math.random() < 0.5 ? 130 * sx : (width - 170 * sx);
    const shelterY = snowTop + 8;

    // Marmots: colony of 2-3, clustered together (family group near burrow)
    // At night or during storms, marmots hide in burrows (diurnal)
    const marmotCount = (isNight || isStorm) ? 0 : 2 + Math.floor(Math.random() * 2);
    const marmotZone = Math.random() < 0.5 ? rightZone : leftZone;
    const marmotClusterX = randInZone(marmotZone);
    for (let i = 0; i < marmotCount; i++) {
      const mg = this.scene.add.image(0, 0, 'menu_marmot');
      const mx = marmotClusterX + (i - marmotCount / 2) * 18 * scaleFactor + (Math.random() - 0.5) * 10;
      const my = snowTop + Math.random() * (snowBottom - snowTop);
      mg.setPosition(mx, my).setDepth(5 + (my + feetOffset('marmot')) * 0.001);
      // Burrow mask: clips marmot at ground level so it can slide down out of view
      const maskShape = this.scene.make.graphics({ x: 0, y: 0 });
      const halfH = 2 * s;   // sprite is centered; extends halfH above and below origin
      maskShape.fillStyle(0xffffff);
      // Mask: large above, bottom edge at sprite feet (homeY + halfH)
      maskShape.fillRect(mx - 30, my - 100, 60, 100 + halfH + 1);
      const burrowMask = maskShape.createGeometryMask();
      mg.setMask(burrowMask);
      const slideDistance = 4 * s + 4; // full sprite height + margin
      const animal: MenuAnimal = {
        sprite: mg, x: mx, y: my, homeX: mx, homeY: my,
        vx: 0, vy: 0, wanderTimer: Math.random() * 3000,
        type: 'ground' as const, species: 'marmot',
        boundLeft: mx - 20 * sx, boundRight: mx + 20 * sx,
        hopPhase: 0,
        burrowY: my,
        burrowMask,
        burrowMaskShape: maskShape,
        spriteH: slideDistance,
        feetOffsetY: feetOffset('marmot'),
      };
      this.menuAnimals.push(animal);
    }

    // Chamois: small herd of 2-3 (1 sheltering during storms, fewer at night)
    const chamoisCount = isStorm ? 1 : isNight ? 1 : 2 + Math.floor(Math.random() * 2);
    const chamoisZone = marmotZone === rightZone ? leftZone : rightZone;
    const chamoisClusterX = isStorm ? shelterTreeX : randInZone(chamoisZone);
    let chamoisClusterY = isStorm ? shelterY : snowTop + Math.random() * (snowBottom - snowTop);
    for (let i = 0; i < chamoisCount; i++) {
      const cg = this.scene.add.image(0, 0, 'menu_chamois');
      const cx = chamoisClusterX + (i - chamoisCount / 2) * 25 * scaleFactor + (Math.random() - 0.5) * 15;
      const cy = i === 0 ? chamoisClusterY : snowTop + Math.random() * (snowBottom - snowTop);
      if (i === 0) chamoisClusterY = cy;
      cg.setPosition(cx, cy).setDepth(5 + cy * 0.001);
      addGroundAnimal(cg, cx, cy, width * 0.4, 'chamois');
      if (isNight) {
        const sleeper = this.menuAnimals[this.menuAnimals.length - 1];
        sleeper.state = 'sleeping';
        sleeper.sleepZzz = this.createSleepZzz(cx, cy);
      }
    }

    // Bunny: solitary (mountain hares are loners)
    // During storms, huddles next to chamois under tree shelter
    {
      const bunnyZone = isStorm ? chamoisZone : (Math.random() < 0.5 ? leftZone : rightZone);
      const bunnyImg = this.scene.add.image(0, 0, 'menu_bunny');
      const bunnyX = isStorm
        ? shelterTreeX + 12 * scaleFactor
        : randInZone(bunnyZone);
      const bunnyY = isStorm
        ? shelterY + 3
        : snowTop + Math.random() * (snowBottom - snowTop);
      bunnyImg.setPosition(bunnyX, bunnyY).setDepth(5 + bunnyY * 0.001);
      addGroundAnimal(bunnyImg, bunnyX, bunnyY, isStorm ? 15 : width * 0.45, 'bunny');
    }

    // Fox: nocturnal — more common at night (~60%), rare by day (~30%), absent in storms
    const foxChance = isStorm ? 0 : isNight ? 0.6 : 0.3;
    if (Math.random() < foxChance) {
      const foxZone = Math.random() < 0.5 ? leftZone : rightZone;
      const foxImg = this.scene.add.image(0, 0, 'menu_fox');
      const foxX = randInZone(foxZone);
      const foxY = snowTop + Math.random() * (snowBottom - snowTop);
      foxImg.setPosition(foxX, foxY).setDepth(5 + foxY * 0.001);
      addGroundAnimal(foxImg, foxX, foxY, width * 0.4, 'fox');
    }

    // Bouquetin and birds
    this.createMenuClimbers(width, snowLineY, sx, mtnScale, s);
    this.createMenuBirds(width, snowLineY, scaleFactor, allPerches);
  }

  private createMenuClimbers(width: number, snowLineY: number, sx: number, mtnScale: number, s: number): void {
    // Bouquetin shelter during storms
    if (this.weatherConfig.weather === 'storm') return;
    const climbMtnX = 900 * sx;
    const climbMtnBaseW = 190 * mtnScale;
    const climbMtnPeakH = 260 * mtnScale;
    const climbBase = snowLineY - 4;
    const climbPeak = snowLineY - climbMtnPeakH * 0.85;
    for (let ib = 0; ib < 2; ib++) {
      const ibexImg = this.scene.add.image(0, 0, 'menu_bouquetin').setDepth(1.5);
      const climbPath: { x: number; y: number }[] = [];
      const climbSteps = 8;
      const flankOffset = 0.12 + ib * 0.12;
      for (let i = 0; i <= climbSteps; i++) {
        const t = i / climbSteps;
        const mtnWidthAtT = climbMtnBaseW * (1 - t * 0.85);
        const offset = mtnWidthAtT * (flankOffset + (i % 2) * 0.1);
        climbPath.push({
          x: climbMtnX + offset,
          y: climbBase - t * (climbBase - climbPeak),
        });
      }
      const startIdx = ib * 2;
      const startPt = climbPath[startIdx % climbPath.length];
      ibexImg.setPosition(startPt.x, startPt.y);
      this.menuAnimals.push({
        sprite: ibexImg, x: startPt.x, y: startPt.y,
        homeX: startPt.x, homeY: startPt.y,
        vx: 0, vy: 0, wanderTimer: ib * 1500,
        type: 'climber',
        boundLeft: 0, boundRight: width,
        state: 'climbing', climbPath, climbIndex: startIdx % climbPath.length,
      });
    }
  }

  private createMenuBirds(width: number, snowLineY: number, scaleFactor: number, allPerches: { x: number; y: number }[]): void {
    const { isNight, weather } = this.weatherConfig;
    const isStorm = weather === 'storm';
    const birdScale = Math.max(1.5, 2 * scaleFactor);
    // Fewer birds in bad weather; at night most are roosting
    const birdCount = isStorm ? 0 : isNight ? 2 : 4 + Math.floor(Math.random() * 4);
    // At night, all birds start perched (roosting)
    const perchedCount = isNight ? birdCount : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < birdCount; i++) {
      const startPerched = i < perchedCount;
      let bx: number, by: number;
      let state: 'flying' | 'perched' | 'sleeping';
      let texKey: string;

      if (startPerched) {
        const perch = allPerches[i % allPerches.length];
        bx = perch.x;
        by = perch.y - 4;
        state = isNight ? 'sleeping' : 'perched';
        texKey = 'menu_bird_perched';
      } else {
        bx = Math.random() * width;
        by = snowLineY * (0.1 + Math.random() * 0.4);
        state = 'flying';
        texKey = 'menu_bird_flying';
      }

      const birdDepth = this.behindBackdrop ? DEPTHS.MENU_TREES + by * 0.001 : 11;
      const birdImg = this.scene.add.image(bx, by, texKey).setDepth(birdDepth);
      const initAngle = (Math.random() - 0.5) * Math.PI * 0.8;
      const initSpeed = 6 + Math.random() * 10;
      this.menuAnimals.push({
        sprite: birdImg, x: bx, y: by, homeX: bx, homeY: by,
        vx: state === 'flying' ? Math.cos(initAngle) * initSpeed : 0,
        vy: state === 'flying' ? Math.sin(initAngle) * initSpeed * 0.5 : 0,
        wanderTimer: state === 'flying' ? 1500 + Math.random() * 2000 : 3000 + Math.random() * 5000,
        type: 'bird',
        boundLeft: -20, boundRight: width + 20,
        state,
        perchTarget: allPerches[i % allPerches.length],
        spriteH: birdScale,
        sleepZzz: state === 'sleeping' ? this.createSleepZzz(bx, by) : undefined,
      });
    }
  }

  private createSnowParticles(width: number, snowLineY: number): void {
    for (let i = 0; i < 40; i++) {
      const size = Phaser.Math.Between(2, 4);
      const rect = this.scene.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(-20, snowLineY),
        size, size, 0xffffff
      ).setAlpha(Phaser.Math.FloatBetween(0.3, 0.8));
      this.snowflakes.push({
        rect,
        speed: Phaser.Math.FloatBetween(0.3, 1.2),
        wobbleOffset: Phaser.Math.FloatBetween(0, Math.PI * 2),
      });
    }
  }

  /** Transition animals to/from sleeping for atmosphere cycling */
  setNightMode(isNight: boolean): void {
    for (const a of this.menuAnimals) {
      if (isNight) {
        // Put non-fox ground animals and perched/flying birds to sleep
        if (a.type === 'ground' && a.species !== 'fox' && a.state !== 'sleeping' && a.state !== 'hiding') {
          a.state = 'sleeping';
          a.vx = 0; a.vy = 0;
          if (!a.sleepZzz) a.sleepZzz = this.createSleepZzz(a.x, a.y);
        } else if (a.type === 'bird' && a.state !== 'sleeping') {
          // Land birds on their perch then sleep
          if (a.perchTarget) {
            a.x = a.perchTarget.x; a.y = a.perchTarget.y - 4;
            a.sprite.setPosition(a.x, a.y);
          }
          a.state = 'sleeping';
          a.vx = 0; a.vy = 0;
          a.sprite.setTexture('menu_bird_perched');
          a.sprite.setRotation(0);
          if (!a.sleepZzz) a.sleepZzz = this.createSleepZzz(a.x, a.y);
        }
      } else {
        // Wake everyone up
        if (a.state === 'sleeping') {
          if (a.sleepZzz) { a.sleepZzz.forEach(z => z.destroy()); a.sleepZzz = undefined; }
          if (a.type === 'bird') {
            a.state = 'flying';
            a.sprite.setTexture('menu_bird_flying');
            a.vx = (Math.random() - 0.5) * 12;
            a.vy = -2 - Math.random() * 3;
            a.wanderTimer = 2000 + Math.random() * 3000;
          } else {
            a.state = undefined;
            a.wanderTimer = 500 + Math.random() * 2000;
          }
        }
      }
    }
  }

  /** Create floating "zzz" text trail above a sleeping animal */
  private createSleepZzz(x: number, y: number): Phaser.GameObjects.Text[] {
    const zTexts: Phaser.GameObjects.Text[] = [];
    const sizes = [8, 10, 13];
    for (let i = 0; i < 3; i++) {
      const zDepth = this.behindBackdrop ? DEPTHS.MENU_TREES + y * 0.001 : 12;
      const z = this.scene.add.text(x + 6, y - 8, 'z', {
        fontFamily: 'monospace',
        fontSize: sizes[i] + 'px',
        fontStyle: 'italic',
        color: '#aaccff',
      }).setOrigin(0.5).setAlpha(0).setDepth(zDepth);
      // Stagger via custom data
      z.setData('phase', i * 0.33); // 0, 0.33, 0.66 — staggered start
      zTexts.push(z);
    }
    return zTexts;
  }

  /** Animate floating zzz: each "z" rises, grows, fades, then loops */
  private updateSleepZzz(time: number): void {
    const cycleMs = 3000;
    for (const a of this.menuAnimals) {
      if (a.state !== 'sleeping' || !a.sleepZzz) continue;
      for (const z of a.sleepZzz) {
        const phase = z.getData('phase') as number;
        const t = ((time / cycleMs + phase) % 1); // 0→1 per cycle
        // Rise from 0→-20px, fade in then out
        z.setPosition(a.x + 6 + t * 4, a.y - 8 - t * 20);
        const alpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
        z.setAlpha(alpha * 0.7);
        z.setScale(0.7 + t * 0.5);
      }
    }
  }
}
