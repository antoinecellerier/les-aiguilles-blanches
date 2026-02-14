import type { Level } from '../setup';

export interface PistePath {
  centerX: number;
  width: number;
}

export interface SteepZoneRect {
  startY: number;
  endY: number;
  leftX: number;
  rightX: number;
  slope: number;
  /** Per-row piste-aware bounds with inward margin for leniency. */
  getBounds: (y: number) => { leftX: number; rightX: number };
}

export interface AccessPathRect {
  startY: number;
  endY: number;
  leftX: number;
  rightX: number;
  side: 'left' | 'right';
  pathIndex: number;
}

export interface AccessEntryZone {
  y: number;
  side: string;
  startY: number;
  endY: number;
}

export interface CliffSegment {
  side: 'left' | 'right';
  startY: number;
  endY: number;
  offset: number;
  extent: number;
  getX: (y: number) => number;
  /** Per-row cliff bounds matching visual rendering (includes rowVariation). */
  getBounds: (y: number) => { cliffStart: number; cliffEnd: number };
}

export interface AccessPathCurve {
  leftEdge: { x: number; y: number }[];
  rightEdge: { x: number; y: number }[];
}

/**
 * Pure-data system for piste path generation and geometric queries.
 * No Phaser dependency — all methods operate on tile/pixel coordinates.
 */
export class LevelGeometry {
  pistePath: PistePath[] = [];
  steepZoneRects: SteepZoneRect[] = [];
  accessPathRects: AccessPathRect[] = [];
  accessEntryZones: AccessEntryZone[] = [];
  accessPathCurves: AccessPathCurve[] = [];
  cliffSegments: CliffSegment[] = [];

  generate(level: Level, tileSize: number): void {
    this.generatePistePath(level);
    this.calculateAccessPathZones(level, tileSize);
    this.calculateCliffSegments(level, tileSize);
    this.calculateAccessPathGeometry(level, tileSize);
  }

  reset(): void {
    this.pistePath = [];
    this.steepZoneRects = [];
    this.accessPathRects = [];
    this.accessEntryZones = [];
    this.accessPathCurves = [];
    this.cliffSegments = [];
  }

  /** Get left and right pixel edges for a piste path row. */
  pathEdges(path: PistePath, tileSize: number): { left: number; right: number } {
    return {
      left: (path.centerX - path.width / 2) * tileSize,
      right: (path.centerX + path.width / 2) * tileSize,
    };
  }

  isInPiste(x: number, y: number, level: Level): boolean {
    if (y < 3 || y >= level.height - 2) return false;
    if (!this.pistePath || !this.pistePath[y]) return true;
    const path = this.pistePath[y];
    const halfWidth = path.width / 2;
    return x >= path.centerX - halfWidth && x < path.centerX + halfWidth;
  }

  /** Check if tile is within `buffer` tiles of the piste edge (packed snow shoulder). */
  isNearPiste(x: number, y: number, level: Level, buffer: number): boolean {
    if (y < 3 || y >= level.height - 2) return false;
    if (!this.pistePath || !this.pistePath[y]) return true;
    const path = this.pistePath[y];
    const halfWidth = path.width / 2 + buffer;
    return x >= path.centerX - halfWidth && x < path.centerX + halfWidth;
  }

  isOnCliff(x: number, y: number): boolean {
    if (!this.cliffSegments || this.cliffSegments.length === 0) return false;
    for (const cliff of this.cliffSegments) {
      if (y < cliff.startY || y > cliff.endY) continue;
      const { cliffStart, cliffEnd } = cliff.getBounds(y);
      if (x >= cliffStart && x <= cliffEnd) return true;
    }
    return false;
  }

  /** Get bounding rects for cliff segments (for avalanche zone avoidance). */
  getCliffAvoidRects(tileSize: number): { startY: number; endY: number; leftX: number; rightX: number }[] {
    const rects: { startY: number; endY: number; leftX: number; rightX: number }[] = [];
    for (const cliff of this.cliffSegments) {
      // Sample getX at start/end to find X bounds
      const edgeStart = cliff.getX(cliff.startY);
      const edgeMid = cliff.getX((cliff.startY + cliff.endY) / 2);
      const edgeEnd = cliff.getX(cliff.endY);
      if (cliff.side === 'left') {
        const maxEdge = Math.max(edgeStart, edgeMid, edgeEnd);
        const cliffEnd = maxEdge - cliff.offset;
        const cliffStart = cliffEnd - cliff.extent;
        rects.push({ startY: cliff.startY, endY: cliff.endY, leftX: cliffStart - tileSize, rightX: cliffEnd + tileSize });
      } else {
        const minEdge = Math.min(edgeStart, edgeMid, edgeEnd);
        const cliffStart = minEdge + cliff.offset;
        const cliffEnd = cliffStart + cliff.extent;
        rects.push({ startY: cliff.startY, endY: cliff.endY, leftX: cliffStart - tileSize, rightX: cliffEnd + tileSize });
      }
    }
    return rects;
  }

