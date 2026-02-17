import Phaser from 'phaser';
import { t } from '../setup';
import { THEME } from '../config/theme';
import { isLevelCompleted } from '../utils/gameProgress';
import { createMenuButtonNav, ctaStyler, bindMenuKeys, type MenuButtonNav } from '../utils/menuButtonNav';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { resetGameScenes } from '../utils/sceneTransitions';
import { createMenuBackdrop, createMenuHeader, type MenuBackdrop } from '../systems/MenuTerrainRenderer';
import { playClick } from '../systems/UISounds';
import { generateValidContractLevel, type ContractRank } from '../systems/LevelGenerator';
import { seedToCode, dailySeed } from '../utils/seededRNG';
import { DEPTHS } from '../config/gameConfig';
import { STORAGE_KEYS } from '../config/storageKeys';
import { startContractSession } from '../systems/ContractSession';
import { getJSON } from '../utils/storage';

const RANKS: ContractRank[] = ['green', 'blue', 'red', 'black'];

/** Mix rank into seed so each rank produces a unique level from the same base seed. */
function rankSeed(baseSeed: number, rank: ContractRank): number {
  const rankIdx = RANKS.indexOf(rank);
  return ((baseSeed * 31) + rankIdx * 7919) >>> 0;
}

const RANK_COLORS: Record<ContractRank, string> = {
  green: '#22c55e',
  blue: '#3b82f6',
  red: '#ef4444',
  black: '#1f2937',
};
const RANK_LABELS: Record<ContractRank, string> = {
  green: '●',
  blue: '■',
  red: '◆',
  black: '★',
};

export default class ContractsScene extends Phaser.Scene {
  private selectedRank: ContractRank = 'green';
  private rankButtons: Phaser.GameObjects.Text[] = [];
  private seedDisplay?: Phaser.GameObjects.Text;
  private briefingText?: Phaser.GameObjects.Text;
  private buttonNav?: MenuButtonNav;
  private gamepadNav?: GamepadMenuNav;
  private backdrop!: MenuBackdrop;

  constructor() {
    super({ key: 'ContractsScene' });
  }

  create(): void {
    this.events.once('shutdown', this.shutdown, this);

    const { width, height } = this.cameras.main;
    this.backdrop = createMenuBackdrop(this, { skipGroomer: true });
    const scaleFactor = this.backdrop.scaleFactor;

    const { backBtn } = createMenuHeader(this, 'contracts', () => this.goBack(), scaleFactor);

    // Escape key always goes back (even when locked)
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());

    // Check unlock: all 10 campaign levels must be completed
    const isUnlocked = this.isCampaignComplete();

    if (!isUnlocked) {
      this.showLockedMessage(width, height, scaleFactor);
      return;
    }

