#!/usr/bin/env python3
"""Generate annotated level preview images for all procedural shapes and ranks.

Renders piste geometry, service roads, steep zones, winch anchors,
park features (kickers, rails, halfpipe walls), and slalom gates
as color-coded tile maps.

Usage:
    python tests/e2e/generate_level_previews.py [--out DIR] [--ranks RANKS] [--count N]

Options:
    --out DIR      Output directory (default: tests/screenshots/level-variety)
    --ranks RANKS  Comma-separated ranks to generate (default: green,blue,red,black)
    --count N      Max seeds to scan per target (default: 500)
"""
import argparse
import os
import sys
import time

# Add project root so conftest helpers can be imported
sys.path.insert(0, os.path.dirname(__file__))

from playwright.sync_api import sync_playwright
from conftest import GAME_URL, wait_for_scene

# ---------------------------------------------------------------------------
# Browser-side JavaScript snippets
# ---------------------------------------------------------------------------

SETUP_IMPORTS = """async () => {
    window.__lg = await import('/src/systems/LevelGenerator.ts');
    window.__geo = await import('/src/systems/LevelGeometry.ts');
    window.__gc = await import('/src/config/gameConfig.ts');
}"""

# Feature layout generator mirrors ParkFeatureSystem.generateFeatureLayout
# Slalom gate generator mirrors SlalomGateSystem.create
GENERATE_LEVELS_JS = """(args) => {
    const { targets, maxSeed, samplesPerTarget } = args;
    const { generateValidContractLevel } = window.__lg;
    const { LevelGeometry } = window.__geo;
    const { GAME_CONFIG, BALANCE } = window.__gc;
    const ts = GAME_CONFIG.TILE_SIZE;

    function genFeatures(type, levelHeight, seed, inHP, pipeFloorHW) {
        const KICKER_LINE_X = -5, RAIL_LINE_X = 5, PIPE_WALL_TILES = 3;
        const pipeOff = (inHP && pipeFloorHW > 0) ? Math.max(2, Math.floor(pipeFloorHW / 3)) : 0;
        const lineX = inHP
            ? (type === 'kicker' ? -pipeOff : pipeOff)
            : (type === 'kicker' ? KICKER_LINE_X : RAIL_LINE_X);
        const margin = 8, minSpacing = 10;
        const usable = levelHeight - margin * 2;
        const maxCount = inHP ? 3 : 5;
        const count = Math.max(2, Math.min(maxCount, Math.floor(usable / minSpacing)));
        const spacing = usable / count;
        const seedOff = ((seed * 7 + (type === 'kicker' ? 3 : 17)) % 5) - 2;
        const mixHash = (seed * 13 + (type === 'kicker' ? 7 : 23)) % 100;
        const mixTypes = mixHash < 40;
        const defs = [];
        for (let i = 0; i < count; i++) {
            const tY = Math.floor(margin + spacing * (i + 0.5) + seedOff);
            if (tY >= 5 && tY < levelHeight - 5) {
                const aType = mixTypes && (i % 2 === 1)
                    ? (type === 'kicker' ? 'rail' : 'kicker') : type;
                defs.push({ tileX: lineX, tileY: tY,
                    w: aType === 'kicker' ? 3 : 1,
                    h: aType === 'kicker' ? 2 : 3,
                    type: aType });
            }
        }
        return defs;
    }

    function genSlalom(level, geo) {
        if (!level.slalomGates) return [];
        const { count, width } = level.slalomGates;
        const usableStart = Math.round(level.height * 0.05) + 3;
        const usableEnd = level.height - (BALANCE.SKI_FINISH_BUFFER || 3) - 1;
        const spacing = Math.floor((usableEnd - usableStart) / (count + 1));
        const gates = [];
        for (let i = 0; i < count; i++) {
            const tileY = usableStart + spacing * (i + 1);
            const path = geo.pistePath[tileY];
            if (!path) continue;
            const offDir = i % 2 === 0 ? -1 : 1;
            const offAmt = Math.min(width * 0.3, path.width * 0.15);
            const cx = path.centerX + offDir * offAmt;
            const halfW = width / 2;
            gates.push({ y: tileY, leftX: cx - halfW, rightX: cx + halfW,
                          color: i % 2 === 0 ? 'red' : 'blue' });
        }
        return gates;
    }

    const results = [];
    for (const t of targets) {
        let found = 0;
        for (let seed = 1; seed <= maxSeed && found < samplesPerTarget; seed++) {
            const { level } = generateValidContractLevel(seed, t.rank);
            const isPark = level.difficulty === 'park';

            if (t.filterType === 'park') {
                if (!isPark) continue;
                if (t.featureFilter) {
                    const fkey = (level.specialFeatures || []).sort().join('+');
                    if (fkey !== t.featureFilter) continue;
                }
            } else if (t.filterType === 'regular') {
                if (isPark) continue;
            } else {
                if (isPark || level.pisteShape !== t.filterType) continue;
            }

            const geo = new LevelGeometry();
            geo.generate(level, ts);

            // Tile map
            const pixels = [];
            for (let y = 0; y < level.height; y++) {
                for (let x = 0; x < level.width; x++) {
                    const inP = geo.isInPiste(x, y, level);
                    let isSteep = false;
                    if (level.steepZones) {
                        for (const sz of level.steepZones) {
                            const sy = Math.floor(sz.startY * level.height);
                            const ey = Math.floor(sz.endY * level.height);
                            if (y >= sy && y < ey && inP) isSteep = true;
                        }
                    }
                    pixels.push({ x, y, t: isSteep ? 'S' : inP ? 'P' : '.' });
                }
            }

            // Service road curves
            const roadCurves = (geo.accessPathCurves || []).map(curve => ({
                left: curve.leftEdge.map(p => ({ x: p.x / ts, y: p.y / ts })),
                right: curve.rightEdge.map(p => ({ x: p.x / ts, y: p.y / ts })),
            }));

            // Park features
            const parkFeatures = [];
            const specials = level.specialFeatures || [];
            const inHP = specials.includes('halfpipe');
            if (inHP) {
                const PW = 3;
                for (let y = 3; y < level.height - 3; y++) {
                    const p = geo.pistePath[y];
                    if (!p) continue;
                    const halfW = p.width / 2;
                    for (let dx = 0; dx < PW; dx++) {
                        parkFeatures.push({ x: Math.floor(p.centerX - halfW + dx), y, t: 'W' });
                        parkFeatures.push({ x: Math.floor(p.centerX + halfW - PW + dx), y, t: 'W' });
                    }
                }
            }
            // Compute pipe floor half-width for feature offset
            const midY = Math.floor(level.height / 2);
            const midPath = geo.pistePath[midY];
            const pipeFloorHW = midPath ? Math.floor(midPath.width / 2) - 3 : 0;
            const hasBoth = inHP && specials.includes('kickers') && specials.includes('rails');
            const offsetHW = hasBoth ? pipeFloorHW : 0;
            for (const fType of ['kickers', 'rails']) {
                if (!specials.includes(fType)) continue;
                const baseType = fType === 'kickers' ? 'kicker' : 'rail';
                for (const f of genFeatures(baseType, level.height, level.id || 0, inHP, offsetHW)) {
                    const p = geo.pistePath[f.tileY];
                    if (!p) continue;
                    const cx = Math.floor(p.centerX + f.tileX);
                    const fw = f.type === 'kicker' ? 3 : 1;
                    const fh = f.type === 'kicker' ? 2 : 3;
                    const ch = f.type === 'kicker' ? 'K' : 'J';
                    for (let dy = 0; dy < fh; dy++)
                        for (let dx = -Math.floor(fw/2); dx <= Math.floor(fw/2); dx++)
                            parkFeatures.push({ x: cx + dx, y: f.tileY + dy, t: ch });
                }
            }

            const slalomGates = genSlalom(level, geo);
            const features = specials.join('+') || '';
            const steepInfo = (level.steepZones || []).map(s => s.slope + '°').join(',');
            const slalomInfo = level.slalomGates
                ? level.slalomGates.count + 'g w' + level.slalomGates.width : '';

            results.push({
                rank: t.rank, seed, shape: level.pisteShape, isPark, features,
                w: level.width, h: level.height,
                pw: (level.pisteWidth * 100).toFixed(0),
                time: level.timeLimit, coverage: level.targetCoverage,
                steepInfo, slalomInfo,
                anchors: (level.winchAnchors || []).map(a => a.y),
                steepBounds: (level.steepZones || []).map(sz => [sz.startY, sz.endY, sz.slope]),
                pixels, roadCurves, parkFeatures, slalomGates,
            });
            found++;
        }
    }
    return results;
}"""