  isOnAccessPath(x: number, y: number): boolean {
    if (!this.accessPathRects) return false;
    for (const rect of this.accessPathRects) {
      if (y >= rect.startY && y <= rect.endY &&
        x >= rect.leftX && x <= rect.rightX) {
        return true;
      }
    }
    return false;
  }

  private generatePistePath(level: Level): void {
    const shape = level.pisteShape || 'straight';
    const pisteWidth = level.pisteWidth || 0.5;
    const worldWidth = level.width;
    const worldHeight = level.height;
    const halfWidth = Math.floor(worldWidth * pisteWidth / 2);

    this.pistePath = [];

    for (let y = 0; y < worldHeight; y++) {
      const progress = y / worldHeight;
      let centerX = worldWidth / 2;
      let width = halfWidth * 2;

      switch (shape) {
        case 'straight':
          break;
        case 'gentle_curve':
          centerX += Math.sin(progress * Math.PI * 2) * (worldWidth * 0.15);
          break;
        case 'winding':
          centerX += Math.sin(progress * Math.PI * 3) * (worldWidth * 0.2);
          width = halfWidth * 2 * (0.8 + 0.2 * Math.cos(progress * Math.PI * 3));
          break;
        case 'serpentine':
          centerX += Math.sin(progress * Math.PI * 4) * (worldWidth * 0.25);
          width = halfWidth * 2 * (0.7 + 0.3 * Math.abs(Math.cos(progress * Math.PI * 4)));
          break;
        case 'wide':
          width = halfWidth * 2.5;
          break;
      }

      this.pistePath.push({
        centerX: Math.max(halfWidth + 3, Math.min(worldWidth - halfWidth - 3, centerX)),
        width: Math.max(6, Math.floor(width))
      });
    }
  }

  private calculateAccessPathZones(level: Level, tileSize: number): void {
    const accessPaths = level.accessPaths || [];
    this.accessEntryZones = [];
    if (accessPaths.length === 0) return;

    const worldHeight = level.height * tileSize;
    const gapWidth = tileSize * 8;

    accessPaths.forEach(path => {
      const entryY = path.endY * worldHeight;
      const exitY = path.startY * worldHeight;

      this.accessEntryZones.push({
        y: entryY, side: path.side,
        startY: entryY - gapWidth, endY: entryY + gapWidth
      });
      this.accessEntryZones.push({
        y: exitY, side: path.side,
        startY: exitY - gapWidth, endY: exitY + gapWidth
      });
    });
  }

