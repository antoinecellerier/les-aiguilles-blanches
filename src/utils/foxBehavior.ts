/** Shared fox hunting behavior constants and logic */

export const FOX = {
  HUNT_RANGE: 200,
  LUNGE_DIST: 80,
  LUNGE_PROB: 0.4,
  LUNGE_SPEED: { base: 120, range: 40 },
  LUNGE_TIMER: { base: 150, range: 150 },
  STALK_SPEED: { base: 35, range: 25 },
  STALK_TIMER: { base: 300, range: 500 },
  REST_PROB: 0.2,
  REST_TIMER: { base: 2000, range: 3000 },
  PATROL_SPEED: { base: 30, range: 25 },
  PATROL_TIMER: { base: 600, range: 1000 },
  SCARE_RADIUS: 100,
  LUNGE_ANIM_THRESHOLD: 60,
  VY_RATIO: 0.5,
  PATROL_VY_RATIO: 0.3,
} as const;

interface FoxDecision {
  vx: number;
  vy: number;
  wanderTimer: number;
}

/**
 * Decide fox movement: hunt/lunge/rest/patrol.
 * @param nearestDist - distance to nearest prey (Infinity if none)
 * @param huntAngle - angle toward nearest prey (ignored if no prey)
 * @param currentVx - fox's current vx (for patrol angle continuity)
 * @param currentVy - fox's current vy
 */
export function foxHuntDecision(
  nearestDist: number,
  huntAngle: number,
  currentVx: number,
  currentVy: number,
): FoxDecision {
  if (nearestDist < FOX.HUNT_RANGE) {
    if (nearestDist < FOX.LUNGE_DIST && Math.random() < FOX.LUNGE_PROB) {
      const speed = FOX.LUNGE_SPEED.base + Math.random() * FOX.LUNGE_SPEED.range;
      return {
        vx: Math.cos(huntAngle) * speed,
        vy: Math.sin(huntAngle) * speed * FOX.VY_RATIO,
        wanderTimer: FOX.LUNGE_TIMER.base + Math.random() * FOX.LUNGE_TIMER.range,
      };
    }
    const speed = FOX.STALK_SPEED.base + Math.random() * FOX.STALK_SPEED.range;
    return {
      vx: Math.cos(huntAngle) * speed,
      vy: Math.sin(huntAngle) * speed * FOX.VY_RATIO,
      wanderTimer: FOX.STALK_TIMER.base + Math.random() * FOX.STALK_TIMER.range,
    };
  }

  if (Math.random() < FOX.REST_PROB) {
    return {
      vx: 0, vy: 0,
      wanderTimer: FOX.REST_TIMER.base + Math.random() * FOX.REST_TIMER.range,
    };
  }

  const prevAngle = Math.atan2(currentVy || 0.1, currentVx || (Math.random() - 0.5));
  const newAngle = prevAngle + (Math.random() - 0.5) * 0.8;
  const speed = FOX.PATROL_SPEED.base + Math.random() * FOX.PATROL_SPEED.range;
  return {
    vx: Math.cos(newAngle) * speed,
    vy: Math.sin(newAngle) * speed * FOX.PATROL_VY_RATIO,
    wanderTimer: FOX.PATROL_TIMER.base + Math.random() * FOX.PATROL_TIMER.range,
  };
}