RENDER_JS = """(args) => {
    const { pixels, roadCurves, parkFeatures, slalomGates,
            w, h, label1, label2, anchors, steepBounds, isPark } = args;
    let c = document.getElementById('__auditCanvas');
    if (c) c.remove();
    c = document.createElement('canvas');
    c.id = '__auditCanvas';
    const scale = 4;
    const marginR = 50;
    const headerH = 42;
    const legendH = 22;
    const cw = w * scale + marginR;
    const ch = h * scale + headerH + legendH;
    c.width = cw;
    c.height = ch;
    c.style.position = 'fixed';
    c.style.top = '0';
    c.style.left = '0';
    c.style.zIndex = '99999';
    c.style.imageRendering = 'pixelated';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#f5f0eb';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(label1, 4, 16);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText(label2, 4, 32);

    const COLORS = { '.': '#c4d4c0', 'P': '#e8e0d8', 'S': '#ef4444' };
    for (const p of pixels) {
        ctx.fillStyle = COLORS[p.t];
        ctx.fillRect(p.x * scale, p.y * scale + headerH, scale, scale);
    }

    // Service road curves (filled polygon from left/right edge arrays)
    for (const curve of roadCurves) {
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        for (let i = 0; i < curve.left.length; i++) {
            const x = curve.left[i].x * scale, y = curve.left[i].y * scale + headerH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let i = curve.right.length - 1; i >= 0; i--)
            ctx.lineTo(curve.right[i].x * scale, curve.right[i].y * scale + headerH);
        ctx.closePath();
        ctx.fill();
    }

    // Park features overlay
    const FEAT = { 'W': '#8b7355', 'K': '#4488cc', 'J': '#cc8844' };
    for (const f of parkFeatures) {
        if (f.x >= 0 && f.x < w && f.y >= 0 && f.y < h) {
            ctx.fillStyle = FEAT[f.t];
            ctx.fillRect(f.x * scale, f.y * scale + headerH, scale, scale);
        }
    }

    // Slalom gates (poles + dashed corridor)
    for (const g of slalomGates) {
        const gy = g.y * scale + headerH;
        const lx = g.leftX * scale;
        const rx = g.rightX * scale;
        const gateColor = g.color === 'red' ? '#dc2626' : '#2563eb';
        ctx.fillStyle = gateColor;
        ctx.fillRect(lx - 1, gy - 2, 3, 5);
        ctx.fillRect(rx - 1, gy - 2, 3, 5);
        ctx.strokeStyle = gateColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(rx, gy); ctx.stroke();
        ctx.setLineDash([]);
    }

    // Winch anchors (yellow horizontal line + anchor icon)
    const pisteW = w * scale;
    for (const a of anchors) {
        const ay = Math.floor(a * h);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(0, ay * scale + headerH, pisteW, 2);
        ctx.fillStyle = '#92400e';
        ctx.font = '9px monospace';
        ctx.fillText('⚓', pisteW + 4, ay * scale + headerH + 6);
    }

    // Steep zone boundary dashes + slope label
    for (const sz of steepBounds) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        const sy = Math.floor(sz[0] * h) * scale + headerH;
        const ey = Math.floor(sz[1] * h) * scale + headerH;
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(pisteW, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, ey); ctx.lineTo(pisteW, ey); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(sz[2] + '°', pisteW + 4, (sy + ey) / 2 + 4);
    }

    // Legend bar
    const ly = headerH + h * scale + 4;
    ctx.font = '9px monospace';
    let items;
    if (isPark)
        items = [['#e8e0d8','piste'],['#8b7355','pipe wall'],['#4488cc','kicker'],['#cc8844','rail']];
    else if (slalomGates.length > 0)
        items = [['#e8e0d8','piste'],['#ef4444','steep'],['#d4a574','road'],['#eab308','winch'],['#dc2626','slalom']];
    else
        items = [['#e8e0d8','piste'],['#ef4444','steep'],['#d4a574','road'],['#eab308','winch']];
    let lx = 4;
    for (const [color, name] of items) {
        ctx.fillStyle = color;
        ctx.fillRect(lx, ly, 8, 8);
        ctx.fillStyle = '#333';
        ctx.fillText(name, lx + 10, ly + 8);
        lx += ctx.measureText(name).width + 18;
    }
}"""

