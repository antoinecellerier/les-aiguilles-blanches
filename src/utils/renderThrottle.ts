/**
 * Adaptive Render Throttle
 *
 * Monitors FPS via a rolling average. Exposes throttle state that
 * scenes can query to skip expensive work on low-FPS frames.
 *
 * Currently passive — does NOT override Game.step(). The Game.step()
 * override approach caused Firefox to freeze, so we use a lightweight
 * POST_STEP listener instead.
 */

const FPS_WINDOW = 30;          // frames for rolling average
const DROP_THRESHOLD = 45;      // report throttled below this
const RESTORE_THRESHOLD = 55;   // clear throttled above this
const SETTLE_FRAMES = 90;       // ignore first N frames after scene change

let installed = false;
let throttled = false;
let settleCountdown = SETTLE_FRAMES;

// Rolling FPS buffer
const fpsSamples: number[] = [];
let sampleIndex = 0;

function rollingAvgFps(): number {
  if (fpsSamples.length === 0) return 60;
  let sum = 0;
  for (let i = 0; i < fpsSamples.length; i++) sum += fpsSamples[i];
  return sum / fpsSamples.length;
}

/**
 * Install the passive FPS monitor on a Phaser Game instance.
 * Safe to call multiple times — only installs once.
 */
export function installRenderThrottle(game: Phaser.Game): void {
  if (installed) return;
  installed = true;

  // Lightweight: just sample FPS each frame via POST_STEP
  game.events.on('poststep', () => {
    const currentFps = game.loop.actualFps;
    if (fpsSamples.length < FPS_WINDOW) {
      fpsSamples.push(currentFps);
    } else {
      fpsSamples[sampleIndex] = currentFps;
    }
    sampleIndex = (sampleIndex + 1) % FPS_WINDOW;

    if (settleCountdown > 0) {
      settleCountdown--;
    } else {
      const avg = rollingAvgFps();
      if (!throttled && avg < DROP_THRESHOLD) {
        throttled = true;
      } else if (throttled && avg > RESTORE_THRESHOLD) {
        throttled = false;
      }
    }
  });

  // Expose on window for Playwright probing
  (window as unknown as Record<string, unknown>).__renderThrottle = {
    get throttled() { return throttled; },
    get avgFps() { return rollingAvgFps(); },
  };
}

/** Reset the settle countdown (call after scene transitions). */
export function resetSettleFrames(): void {
  settleCountdown = SETTLE_FRAMES;
  throttled = false;
  fpsSamples.length = 0;
  sampleIndex = 0;
}

/** Check whether rendering is currently throttled. */
export function isRenderThrottled(): boolean {
  return throttled;
}