  private calculateCliffSegments(level: Level, tileSize: number): void {
    if (!level.hasDangerousBoundaries) return;

    this.cliffSegments = [];
    const worldWidth = level.width * tileSize;
    const worldHeight = level.height * tileSize;

    // On levels with avalanche hazards, limit cliffs to top/bottom bands
    // to leave the middle (0.15–0.65) clear for avalanche zone placement
    const hasAvalanche = level.hazards?.includes('avalanche');
    const cliffFreeTop = hasAvalanche ? worldHeight * 0.15 : 0;
    const cliffFreeBottom = hasAvalanche ? worldHeight * 0.65 : worldHeight;

    const rand = (seed: number) => {
      const n = Math.sin(seed * 127.1) * 43758.5453;
      return n - Math.floor(n);
    };

    type EdgeData = { y: number; x: number };
    const leftEdges: EdgeData[] = [];
    const rightEdges: EdgeData[] = [];
    let leftStart: number | null = null;
    let rightStart: number | null = null;

    for (let y = 3; y < level.height - 2; y++) {
      const path = this.pistePath[y];
      if (!path) continue;

      const { left: leftEdge, right: rightEdge } = this.pathEdges(path, tileSize);
      const yPos = y * tileSize;

      const isLeftAccess = (this.accessEntryZones?.some(z =>
        z.side === 'left' && yPos >= z.startY - tileSize * 2 && yPos <= z.endY + tileSize * 2
      )) || (this.accessPathRects?.some(r =>
        r.side === 'left' && yPos >= r.startY && yPos <= r.endY
      ));
      const isRightAccess = (this.accessEntryZones?.some(z =>
        z.side === 'right' && yPos >= z.startY - tileSize * 2 && yPos <= z.endY + tileSize * 2
      )) || (this.accessPathRects?.some(r =>
        r.side === 'right' && yPos >= r.startY && yPos <= r.endY
      ));

      const hasLeftCliff = leftEdge > tileSize && !isLeftAccess &&
        !(hasAvalanche && yPos >= cliffFreeTop && yPos <= cliffFreeBottom);
      if (hasLeftCliff) {
        if (leftStart === null) leftStart = yPos;
        leftEdges.push({ y: yPos, x: leftEdge });
      } else if (leftStart !== null) {
        this.finalizeCliffSegment(leftStart, (y - 1) * tileSize, leftEdges, 'left', rand, tileSize, worldWidth);
        leftStart = null;
        leftEdges.length = 0;
      }

      const hasRightCliff = rightEdge < worldWidth - tileSize && !isRightAccess &&
        !(hasAvalanche && yPos >= cliffFreeTop && yPos <= cliffFreeBottom);
      if (hasRightCliff) {
        if (rightStart === null) rightStart = yPos;
        rightEdges.push({ y: yPos, x: rightEdge });
      } else if (rightStart !== null) {
        this.finalizeCliffSegment(rightStart, (y - 1) * tileSize, rightEdges, 'right', rand, tileSize, worldWidth);
        rightStart = null;
        rightEdges.length = 0;
      }
    }

    if (leftStart !== null) {
      this.finalizeCliffSegment(leftStart, (level.height - 3) * tileSize, leftEdges, 'left', rand, tileSize, worldWidth);
    }
    if (rightStart !== null) {
      this.finalizeCliffSegment(rightStart, (level.height - 3) * tileSize, rightEdges, 'right', rand, tileSize, worldWidth);
    }
  }

  private finalizeCliffSegment(
    startY: number, endY: number,
    edges: { y: number; x: number }[],
    side: 'left' | 'right',
    rand: (seed: number) => number,
    tileSize: number, _worldWidth: number
  ): void {
    if (edges.length < 2) return;

    // Deep copy — caller clears the array after this call
    const edgesCopy = edges.map(e => ({ y: e.y, x: e.x }));

    const offsetVariation = rand(startY * 0.5 + 77);
    const offset = tileSize * (1.5 + offsetVariation * 1.5);
    const extent = tileSize * (3 + rand(startY * 0.3 + 99) * 2);

    const getX = (y: number): number => {
      const idx = edgesCopy.findIndex(e => e.y >= y);
      if (idx <= 0) return edgesCopy[0].x;
      if (idx >= edgesCopy.length) return edgesCopy[edgesCopy.length - 1].x;
      const prev = edgesCopy[idx - 1];
      const next = edgesCopy[idx];
      const t = (y - prev.y) / (next.y - prev.y || 1);
      return prev.x + (next.x - prev.x) * t;
    };

    // Matches the rowVariation logic in PisteRenderer.drawContinuousCliff
    // Uses same rand formula as PisteRenderer: sin(startY * 0.01 + i * 127.1)
    const visualRand = (i: number) => {
      const n = Math.sin(startY * 0.01 + i * 127.1) * 43758.5453;
      return n - Math.floor(n);
    };
    const getBounds = (y: number): { cliffStart: number; cliffEnd: number } => {
      const tileY = Math.floor(y / tileSize) * tileSize;
      const pisteEdge = getX(tileY);
      const rowVariation = Math.abs(visualRand(tileY * 0.3 + 55) - 0.5) * tileSize;
      if (side === 'left') {
        const cliffEnd = pisteEdge - offset - rowVariation * 0.3;
        const cliffStart = cliffEnd - extent - rowVariation;
        return { cliffStart, cliffEnd };
      } else {
        const cliffStart = pisteEdge + offset + rowVariation * 0.3;
        const cliffEnd = cliffStart + extent + rowVariation;
        return { cliffStart, cliffEnd };
      }
    };

    this.cliffSegments.push({ side, startY, endY, offset, extent, getX, getBounds });
  }

