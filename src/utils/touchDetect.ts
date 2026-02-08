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

/** Returns true if the device supports touch input. */
export function hasTouch(): boolean {
  return touchDetected
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0);
}

/**
 * Register a callback to fire when touch is first detected at runtime.
 * If touch is already detected, the callback fires immediately.
 */
export function onTouchAvailable(cb: () => void): void {
  if (hasTouch()) {
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
