import Phaser from 'phaser';
import { t } from '../setup';
import { THEME } from '../config/theme';
import { isLevelCompleted } from '../utils/gameProgress';
import { createMenuButtonNav, ctaStyler, bindMenuKeys, type MenuButtonNav } from '../utils/menuButtonNav';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { resetGameScenes } from '../utils/sceneTransitions';
import { createMenuBackdrop, createMenuHeader, type MenuBackdrop } from '../systems/MenuTerrainRenderer';
import { playClick } from '../systems/UISounds';
import { generateValidDailyRunLevel, rankSeed, RANKS, type DailyRunRank } from '../systems/LevelGenerator';
import { seedToCode, dailySeed, randomSeed } from '../utils/seededRNG';
import { DEPTHS } from '../config/gameConfig';
import { STORAGE_KEYS } from '../config/storageKeys';
import { startDailyRunSession } from '../systems/DailyRunSession';
import { getJSON } from '../utils/storage';
import { ResizeManager } from '../utils/resizeManager';

const RANK_COLORS: Record<DailyRunRank, string> = {
  green: '#22c55e',
  blue: '#3b82f6',
  red: '#ef4444',
  black: '#1f2937',
};
const RANK_LABELS: Record<DailyRunRank, string> = {
  green: '●',
  blue: '■',
  red: '◆',
  black: '★',
};

export default class DailyRunsScene extends Phaser.Scene {
  private selectedRank: DailyRunRank = 'green';
  private greenIsPark = false;
  private rankButtons: Phaser.GameObjects.Text[] = [];
  private seedDisplay?: Phaser.GameObjects.Text;
  private pisteNameDisplay?: Phaser.GameObjects.Text;
  private briefingText?: Phaser.GameObjects.Text;
  private buttonNav?: MenuButtonNav;
  private gamepadNav?: GamepadMenuNav;
  private backdrop!: MenuBackdrop;
  private resizeManager!: ResizeManager;

  constructor() {
    super({ key: 'DailyRunsScene' });
  }

  create(): void {
    this.events.once('shutdown', this.shutdown, this);

    const { width, height } = this.cameras.main;
    this.backdrop = createMenuBackdrop(this, { skipGroomer: true });
    const scaleFactor = this.backdrop.scaleFactor;

    const { backBtn } = createMenuHeader(this, 'dailyRuns', () => this.goBack(), scaleFactor);

    // Escape key always goes back (even when locked)
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());

    // Check unlock: all 10 campaign levels must be completed
    const isUnlocked = this.isCampaignComplete();

    if (!isUnlocked) {
      this.showLockedMessage(width, height, scaleFactor);
      return;
    }