  private calculateAccessPathGeometry(level: Level, tileSize: number): void {
    const accessPaths = level.accessPaths || [];
    this.accessPathRects = [];
    this.accessPathCurves = [];
    if (accessPaths.length === 0) return;

    const worldHeight = level.height * tileSize;
    const worldWidth = level.width * tileSize;
    const roadWidth = tileSize * 5;

    accessPaths.forEach((path, pathIdx) => {
      const entryY = path.endY * worldHeight;
      const exitY = path.startY * worldHeight;
      const onLeft = path.side === 'left';

      const entryYIndex = Math.floor(path.endY * level.height);
      const exitYIndex = Math.floor(path.startY * level.height);
      const entryPath = this.pistePath[entryYIndex] || { centerX: level.width / 2, width: level.width * 0.5 };
      const exitPath = this.pistePath[exitYIndex] || { centerX: level.width / 2, width: level.width * 0.5 };

      const entryPisteX = onLeft ?
        (entryPath.centerX - entryPath.width / 2) * tileSize :
        (entryPath.centerX + entryPath.width / 2) * tileSize;
      const exitPisteX = onLeft ?
        (exitPath.centerX - exitPath.width / 2) * tileSize :
        (exitPath.centerX + exitPath.width / 2) * tileSize;

      const roadExtent = tileSize * 12;
      const outerX = onLeft ?
        Math.max(tileSize * 3, Math.min(entryPisteX, exitPisteX) - roadExtent) :
        Math.min(worldWidth - tileSize * 3, Math.max(entryPisteX, exitPisteX) + roadExtent);

      const numTurns = 3;
      const segmentHeight = (entryY - exitY) / (numTurns + 1);

      const curvePoints: { x: number; y: number }[] = [];
      const stepsPerSegment = 12;

      curvePoints.push({ x: entryPisteX, y: entryY });

      for (let t = 0; t <= numTurns; t++) {
        const targetY = entryY - (t + 0.5) * segmentHeight;
        const atOuter = (t % 2 === 0);
        const innerX = onLeft ?
          Math.min(entryPisteX, exitPisteX) - tileSize * 2 :
          Math.max(entryPisteX, exitPisteX) + tileSize * 2;
        const targetX = atOuter ? outerX : innerX;

        const prevPoint = curvePoints[curvePoints.length - 1];

        for (let s = 1; s <= stepsPerSegment; s++) {
          const progress = s / stepsPerSegment;
          const eased = progress < 0.5 ?
            2 * progress * progress :
            1 - Math.pow(-2 * progress + 2, 2) / 2;

          const x = prevPoint.x + (targetX - prevPoint.x) * eased;
          const y = prevPoint.y + (targetY - prevPoint.y) * progress;
          curvePoints.push({ x, y });
        }
      }

      const lastPoint = curvePoints[curvePoints.length - 1];
      for (let s = 1; s <= stepsPerSegment; s++) {
        const progress = s / stepsPerSegment;
        const eased = progress < 0.5 ?
          2 * progress * progress :
          1 - Math.pow(-2 * progress + 2, 2) / 2;

        const x = lastPoint.x + (exitPisteX - lastPoint.x) * eased;
        const y = lastPoint.y + (exitY - lastPoint.y) * progress;
        curvePoints.push({ x, y });
      }

      const leftEdge: { x: number; y: number }[] = [];
      const rightEdge: { x: number; y: number }[] = [];

      for (let p = 0; p < curvePoints.length; p++) {
        const curr = curvePoints[p];
        const next = curvePoints[Math.min(p + 1, curvePoints.length - 1)];
        const prev = curvePoints[Math.max(p - 1, 0)];

        const dx = (next.x - prev.x) / 2;
        const dy = (next.y - prev.y) / 2;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        const nx = -dy / len * (roadWidth / 2);
        const ny = dx / len * (roadWidth / 2);

        leftEdge.push({ x: curr.x + nx, y: curr.y + ny });
        rightEdge.push({ x: curr.x - nx, y: curr.y - ny });
      }

      this.accessPathCurves.push({ leftEdge, rightEdge });

      const margin = roadWidth * 1.2;
      for (let p = 0; p < curvePoints.length - 1; p++) {
        const p1 = curvePoints[p];
        const p2 = curvePoints[p + 1];
        this.accessPathRects.push({
          startY: Math.min(p1.y, p2.y) - margin,
          endY: Math.max(p1.y, p2.y) + margin,
          leftX: Math.min(p1.x, p2.x) - margin,
          rightX: Math.max(p1.x, p2.x) + margin,
          side: onLeft ? 'left' : 'right',
          pathIndex: pathIdx,
        });
      }
    });
  }
}
