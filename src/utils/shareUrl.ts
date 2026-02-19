/**
 * Share URL utilities for Daily Runs seed sharing.
 * Builds shareable URLs with seed+rank query params and handles clipboard copy.
 */

import { type DailyRunRank, RANKS } from '../systems/LevelGenerator';

/** Build a shareable URL for a given seed code and rank. */
export function buildShareUrl(seedCode: string, rank: DailyRunRank): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?seed=${encodeURIComponent(seedCode)}&rank=${encodeURIComponent(rank)}`;
}

/** Build a formatted share message with URL for messaging apps. */
export function buildShareMessage(seedCode: string, rank: DailyRunRank, pisteName: string): string {
  const emoji: Record<DailyRunRank, string> = { green: '🟢', blue: '🔵', red: '🔴', black: '⚫' };
  const url = buildShareUrl(seedCode, rank);
  return `${url}\n🏔️ ${pisteName} — ${emoji[rank]} ${rank.charAt(0).toUpperCase() + rank.slice(1)} [${seedCode}]`;
}

/** Parse seed and rank from current URL query params. Returns null if not present. */
export function parseShareParams(): { seedCode: string; rank: DailyRunRank } | null {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  const rank = params.get('rank') as DailyRunRank | null;
  if (!seed) return null;
  const validRanks = RANKS as readonly string[];
  return {
    seedCode: seed.toUpperCase(),
    rank: rank && validRanks.includes(rank) ? rank : 'green',
  };
}

/** Clear seed/rank from URL without reload. */
export function clearShareParams(): void {
  if (!window.location.search) return;
  history.replaceState({}, '', window.location.pathname);
}

/** Copy text to clipboard. Returns true on success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / non-HTTPS
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
