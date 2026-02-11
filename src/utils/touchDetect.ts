/**
 * Touch detection utility.
 * Firefox desktop doesn't expose ontouchstart or maxTouchPoints for touchscreen
 * devices. This module provides a reliable hasTouch() that also detects touch
 * via a touchstart event listener on the canvas (window-level listeners are
 * blocked by Phaser's TouchManager calling preventDefault on canvas touches).
 */

let touchDetected = false;
let listenerAttached = false;
const onDetectCallbacks: Array<() => void> = [];

function onTouchDetected() {
  if (touchDetected) return;
  touchDetected = true;
  for (const cb of onDetectCallbacks) cb();
  onDetectCallbacks.length = 0;
}

// Capture-phase listener on window fires before Phaser's preventDefault
if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', onTouchDetected, { capture: true, once: true });
}

/** Returns true if a real touch event was observed at runtime. */
export function touchConfirmed(): boolean {
  return touchDetected;
}

/** Returns true if the device supports touch input. */
export function hasTouch(): boolean {
  return touchDetected
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0);
}

/**
 * Register a callback to fire when touch is first detected at runtime.
 * If touch was already confirmed at runtime, the callback fires immediately.
 * Unlike hasTouch(), this waits for an actual touchstart event, not just capability.
 */
export function onTouchAvailable(cb: () => void): void {
  if (touchDetected) {
    cb();
  } else {
    onDetectCallbacks.push(cb);
  }
}

/**
 * Attach a touchstart listener directly to the game canvas as a fallback.
 * Call once after Phaser creates the canvas element.
 */
export function attachCanvasTouchDetect(canvas: HTMLCanvasElement): void {
  if (listenerAttached) return;
  listenerAttached = true;
  canvas.addEventListener('touchstart', onTouchDetected, { once: true });
}

/** Returns true if the device is a mobile phone or tablet (UA-based heuristic). */
export function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