# ---------------------------------------------------------------------------
# Target definitions: what levels to sample
# ---------------------------------------------------------------------------

def build_targets(ranks: list[str]) -> list[dict]:
    """Build the list of level targets to find (one per shape/feature combo)."""
    targets = []

    if 'green' in ranks:
        # Parks: one per feature combo + any park
        for feat in ['halfpipe+kickers', 'kickers+rails', 'kickers',
                      'halfpipe+kickers+rails']:
            targets.append({'rank': 'green', 'filterType': 'park', 'featureFilter': feat})
        targets.append({'rank': 'green', 'filterType': 'park', 'featureFilter': None})
        # Regular greens
        targets.append({'rank': 'green', 'filterType': 'regular', 'featureFilter': None})

    if 'blue' in ranks:
        for shape in ['gentle_curve', 'winding', 'dogleg']:
            targets.append({'rank': 'blue', 'filterType': shape, 'featureFilter': None})

    if 'red' in ranks:
        for shape in ['serpentine', 'hourglass', 'winding']:
            targets.append({'rank': 'red', 'filterType': shape, 'featureFilter': None})

    if 'black' in ranks:
        for shape in ['serpentine', 'dogleg', 'hourglass', 'winding']:
            targets.append({'rank': 'black', 'filterType': shape, 'featureFilter': None})

    return targets