    this.buildDailyRunsUI(width, height, scaleFactor, backBtn);
  }

  private isCampaignComplete(): boolean {
    // Levels 1-10 (index 1-10) must all be completed
    for (let i = 1; i <= 10; i++) {
      if (!isLevelCompleted(i)) return false;
    }
    return true;
  }

  private showLockedMessage(width: number, height: number, scale: number): void {
    const dprBoost = Math.sqrt(Math.min(window.devicePixelRatio || 1, 2));
    const fontSize = Math.round(16 * Math.max(0.7, scale) * dprBoost);
    this.add.text(width / 2, Math.round(height * 0.4), '🔒 ' + t('dailyRuns_locked'), {
      fontFamily: THEME.fonts.family,
      fontSize: fontSize + 'px',
      color: THEME.colors.textSecondary,
      wordWrap: { width: width * 0.8 },
      align: 'center',
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI);
  }

  private buildDailyRunsUI(width: number, height: number, scale: number, backBtn: Phaser.GameObjects.Text): void {
    // Floor scale for text legibility; boost for high-DPR screens (same as MenuScene)
    const dpr = window.devicePixelRatio || 1;
    const dprBoost = Math.sqrt(Math.min(dpr, 2));
    const textScale = Math.max(0.7, scale) * dprBoost;
    const fontSize = Math.round(16 * textScale);
    const smallFont = Math.round(13 * textScale);
    const btnPadX = Math.round(20 * textScale);
    const btnPadY = Math.round(8 * textScale);

    // Get today's completed ranks
    const today = new Date().toISOString().slice(0, 10);
    const dailyData = getJSON<{ date: string; ranks: string[] }>(STORAGE_KEYS.DAILY_RUN_DATE, { date: '', ranks: [] });
    const completedRanks = dailyData.date === today ? dailyData.ranks : [];

    // --- Rank selector row ---
    const dailySeedNum = dailySeed();
    const { level: greenLevel } = generateValidDailyRunLevel(rankSeed(dailySeedNum, 'green'), 'green');
    this.greenIsPark = greenLevel.difficulty === 'park';

    // Compact layout strategy (Option C):
    // Anchor content near top (15%) to leave bottom ~35% open for mountains
    // Use consistent vertical gaps based on textScale rather than screen height percentages
    const startY = Math.round(height * 0.15);
    const gapBriefing = Math.round(45 * textScale); // Rank -> Briefing
    const gapDaily = Math.round(85 * textScale);    // Briefing -> Daily (needs space for 3 lines)
    const gapRandom = Math.round(50 * textScale);   // Daily -> Random

    const rankY = startY;
    const briefingY = rankY + gapBriefing;
    const dailyY = briefingY + gapDaily;
    const randomY = dailyY + gapRandom;

    const rankSpacing = Math.round(Math.min(100 * scale, (width - 40) / RANKS.length));
    const startX = width / 2 - (RANKS.length - 1) * rankSpacing / 2;

    this.rankButtons = RANKS.map((rank, i) => {
      const x = startX + i * rankSpacing;
      const done = completedRanks.includes(rank);
      const showPark = rank === 'green' && this.greenIsPark;
      const emoji = showPark ? '▲' : RANK_LABELS[rank];
      const name = showPark ? t('rank_park') : t(`rank_${rank}`);
      const label = done ? `${emoji} ${name} ✓` : `${emoji} ${name}`;
      const bgColor = showPark ? '#f59e0b' : RANK_COLORS[rank];
      const btn = this.add.text(x, rankY, label, {
        fontFamily: THEME.fonts.family,
        fontSize: smallFont + 'px',
        color: rank === this.selectedRank ? THEME.colors.textPrimary : THEME.colors.textMuted,
        backgroundColor: rank === this.selectedRank ? bgColor : THEME.colors.panelBgHex,
        padding: { x: Math.round(12 * textScale), y: Math.round(6 * textScale) },
        align: 'center',
      }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        playClick();
        this.selectedRank = rank;
        this.updateRankSelection(completedRanks);
        this.updateBriefing();
      });
      return btn;
    });

    // Equalize rank button widths (measure with longest rank name + ✓)
    const longestRank = RANKS.reduce((a, b) => t(`rank_${a}`).length > t(`rank_${b}`).length ? a : b);
    const probeLabel = `${RANK_LABELS[longestRank]} ${t(`rank_${longestRank}`)} ✓`;
    const probe = this.add.text(0, 0, probeLabel, {
      fontFamily: THEME.fonts.family, fontSize: smallFont + 'px',
      padding: { x: Math.round(12 * textScale), y: Math.round(6 * textScale) },
    });
    // Cap button width so all 4 fit with gaps
    const maxAvailPerButton = Math.floor((width - 20) / RANKS.length) - 4;
    const maxW = Math.min(probe.width, maxAvailPerButton);
    probe.destroy();
    this.rankButtons.forEach(b => b.setFixedSize(maxW, 0));

    // Re-derive spacing from actual button width for centering
    const actualSpacing = Math.max(rankSpacing, maxW + 4);
    const actualStartX = width / 2 - (RANKS.length - 1) * actualSpacing / 2;
    this.rankButtons.forEach((b, i) => b.setX(actualStartX + i * actualSpacing));

    // --- Daily briefing (below rank row) ---
    // Evenly space the 3 briefing lines between briefingY and dailyY
    const briefingGap = Math.round((dailyY - briefingY) / 4);
    this.pisteNameDisplay = this.add.text(width / 2, briefingY, '', {
      fontFamily: THEME.fonts.family,
      fontSize: Math.round(13 * textScale) + 'px',
      color: THEME.colors.textPrimary,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI);

    this.seedDisplay = this.add.text(width / 2, briefingY + briefingGap, '', {
      fontFamily: THEME.fonts.family,
      fontSize: Math.round(11 * textScale) + 'px',
      color: THEME.colors.textMuted,
      align: 'center',
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI);

    this.briefingText = this.add.text(width / 2, briefingY + briefingGap * 2, '', {
      fontFamily: THEME.fonts.family,
      fontSize: Math.round(11 * textScale) + 'px',
      color: THEME.colors.textSecondary,
      align: 'center',
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI);

    this.updateBriefing();

    // --- Action buttons ---
    const allButtons: Phaser.GameObjects.Text[] = [];
    const allCallbacks: (() => void)[] = [];

    allButtons.push(backBtn);
    allCallbacks.push(() => this.goBack());

    const dailyCode = seedToCode(dailySeedNum);

    const dailyBtn = this.add.text(width / 2, dailyY,
      t('dailyRuns_dailyShift') + '  [' + dailyCode + ']',
      {
        fontFamily: THEME.fonts.family,
        fontSize: fontSize + 'px',
        color: THEME.colors.textPrimary,
        backgroundColor: THEME.colors.buttonCTAHex,
        padding: { x: btnPadX, y: btnPadY },
      }
    ).setOrigin(0.5).setDepth(DEPTHS.MENU_UI).setInteractive({ useHandCursor: true });
    dailyBtn.on('pointerdown', () => { playClick(); this.startDailyRun(dailySeedNum, true); });
    allButtons.push(dailyBtn);
    allCallbacks.push(() => this.startDailyRun(dailySeedNum, true));

    // --- Separator + Random Run ---
    const sepY = Math.round((dailyY + randomY) / 2);
    const lineW = Math.round(width * 0.25);
    const sepGfx = this.add.graphics().setDepth(DEPTHS.MENU_UI);
    sepGfx.fillStyle(0x666666, 0.4);
    sepGfx.fillRect(width / 2 - lineW / 2, sepY, lineW, 1);

    const randomBtn = this.add.text(width / 2, randomY,
      t('dailyRuns_randomRun'),
      {
        fontFamily: THEME.fonts.family,
        fontSize: smallFont + 'px',
        color: THEME.colors.textSecondary,
        backgroundColor: THEME.colors.textDark,
        padding: { x: Math.round(14 * textScale), y: Math.round(5 * textScale) },
      }
    ).setOrigin(0.5).setDepth(DEPTHS.MENU_UI).setInteractive({ useHandCursor: true });
    randomBtn.on('pointerdown', () => {
      playClick();
      this.startDailyRun(randomSeed());
    });
    allButtons.push(randomBtn);
    allCallbacks.push(() => {
      this.startDailyRun(randomSeed());
    });

    // Keyboard/gamepad navigation: up/down for action buttons, left/right for rank
    const isCTA = [false, true, false]; // back, daily(CTA), random
    this.buttonNav = createMenuButtonNav(allButtons, allCallbacks, ctaStyler(isCTA));
    this.buttonNav.select(1); // Start on Daily Shift

    // Left/right arrows cycle rank, standard keys for button nav
    this.input.keyboard?.on('keydown-LEFT', () => this.cycleRank(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.cycleRank(1));
    bindMenuKeys(this, this.buttonNav);

    // Pointer hover selects buttons in nav
    allButtons.forEach((btn, i) => {
      btn.on('pointerover', () => this.buttonNav!.select(i));
    });

    this.gamepadNav = createGamepadMenuNav(this, 'vertical', {
      onNavigate: (dir) => this.buttonNav!.navigate(dir),
      onConfirm: () => this.buttonNav!.activate(),
      onBack: () => this.goBack(),
    });

    this.resizeManager = new ResizeManager(this);
    this.resizeManager.register();
  }

  private cycleRank(dir: number): void {
    const idx = RANKS.indexOf(this.selectedRank);
    const next = (idx + dir + RANKS.length) % RANKS.length;
    this.selectedRank = RANKS[next];
    playClick();
    this.updateRankSelection();
    this.updateBriefing();
  }

  private updateRankSelection(completedRanks?: string[]): void {
    this.rankButtons.forEach((btn, i) => {
      const rank = RANKS[i];
      const selected = rank === this.selectedRank;
      const done = completedRanks ? completedRanks.includes(rank) : btn.text.includes('✓');
      // Show park-themed label when green rank has a park level
      const showPark = rank === 'green' && this.greenIsPark;
      const name = showPark ? t('rank_park') : t(`rank_${rank}`);
      const emoji = showPark ? '▲' : RANK_LABELS[rank];
      const label = done ? `${emoji} ${name} ✓` : `${emoji} ${name}`;
      const bgColor = showPark ? '#f59e0b' : RANK_COLORS[rank];
      btn.setText(label);
      btn.setColor(selected ? THEME.colors.textPrimary : THEME.colors.textMuted);
      btn.setBackgroundColor(selected ? bgColor : THEME.colors.panelBgHex);
    });
  }

  private updateBriefing(): void {
    const dailySeedNum = dailySeed();
    const { level } = generateValidDailyRunLevel(rankSeed(dailySeedNum, this.selectedRank), this.selectedRank);
    const isPark = level.difficulty === 'park';

    if (this.pisteNameDisplay) {
      this.pisteNameDisplay.setText(level.name || t(level.nameKey));
    }

    const weatherKey = `dailyRuns_weather_${level.weather || 'clear'}`;
    const shiftKey = level.isNight ? 'dailyRuns_night' : 'dailyRuns_day';
    const parkStr = isPark ? ` | ▲ ${t('rank_park')}` : '';
    const winchStr = level.hasWinch ? ` | 🔗 ${t('winch')}` : '';

    if (this.seedDisplay) {
      this.seedDisplay.setText(
        `${t(shiftKey)} | ${t(weatherKey)}${parkStr}${winchStr}`
      );
    }
    if (this.briefingText) {
      this.briefingText.setText(
        `${t('dailyRuns_target')}: ${level.targetCoverage}% | ${t('dailyRuns_timeLimit')}: ${Math.floor(level.timeLimit / 60)}m${(level.timeLimit % 60) ? level.timeLimit % 60 + 's' : ''} | ${level.width}×${level.height}`
      );
    }
    // Update green button to show park theme when the daily level is a park
    this.updateRankSelection();
  }

  private startDailyRun(seed: number, isDaily = false): void {
    const { level, usedSeed } = generateValidDailyRunLevel(rankSeed(seed, this.selectedRank), this.selectedRank);
    const code = seedToCode(usedSeed);

    startDailyRunSession({
      level,
      seedCode: code,
      rank: this.selectedRank,
      isDaily,
    });

    resetGameScenes(this.game, 'GameScene', { level: level.id });
  }

  private goBack(): void {
    resetGameScenes(this.game, 'MenuScene');
  }

  update(time: number, delta: number): void {
    this.gamepadNav?.update(delta);
    this.backdrop.wildlife?.update(time, delta);
  }

  private shutdown(): void {
    this.resizeManager?.destroy();
    this.buttonNav = undefined;
    this.gamepadNav = undefined;
    this.backdrop.wildlife?.destroy();
    this.input.keyboard?.removeAllListeners();
  }
}
