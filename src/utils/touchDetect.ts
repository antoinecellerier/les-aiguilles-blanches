/**
 * Touch detection utility.
 * Firefox desktop doesn't expose ontouchstart or maxTouchPoints for touchscreen
 * devices. This module provides a reliable hasTouch() that also detects touch
 * via a one-time touchstart event listener.
 */

let touchDetected = false;

// Listen for first touch event as fallback for Firefox desktop
if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', () => { touchDetected = true; }, { once: true });
}

/** Returns true if the device supports touch input. */
export function hasTouch(): boolean {
  return touchDetected
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0);
}