def main():
    parser = argparse.ArgumentParser(description='Generate level preview images')
    parser.add_argument('--out', default='tests/screenshots/level-variety',
                        help='Output directory')
    parser.add_argument('--ranks', default='green,blue,red,black',
                        help='Comma-separated ranks')
    parser.add_argument('--count', type=int, default=500,
                        help='Max seeds to scan per target')
    parser.add_argument('--samples', type=int, default=5,
                        help='Number of samples per target shape/combo')
    args = parser.parse_args()

    ranks = [r.strip() for r in args.ranks.split(',')]
    out_dir = args.out
    os.makedirs(out_dir, exist_ok=True)

    targets = build_targets(ranks)
    if not targets:
        print('No targets to generate.')
        return

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        page.goto(GAME_URL)
        wait_for_scene(page, 'MenuScene', timeout=15000)

        # Unlock contracts
        page.evaluate("""() => {
            const stats = {};
            for (let i = 0; i <= 10; i++)
                stats[i] = {completed: true, bestStars: 3, bestTime: 60, bestBonusMet: 0};
            localStorage.setItem('snowGroomer_progress', JSON.stringify({
                currentLevel: 11, levelStats: stats,
                savedAt: new Date().toISOString()
            }));
        }""")
        page.reload()
        wait_for_scene(page, 'MenuScene', timeout=15000)
        time.sleep(0.3)

        # Navigate to ContractsScene (needed for dynamic imports)
        idx = page.evaluate("""() => {
            const ms = window.game?.scene?.getScene('MenuScene');
            if (!ms?.menuButtons) return -1;
            const texts = ms.menuButtons.map(b => b.text.toLowerCase());
            for (let i = 0; i < texts.length; i++) {
                if (texts[i].includes('daily') || texts[i].includes('contrat') ||
                    texts[i].includes('courses') || texts[i].includes('runs')) return i;
            }
            return -1;
        }""")
        assert idx >= 0, 'Daily Runs button not found'
        page.evaluate(f"""() => {{
            const ms = window.game?.scene?.getScene('MenuScene');
            if (ms?.buttonNav) ms.buttonNav.select({idx});
        }}""")
        time.sleep(0.2)
        page.keyboard.press('Enter')
        wait_for_scene(page, 'ContractsScene')
        time.sleep(0.3)

        # Import game modules
        page.evaluate(SETUP_IMPORTS)
        time.sleep(0.5)

        # Generate all level data
        levels = page.evaluate(GENERATE_LEVELS_JS, {
            'targets': targets,
            'maxSeed': args.count,
            'samplesPerTarget': args.samples,
        })

        print(f'Generated {len(levels)} level previews')

        # Render each level to a screenshot
        for sample in levels:
            park_tag = 'park_' if sample['isPark'] else ''
            fkey = sample['features'].replace('+', '_') if sample['isPark'] else sample['shape']
            fname = f"{sample['rank']}_{park_tag}{fkey}_s{sample['seed']}"

            label1 = sample['rank'].upper()
            if sample['isPark']:
                label1 += f" PARK ({sample['features']})"
            label1 += f" — {sample['shape']} {sample['w']}x{sample['h']}"

            parts = [f"pw={sample['pw']}% cov={sample['coverage']}% t={sample['time']}s"]
            if sample['steepInfo']:
                parts.append(f"steep=[{sample['steepInfo']}]")
            if sample['slalomInfo']:
                parts.append(f"slalom={sample['slalomInfo']}")
            label2 = ' | '.join(parts)

            page.evaluate(RENDER_JS, {
                'pixels': sample['pixels'],
                'roadCurves': sample['roadCurves'],
                'parkFeatures': sample['parkFeatures'],
                'slalomGates': sample['slalomGates'],
                'w': sample['w'], 'h': sample['h'],
                'label1': label1, 'label2': label2,
                'anchors': sample['anchors'],
                'steepBounds': sample['steepBounds'],
                'isPark': sample['isPark'],
            })
            time.sleep(0.1)
            canvas = page.locator('#__auditCanvas')
            path = os.path.join(out_dir, f'{fname}.png')
            canvas.screenshot(path=path)
            print(f'  ✓ {fname}')

        # Cleanup
        page.evaluate("() => { const c = document.getElementById('__auditCanvas'); if (c) c.remove(); }")
        browser.close()

    print(f'\nDone! {len(levels)} previews saved to {out_dir}/')


if __name__ == '__main__':
    main()