    this.buildContractsUI(width, height, scaleFactor, backBtn);
  }

  private isCampaignComplete(): boolean {
    // Levels 1-10 (index 1-10) must all be completed
    for (let i = 1; i <= 10; i++) {
      if (!isLevelCompleted(i)) return false;
    }
    return true;
  }

  private showLockedMessage(width: number, height: number, scale: number): void {
    const fontSize = Math.round(16 * scale);
    this.add.text(width / 2, Math.round(height * 0.4), '🔒 ' + t('contracts_locked'), {
      fontFamily: THEME.fonts.family,
      fontSize: fontSize + 'px',
      color: THEME.colors.textSecondary,
      wordWrap: { width: width * 0.7 },
      align: 'center',
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI);
  }

  private buildContractsUI(width: number, height: number, scale: number, backBtn: Phaser.GameObjects.Text): void {
    const fontSize = Math.round(16 * scale);
    const smallFont = Math.round(13 * scale);
    const btnPadX = Math.round(20 * scale);
    const btnPadY = Math.round(8 * scale);

    // Get today's completed ranks
    const today = new Date().toISOString().slice(0, 10);
    const dailyData = getJSON<{ date: string; ranks: string[] }>(STORAGE_KEYS.DAILY_RUN_DATE, { date: '', ranks: [] });
    const completedRanks = dailyData.date === today ? dailyData.ranks : [];

    // --- Rank selector row ---
    const rankY = Math.round(height * 0.19);
    const rankSpacing = Math.round(100 * scale);
    const startX = width / 2 - (RANKS.length - 1) * rankSpacing / 2;

    this.rankButtons = RANKS.map((rank, i) => {
      const x = startX + i * rankSpacing;
      const done = completedRanks.includes(rank);
      const emoji = RANK_LABELS[rank];
      const name = rank.charAt(0).toUpperCase() + rank.slice(1);
      const label = done ? `${emoji} ${name} ✓` : `${emoji} ${name}`;
      const btn = this.add.text(x, rankY, label, {
        fontFamily: THEME.fonts.family,
        fontSize: smallFont + 'px',
        color: rank === this.selectedRank ? THEME.colors.textPrimary : THEME.colors.textMuted,
        backgroundColor: rank === this.selectedRank ? RANK_COLORS[rank] : THEME.colors.panelBgHex,
        padding: { x: Math.round(12 * scale), y: Math.round(6 * scale) },
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

    // Equalize rank button widths (measure with ✓ for all)
    const probeLabel = `${RANK_LABELS.green} Green ✓`;
    const probe = this.add.text(0, 0, probeLabel, {
      fontFamily: THEME.fonts.family, fontSize: smallFont + 'px',
      padding: { x: Math.round(12 * scale), y: Math.round(6 * scale) },
    });
    const maxW = probe.width;
    probe.destroy();
    this.rankButtons.forEach(b => b.setFixedSize(maxW, 0));

    // --- Daily briefing (compact, below rank row) ---
    const briefingY = rankY + Math.round(35 * scale);
    this.seedDisplay = this.add.text(width / 2, briefingY, '', {
      fontFamily: THEME.fonts.family,
      fontSize: Math.round(11 * scale) + 'px',
      color: THEME.colors.textMuted,
      align: 'center',
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI);

    this.briefingText = this.add.text(width / 2, briefingY + Math.round(16 * scale), '', {
      fontFamily: THEME.fonts.family,
      fontSize: Math.round(11 * scale) + 'px',
      color: THEME.colors.textSecondary,
      align: 'center',
    }).setOrigin(0.5).setDepth(DEPTHS.MENU_UI);

    this.updateBriefing();

    // --- Action buttons ---
    const allButtons: Phaser.GameObjects.Text[] = [];
    const allCallbacks: (() => void)[] = [];

    allButtons.push(backBtn);
    allCallbacks.push(() => this.goBack());

    const dailySeedNum = dailySeed();
    const dailyCode = seedToCode(dailySeedNum);
    const dailyY = briefingY + Math.round(50 * scale);

    const dailyBtn = this.add.text(width / 2, dailyY,
      t('contracts_dailyShift') + '  [' + dailyCode + ']',
      {
        fontFamily: THEME.fonts.family,
        fontSize: fontSize + 'px',
        color: THEME.colors.textPrimary,
        backgroundColor: THEME.colors.buttonCTAHex,
        padding: { x: btnPadX, y: btnPadY },
      }
    ).setOrigin(0.5).setDepth(DEPTHS.MENU_UI).setInteractive({ useHandCursor: true });
    dailyBtn.on('pointerdown', () => { playClick(); this.startContract(dailySeedNum, true); });
    allButtons.push(dailyBtn);
    allCallbacks.push(() => this.startContract(dailySeedNum, true));

    // --- Separator + Random Run (visually distinct section) ---
    const sepY = dailyY + Math.round(40 * scale);
    const lineW = Math.round(width * 0.25);
    const sepGfx = this.add.graphics().setDepth(DEPTHS.MENU_UI);
    sepGfx.fillStyle(0x666666, 0.4);
    sepGfx.fillRect(width / 2 - lineW / 2, sepY, lineW, 1);

    const randomY = sepY + Math.round(22 * scale);
    const randomBtn = this.add.text(width / 2, randomY,
      t('contracts_randomContract'),
      {
        fontFamily: THEME.fonts.family,
        fontSize: smallFont + 'px',
        color: THEME.colors.textSecondary,
        backgroundColor: THEME.colors.textDark,
        padding: { x: Math.round(14 * scale), y: Math.round(5 * scale) },
      }
    ).setOrigin(0.5).setDepth(DEPTHS.MENU_UI).setInteractive({ useHandCursor: true });
    randomBtn.on('pointerdown', () => {
      playClick();
      const randomSeed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
      this.startContract(randomSeed);
    });
    allButtons.push(randomBtn);
    allCallbacks.push(() => {
      const randomSeed = (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
      this.startContract(randomSeed);
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
      const name = rank.charAt(0).toUpperCase() + rank.slice(1);
      const label = done ? `${RANK_LABELS[rank]} ${name} ✓` : `${RANK_LABELS[rank]} ${name}`;
      btn.setText(label);
      btn.setColor(selected ? THEME.colors.textPrimary : THEME.colors.textMuted);
      btn.setBackgroundColor(selected ? RANK_COLORS[rank] : THEME.colors.panelBgHex);
    });
  }

  private updateBriefing(): void {
    const dailySeedNum = dailySeed();
    const { level } = generateValidContractLevel(rankSeed(dailySeedNum, this.selectedRank), this.selectedRank);

    const weatherKey = `contracts_weather_${level.weather || 'clear'}`;
    const shiftKey = level.isNight ? 'contracts_night' : 'contracts_day';
    const parkStr = level.specialFeatures?.length ? ' | 🏔️ Park' : '';
    const winchStr = level.hasWinch ? ' | 🔗 Winch' : '';

    if (this.seedDisplay) {
      this.seedDisplay.setText(
        `${t(shiftKey)} | ${t(weatherKey)}${parkStr}${winchStr}`
      );
    }
    if (this.briefingText) {
      this.briefingText.setText(
        `${t('contracts_target')}: ${level.targetCoverage}% | ${t('contracts_timeLimit')}: ${Math.floor(level.timeLimit / 60)}m${(level.timeLimit % 60) ? level.timeLimit % 60 + 's' : ''} | ${level.width}×${level.height}`
      );
    }
  }

  private startContract(seed: number, isDaily = false): void {
    const { level, usedSeed } = generateValidContractLevel(rankSeed(seed, this.selectedRank), this.selectedRank);
    const code = seedToCode(usedSeed);

    startContractSession({
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
    this.buttonNav = undefined;
    this.gamepadNav = undefined;
    this.backdrop.wildlife?.destroy();
    this.input.keyboard?.removeAllListeners();
  }
}
