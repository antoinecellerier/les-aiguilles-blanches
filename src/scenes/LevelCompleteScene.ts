import Phaser from 'phaser';
import { t, Accessibility, LEVELS, type Level, type BonusObjective } from '../setup';
import { evaluateAllBonusObjectives, getBonusLabel, type BonusEvalState } from '../utils/bonusObjectives';
import { THEME } from '../config/theme';
import { BALANCE } from '../config/gameConfig';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getString, setString, getJSON, setJSON } from '../utils/storage';
import { getMappingFromGamepad } from '../utils/gamepad';
import { createGamepadMenuNav, type GamepadMenuNav } from '../utils/gamepadMenu';
import { createMenuButtonNav, ctaStyler, type MenuButtonNav } from '../utils/menuButtonNav';
import { resetGameScenes } from '../utils/sceneTransitions';
import { createMenuTerrain } from '../systems/MenuTerrainRenderer';
import { MenuWildlifeController } from '../systems/MenuWildlifeController';
import { playClick, playLevelWin, playLevelFail } from '../systems/UISounds';
import { markLevelCompleted } from '../utils/gameProgress';
import { clearGroomedTiles } from '../utils/skiRunState';
import { getDailyRunSession } from '../systems/DailyRunSession';

/**
 * Les Aiguilles Blanches - Level Complete Scene
 * Shows level results and next level option using rexUI Sizer
 */

interface LevelCompleteData {
  won: boolean;
  level: number;
  coverage: number;
  groomQuality?: number;
  timeUsed: number;
  failReason?: string;
  fuelUsed?: number;
  tumbleCount?: number;
  winchUseCount?: number;
  pathsVisited?: number;
  totalPaths?: number;
  restartCount?: number;
  silent?: boolean;
  skiMode?: string;
  skiGatesHit?: number;
  skiGatesTotal?: number;
  skiTrickScore?: number;
  skiTrickCount?: number;
  skiBestCombo?: number;
}

export default class LevelCompleteScene extends Phaser.Scene {
  private won = false;
  private silent = false;
  private levelIndex = 0;
  private coverage = 0;
  private groomQuality = 0;
  private timeUsed = 0;
  private failReason?: string;
  private skiMode?: string;
  private fuelUsed = 0;
  private tumbleCount = 0;
  private restartCount = 0;
  private winchUseCount = 0;
  private pathsVisited = 0;
  private totalPaths = 0;
  private skiGatesHit = 0;
  private skiGatesTotal = 0;
  private skiTrickScore = 0;
  private skiTrickCount = 0;
  private skiBestCombo = 0;
  private isDailyRun = false;
  
  // Keyboard/gamepad navigation
  private menuButtons: Phaser.GameObjects.Text[] = [];
  private buttonCallbacks: (() => void)[] = [];
  private buttonIsCTA: boolean[] = [];
  private buttonNav!: MenuButtonNav;
  private inputReady = false;
  private inputReadyTimer: Phaser.Time.TimerEvent | null = null;
  private wildlife!: MenuWildlifeController;

  /** Expose for tests */
  get selectedIndex(): number { return this.buttonNav?.selectedIndex ?? 0; }

  constructor() {
    super({ key: 'LevelCompleteScene' });
  }

  init(data: LevelCompleteData): void {
    this.won = data.won;
    this.silent = data.silent ?? false;
    this.levelIndex = data.level;
    this.coverage = data.coverage;
    this.groomQuality = data.groomQuality ?? 0;
    this.timeUsed = data.timeUsed;
    this.failReason = data.failReason;
    this.skiMode = data.skiMode;
    this.fuelUsed = data.fuelUsed ?? 0;
    this.tumbleCount = data.tumbleCount ?? 0;
    this.restartCount = data.restartCount ?? 0;
    this.winchUseCount = data.winchUseCount ?? 0;
    this.pathsVisited = data.pathsVisited ?? 0;
    this.totalPaths = data.totalPaths ?? 0;
    this.skiGatesHit = data.skiGatesHit ?? 0;
    this.skiGatesTotal = data.skiGatesTotal ?? 0;
    this.skiTrickScore = data.skiTrickScore ?? 0;
    this.skiTrickCount = data.skiTrickCount ?? 0;
    this.skiBestCombo = data.skiBestCombo ?? 0;
    const session = getDailyRunSession();
    this.isDailyRun = !!session;
    
    // Reset navigation state
    this.menuButtons = [];
    this.buttonCallbacks = [];
    this.buttonIsCTA = [];
    this.inputReady = false;
    this.isNavigating = false;

    // Persist per-level completion stats on win (campaign only)
    if (this.won && !this.isDailyRun) {
      const stars = this.getStarCount();
      const bonusMet = this.evaluateBonusObjectives().filter(r => r.met).length;
      markLevelCompleted(this.levelIndex, stars, this.timeUsed, bonusMet);
    }
  }

  private getLevel(): Level {
    const session = getDailyRunSession();
    return session?.level || LEVELS[this.levelIndex] as Level;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const level = this.getLevel();
    const padding = Math.min(20, width * 0.03, height * 0.03);

    // --- Alpine background (reuse menu terrain) ---
    const dpr = window.devicePixelRatio || 1;
    const scaleByHeight = height / 720;
    const scaleByWidth = width / 1280;
    const dprBoost = Math.sqrt(dpr);
    const scaleFactor = Math.min(scaleByHeight, scaleByWidth) * dprBoost;
    const isPortrait = width / height < 1;
    const snowLinePct = isPortrait ? 0.82 : 0.78;
    const snowLineY = height * snowLinePct;
    const footerHeight = Math.round(36 * scaleFactor);

    const levelWeather = { isNight: level.isNight ?? false, weather: level.weather ?? 'clear' };
    const skipGroomer = (!this.won && !!this.failReason) || !!this.skiMode;
    createMenuTerrain(this, width, height, snowLineY, footerHeight, scaleFactor, levelWeather, skipGroomer);

    // Weather effects (night overlay, snow particles)
    this.createWeather(width, height, levelWeather);

    // Contextual victory props (level-specific decorations near the groomer)
    if (this.won && !this.skiMode) {
      this.drawVictoryProps(width, snowLineY, scaleFactor, this.levelIndex);
    }
    if (this.won && this.skiMode) {
      this.drawSkiVictoryProps(width, snowLineY, scaleFactor, this.levelIndex);
    }

    // Wildlife
    this.wildlife = new MenuWildlifeController(this);
    this.wildlife.snowLineY = snowLineY;
    this.wildlife.create(width, height, snowLineY, footerHeight, scaleFactor, levelWeather);

    // Failure-specific groomer effects (replace the stock groomer)
    if (!this.won && !!this.failReason) {
      this.drawGroomerFailEffect(width, snowLineY, scaleFactor, levelWeather);
    }

    // Ski run win — draw standing skier/snowboarder instead of groomer
    if (this.won && this.skiMode) {
      this.drawSkierCelebration(width, snowLineY, scaleFactor, levelWeather);
    }

    // Fail: somber red-brown tint overlay above terrain (above groomer effects)
    if (!this.won) {
      this.add.rectangle(width / 2, height / 2, width, height, 0x3a1a1a, 0.55).setDepth(6);
    }

    // --- Responsive font sizes ---
    // Play result sound
    if (!this.silent) {
      if (this.won) playLevelWin();
      else playLevelFail();
    }
    const baseFontSize = Math.min(20, width / 40, height / 30);
    const titleFontSize = Math.min(32, baseFontSize * 2);
    const statsFontSize = Math.min(22, baseFontSize * 1.25);
    const buttonFontSize = Math.min(20, baseFontSize * 1.1);
    const cx = width / 2;

    // --- Build content top-down using a Y cursor ---
    let cursorY = isPortrait ? height * 0.08 : height * 0.10;
    const sectionGap = 14;

    const icon = this.won ? '🏆' : this.getFailIcon();
    const titleKey = this.won ? 'levelComplete' : 'levelFailed';
    const gradeText = this.won ? this.getGrade() : '';
    const statusStr = this.won ? gradeText : t(titleKey);
    const statusColor = this.won ? THEME.colors.accent : '#ff6666';
    const iconFontSize = Math.min(36, baseFontSize * 2);
    const statusFontSize = Math.min(24, baseFontSize * 1.4);

    // Title panel: calculate height from font sizes, width set after measuring text
    const titlePanelH = iconFontSize + titleFontSize * 1.3 + statusFontSize * 1.3 + 40;
    const titlePanelCY = cursorY + titlePanelH / 2;

    // Create panel (width placeholder, resized after text is measured)
    const titlePanel = this.add.rectangle(cx, titlePanelCY, 400, titlePanelH, 0x1a1a2e, 0.85)
      .setStrokeStyle(2, this.won ? 0x228b22 : 0xcc2200).setDepth(10);

    // Icon
    cursorY += 14;
    this.add.text(cx, cursorY, icon, {
      font: `${iconFontSize}px ${THEME.fonts.familyEmoji}`,
    }).setOrigin(0.5, 0).setDepth(11);
    cursorY += iconFontSize + 4;

    // Level name
    const completeLevelName = level.name
      ? `${t(level.nameKey)} - ${level.name}`
      : t(level.nameKey);
    const nameText = this.add.text(cx, cursorY, completeLevelName, {
      fontFamily: THEME.fonts.family,
      fontSize: `${titleFontSize}px`,
      fontStyle: 'bold',
      color: THEME.colors.textPrimary,
    }).setOrigin(0.5, 0).setDepth(11);
    cursorY += titleFontSize * 1.3 + 2;

    // Grade or "Level Failed"
    const statusTextObj = this.add.text(cx, cursorY, statusStr, {
      fontFamily: THEME.fonts.family,
      fontSize: `${statusFontSize}px`,
      fontStyle: 'bold',
      color: statusColor,
    }).setOrigin(0.5, 0).setDepth(11);

    // Resize panel to fit widest content + padding
    const contentW = Math.max(nameText.width, statusTextObj.width, 200);
    const panelW = contentW + 50;
    titlePanel.setSize(panelW, titlePanelH);

    cursorY = titlePanelCY + titlePanelH / 2 + sectionGap;

    // --- Taunt panel (fail only, capped width) ---
    if (!this.won && this.failReason) {
      const taunt = this.getFailTaunt();
      const tauntFontSize = Math.round(baseFontSize * 1.15);
      const maxTauntW = Math.min(600, width * 0.65);
      const tauntText = this.add.text(cx, cursorY + 10, `« ${taunt} »`, {
        fontFamily: THEME.fonts.family,
        fontSize: `${tauntFontSize}px`,
        fontStyle: 'bold italic',
        color: '#ffdddd',
        align: 'center',
        wordWrap: { width: maxTauntW - 30 },
      }).setOrigin(0.5, 0).setDepth(11);

      const tauntH = tauntText.height + 20;
      const tauntW = Math.min(maxTauntW, tauntText.width + 30);
      this.add.rectangle(cx, cursorY + tauntH / 2, tauntW, tauntH, 0x442222, 0.8)
        .setStrokeStyle(2, 0xff4444).setDepth(10);
      cursorY += tauntH + sectionGap;
    }

    // --- Stats panel (skip for ski crashes — grooming stats aren't relevant) ---
    const isSkiCrash = (this.failReason === 'ski_wipeout' || (this.failReason === 'avalanche' && this.skiMode));
    if (!isSkiCrash) {
      const statsLines: string[] = [];

      // Grooming stats only shown for grooming completions (not ski runs)
      if (!this.skiMode) {
        statsLines.push(t('coverage') + ': ' + this.coverage + '% / ' + level.targetCoverage + '%');
        statsLines.push(t('timeUsed') + ': ' + this.formatTime(this.timeUsed));
      } else {
        statsLines.push(t('timeUsed') + ': ' + this.formatTime(this.timeUsed));
      }

      let bonusResults: { objective: BonusObjective; met: boolean; label: string }[] = [];
      if (this.won && !this.skiMode) {
        bonusResults = this.evaluateBonusObjectives();
        if (bonusResults.length > 0) {
          statsLines.push('');
          bonusResults.forEach(r => statsLines.push((r.met ? '✓ ' : '✗ ') + r.label));
        }
      }

      // Slalom gate results inside the stats panel
      if (this.won && this.skiGatesTotal > 0) {
        statsLines.push('');
        const gatePrefix = this.skiGatesHit === this.skiGatesTotal ? '✓ ' : '';
        statsLines.push(`${gatePrefix}${t('skiRunGates') || 'Gates'}: ${this.skiGatesHit}/${this.skiGatesTotal}`);
      }

      // Trick score results
      if (this.won && this.skiTrickCount > 0) {
        statsLines.push('');
        const scoreStr = this.skiTrickScore.toLocaleString();
        statsLines.push(`${t('skiStyle') || 'Style'}: ${scoreStr} pts`);
        statsLines.push(`${t('skiTricks') || 'Tricks'}: ${this.skiTrickCount}`);
        if (this.skiBestCombo > 1) {
          statsLines.push(`${t('skiBestCombo') || 'Best combo'}: ${this.skiBestCombo}×`);
        }
      }

      const statsText = this.add.text(cx, cursorY, statsLines.join('\n'), {
        fontFamily: THEME.fonts.family,
        fontSize: `${statsFontSize}px`,
        color: THEME.colors.textPrimary,
        align: 'center',
        lineSpacing: 6,
      }).setOrigin(0.5, 0).setDepth(11);

      const statsPanelH = statsText.height + 24;
      const statsPanelW = Math.max(panelW * 0.8, statsText.width + 40);
      const statsPanelCY = cursorY + statsPanelH / 2;
      this.add.rectangle(cx, statsPanelCY, statsPanelW, statsPanelH, 0x1a1a2e, 0.85)
        .setStrokeStyle(1, this.won ? 0x3d7a9b : 0x664444).setDepth(10);
      // Re-center text vertically in the panel
      statsText.setY(statsPanelCY - statsText.height / 2);

      if (this.won && bonusResults.length > 0 && bonusResults.every(r => r.met)) {
        statsText.setColor(THEME.colors.success);
      }

      cursorY += statsPanelH + sectionGap;
    }

    // Game complete message for final level win
    if (this.won && !this.isDailyRun && this.levelIndex === LEVELS.length - 1) {
      const gcMsg = this.add.text(cx, cursorY, '🎉 ' + (t('gameComplete') || 'Jeu terminé !') + ' 🎉', {
        fontFamily: THEME.fonts.family,
        fontSize: `${Math.round(baseFontSize * 1.25)}px`,
        fontStyle: 'bold',
        color: THEME.colors.accent,
      }).setOrigin(0.5, 0).setDepth(11);
      cursorY += gcMsg.height + sectionGap;
    }

    // --- Buttons ---
    const buttonY = Math.min(cursorY + 4, height - 50);
    const buttonPadding2 = { x: Math.max(15, padding), y: Math.max(8, padding * 0.6) };
    const buttonContainer = this.add.container(0, 0).setDepth(11);
    let skiMode = getString(STORAGE_KEYS.SKI_MODE) || 'random';
    if (skiMode === 'random') skiMode = Math.random() < 0.5 ? 'ski' : 'snowboard';
    const skiLabel = skiMode === 'snowboard' ? (t('rideIt') || 'Ride it!') : (t('skiIt') || 'Ski it!');

    if (this.isDailyRun && this.won) {
      // Track daily run completion per rank
      const session = getDailyRunSession();
      if (session?.isDaily && session.rank) {
        const today = new Date().toISOString().slice(0, 10);
        const data = getJSON<{ date: string; ranks: string[] }>(STORAGE_KEYS.DAILY_RUN_DATE, { date: '', ranks: [] });
        const rank = session.rank;
        if (data.date !== today) {
          setJSON(STORAGE_KEYS.DAILY_RUN_DATE, { date: today, ranks: [rank] });
        } else if (!data.ranks.includes(rank)) {
          data.ranks.push(rank);
          setJSON(STORAGE_KEYS.DAILY_RUN_DATE, data);
        }
      }
      // Daily run complete — ski it + menu
      this.addButton(buttonContainer, skiLabel, buttonFontSize, buttonPadding2,
        () => this.navigateTo('SkiRunScene', { level: this.levelIndex, mode: skiMode as 'ski' | 'snowboard' }), true);
      this.addButton(buttonContainer, t('dailyRuns') || 'Daily Runs', buttonFontSize, buttonPadding2,
        () => this.navigateTo('DailyRunsScene'));
      this.addButton(buttonContainer, t('menu') || 'Menu', buttonFontSize, buttonPadding2,
        () => this.navigateTo('MenuScene'));
    } else if (this.isDailyRun && !this.won) {
      // Daily run failed — retry + menu
      this.addButton(buttonContainer, t('retry') || 'Retry', buttonFontSize, buttonPadding2,
        () => this.navigateTo('GameScene', { level: this.levelIndex }), true);
      this.addButton(buttonContainer, t('dailyRuns') || 'Daily Runs', buttonFontSize, buttonPadding2,
        () => this.navigateTo('DailyRunsScene'));
      this.addButton(buttonContainer, t('menu') || 'Menu', buttonFontSize, buttonPadding2,
        () => this.navigateTo('MenuScene'));
    } else if (this.won && this.levelIndex < LEVELS.length - 1) {
      this.addButton(buttonContainer, t('nextLevel') || 'Next Level', buttonFontSize, buttonPadding2,
        () => this.navigateTo('GameScene', { level: this.levelIndex + 1 }), true);
      this.addButton(buttonContainer, skiLabel, buttonFontSize, buttonPadding2,
        () => this.navigateTo('SkiRunScene', { level: this.levelIndex, mode: skiMode as 'ski' | 'snowboard' }));
      this.addButton(buttonContainer, t('menu') || 'Menu', buttonFontSize, buttonPadding2,
        () => this.navigateTo('MenuScene'));
    } else if (this.won && this.levelIndex === LEVELS.length - 1) {
      this.addButton(buttonContainer, t('viewCredits') || 'View Credits', buttonFontSize, buttonPadding2,
        () => this.navigateTo('CreditsScene'), true);
      this.addButton(buttonContainer, skiLabel, buttonFontSize, buttonPadding2,
        () => this.navigateTo('SkiRunScene', { level: this.levelIndex, mode: skiMode as 'ski' | 'snowboard' }));
      this.addButton(buttonContainer, t('menu') || 'Menu', buttonFontSize, buttonPadding2,
        () => this.navigateTo('MenuScene'));
    } else if (isSkiCrash) {
      // Ski crash — retry the run (re-randomize if needed) + next level + menu
      const retryLabel = skiMode === 'snowboard' ? (t('rideAgain') || 'Ride Again!') : (t('skiAgain') || 'Ski Again!');
      this.addButton(buttonContainer, retryLabel, buttonFontSize, buttonPadding2,
        () => this.navigateTo('SkiRunScene', { level: this.levelIndex, mode: skiMode as 'ski' | 'snowboard' }), true);
      if (this.levelIndex < LEVELS.length - 1) {
        this.addButton(buttonContainer, t('nextLevel') || 'Next Level', buttonFontSize, buttonPadding2,
          () => this.navigateTo('GameScene', { level: this.levelIndex + 1 }));
      } else {
        this.addButton(buttonContainer, t('viewCredits') || 'View Credits', buttonFontSize, buttonPadding2,
          () => this.navigateTo('CreditsScene'));
      }
      this.addButton(buttonContainer, t('menu') || 'Menu', buttonFontSize, buttonPadding2,
        () => this.navigateTo('MenuScene'));
    } else {
      this.addButton(buttonContainer, t('retry') || 'Retry', buttonFontSize, buttonPadding2,
        () => this.navigateTo('GameScene', { level: this.levelIndex, restartCount: this.restartCount + 1 }), true);
      this.addButton(buttonContainer, t('menu') || 'Menu', buttonFontSize, buttonPadding2,
        () => this.navigateTo('MenuScene'));
    }

    // Position buttons horizontally centered
    const gap = 20;
    let totalBtnW = 0;
    this.menuButtons.forEach((btn, i) => { totalBtnW += btn.width; if (i > 0) totalBtnW += gap; });
    let btnX = cx - totalBtnW / 2;
    this.menuButtons.forEach((btn) => {
      btn.setPosition(btnX, buttonY);
      btnX += btn.width + gap;
    });

    // Keyboard navigation (horizontal layout)
    this.buttonNav = createMenuButtonNav(
      this.menuButtons, this.buttonCallbacks, ctaStyler(this.buttonIsCTA),
    );
    this.input.keyboard?.on('keydown-LEFT', () => this.buttonNav.navigate(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.buttonNav.navigate(1));
    this.input.keyboard?.on('keydown-ENTER', () => { if (this.inputReady) this.buttonNav.activate(); });
    this.input.keyboard?.on('keydown-SPACE', () => { if (this.inputReady) this.buttonNav.activate(); });
    this.input.keyboard?.on('keydown-ESC', () => { if (this.inputReady) this.navigateTo('MenuScene'); });
    
    // Initialize selection
    this.buttonNav.refreshStyles();

    // Initialize gamepad navigation
    this.gamepadNav = createGamepadMenuNav(this, 'horizontal', {
      onNavigate: (dir) => this.buttonNav.navigate(dir),
      onConfirm: () => { if (this.inputReady) this.buttonNav.activate(); },
      onBack: () => { if (this.inputReady) this.navigateTo('MenuScene'); },
    });
    this.gamepadNav.initState();

    // Handle resize
    this.scale.on('resize', this.handleResize, this);

    Accessibility.announce(t(titleKey) + '. ' + t('coverage') + ' ' + this.coverage + '%');

    // Delay accepting input to prevent held keys from prior scene from firing
    this.inputReady = false;
    this.inputReadyTimer = this.time.delayedCall(BALANCE.SCENE_INPUT_DELAY, () => { this.inputReady = true; });

    this.events.once('shutdown', this.shutdown, this);
  }

  private resizing = false;

  private handleResize(): void {
    if (this.resizing || !this.scene?.manager || !this.sys?.isActive()) return;
    this.resizing = true;
    requestAnimationFrame(() => {
      if (!this.scene?.manager || !this.sys?.isActive()) {
        this.resizing = false;
        return;
      }
      this.scene.restart(this.scene.settings.data);
      this.resizing = false;
    });
  }

  shutdown(): void {
    this.input.keyboard?.removeAllListeners();
    this.scale.off('resize', this.handleResize, this);
    this.wildlife?.destroy();
    
    // Clean up inputReady timer if scene shutdown before it fires
    if (this.inputReadyTimer) {
      this.inputReadyTimer.destroy();
      this.inputReadyTimer = null;
    }
  }

  private gamepadNav!: GamepadMenuNav;

  update(time: number, delta: number): void {
    this.gamepadNav.update(delta);
    this.wildlife.update(time, delta);
  }
  
  private addButton(
    container: Phaser.GameObjects.Container,
    text: string,
    fontSize: number,
    padding: { x: number; y: number },
    callback: () => void,
    isCTA: boolean = false
  ): void {
    const index = this.menuButtons.length;
    const bgColor = isCTA ? THEME.colors.buttonCTAHex : THEME.colors.buttonPrimaryHex;
    const btn = this.add.text(0, 0, text, {
      fontFamily: THEME.fonts.family,
      fontSize: `${fontSize}px`,
      color: THEME.colors.textPrimary,
      backgroundColor: bgColor,
      padding,
    }).setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.buttonNav.select(index))
      .on('pointerout', () => this.buttonNav.refreshStyles())
      .on('pointerdown', () => { playClick(); callback(); });
    
    this.menuButtons.push(btn);
    this.buttonCallbacks.push(callback);
    this.buttonIsCTA.push(isCTA);
    container.add(btn);
  }

  private isNavigating = false;

  /** Clean up all game scenes and navigate to a target scene */
  private navigateTo(targetKey: string, data?: Record<string, unknown>): void {
    if (this.isNavigating) return;
    this.isNavigating = true;
    // Clear groomed tile state when leaving for non-ski destinations
    if (targetKey !== 'SkiRunScene') clearGroomedTiles();
    resetGameScenes(this.game, targetKey, data);
  }

  private formatTime(seconds: number): string {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins + ':' + secs.toString().padStart(2, '0');
  }

  private getFailIcon(): string {
    switch (this.failReason) {
      case 'cliff': return '🏔️';
      case 'fuel': return '⛽';
      case 'time': return '⏰';
      case 'avalanche': return '❄️';
      case 'tumble': return '💥';
      case 'feature': return '🚧';
      case 'ski_wipeout': return '🎿';
      default: return '❌';
    }
  }

  private getFailTaunt(): string {
    const taunts: Record<string, string[]> = {
      cliff: [
        t('tauntCliff1'), t('tauntCliff2'), t('tauntCliff3'), t('tauntCliff4'), t('tauntCliff5'),
      ],
      fuel: [
        t('tauntFuel1'), t('tauntFuel2'), t('tauntFuel3'), t('tauntFuel4'), t('tauntFuel5'),
      ],
      time: [
        t('tauntTime1'), t('tauntTime2'), t('tauntTime3'), t('tauntTime4'), t('tauntTime5'),
      ],
      avalanche: [
        t('tauntAvalanche1'), t('tauntAvalanche2'), t('tauntAvalanche3'), t('tauntAvalanche4'), t('tauntAvalanche5'),
      ],
      tumble: [
        t('tauntTumble1'), t('tauntTumble2'), t('tauntTumble3'), t('tauntTumble4'), t('tauntTumble5'),
      ],
      feature: [
        t('tauntFeature1'), t('tauntFeature2'), t('tauntFeature3'), t('tauntFeature4'), t('tauntFeature5'),
      ],
      ski_wipeout: [
        t('tauntSkiWipeout1'), t('tauntSkiWipeout2'), t('tauntSkiWipeout3'), t('tauntSkiWipeout4'), t('tauntSkiWipeout5'),
      ],
    };

    const options = taunts[this.failReason || ''] || [t('tryAgain')];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getStarCount(): number {
    const level = this.getLevel();
    const timePercent = level.timeLimit > 0 ? this.timeUsed / level.timeLimit : 0;
    const coverageBonus = this.coverage - level.targetCoverage;
    const bonusResults = this.evaluateBonusObjectives();
    const bonusMet = bonusResults.filter(r => r.met).length;
    const bonusTotal = bonusResults.length;
    const bonusBoost = bonusTotal > 0 ? bonusMet / bonusTotal : 0;

    if ((timePercent < 0.5 && coverageBonus >= 10) || (bonusBoost === 1 && coverageBonus >= 5)) return 3;
    if ((timePercent < 0.75 && coverageBonus >= 5) || bonusBoost >= 0.5) return 2;
    return 1;
  }

  private getGrade(): string {
    const stars = this.getStarCount();
    if (stars === 3) return '⭐⭐⭐ ' + t('excellent');
    if (stars === 2) return '⭐⭐ ' + t('good');
    return '⭐ ' + t('passed');
  }

  private evaluateBonusObjectives(): { objective: BonusObjective; met: boolean; label: string }[] {
    const level = this.getLevel();
    if (!level.bonusObjectives || level.bonusObjectives.length === 0) return [];

    const state: BonusEvalState = {
      fuelUsed: this.fuelUsed,
      restartCount: this.restartCount,
      timeUsed: this.timeUsed,
      winchUseCount: this.winchUseCount,
      pathsVisited: this.pathsVisited,
      totalPaths: this.totalPaths,
      groomQuality: this.groomQuality,
    };

    return evaluateAllBonusObjectives(level.bonusObjectives, state).map(r => {
      // Append progress info to labels that show current values
      let label = r.label;
      switch (r.objective.type) {
        case 'exploration': label += ' ' + this.pathsVisited + '/' + this.totalPaths; break;
        case 'precision_grooming':
        case 'pipe_mastery': label += ' ' + this.groomQuality + '%'; break;
      }
      return { ...r, label };
    });
  }

  /** Weather effects: night overlay, storm haze, snow particles. */
  private createWeather(width: number, height: number, weather?: { isNight: boolean; weather: string }): void {
    if (!weather) return;
    if (weather.isNight) {
      this.add.rectangle(width / 2, height / 2, width, height, 0x000022).setAlpha(0.45).setDepth(5);
    }
    if (weather.weather === 'storm') {
      this.add.rectangle(width / 2, height / 2, width, height, 0x667788).setAlpha(0.25).setDepth(5);
    }
    if (weather.weather !== 'clear' && this.textures.exists('snow_ungroomed')) {
      const isStorm = weather.weather === 'storm';
      this.add.particles(0, 0, 'snow_ungroomed', {
        x: { min: 0, max: width },
        y: -10,
        quantity: isStorm ? 6 : 2,
        frequency: isStorm ? 50 : 200,
        speedY: isStorm ? { min: 120, max: 280 } : { min: 20, max: 60 },
        speedX: isStorm ? { min: -100, max: -30 } : { min: -10, max: 10 },
        scale: isStorm ? { start: 0.4, end: 0.1 } : { start: 0.3, end: 0.08 },
        alpha: { start: 0.8, end: 0.3 },
        lifespan: isStorm ? 2500 : 5000,
        blendMode: Phaser.BlendModes.ADD,
        tint: isStorm ? 0xCCDDFF : 0xFFFFFF,
      }).setDepth(200);
    }
  }

  /** Draw level-specific props near the groomer on victory. */
  private drawVictoryProps(width: number, snowLineY: number, scaleFactor: number, levelIndex: number): void {
    const sx = width / 1024;
    const isLandscape = width > snowLineY * 1.5;
    const gx = isLandscape ? width * 0.82 : width / 2 + 140 * sx;
    const s = 3.0 * scaleFactor;
    const groundY = snowLineY;
    const g = this.add.graphics().setDepth(5 + snowLineY * 0.001 + 0.002);

    switch (levelIndex) {
      case 1: // Marmottes — cozy chalet
        this.drawChalet(g, gx - 50 * s, groundY, s);
        break;
      case 2: // Chamois — rock with snow patch
        this.drawSnowRock(g, gx - 50 * s, groundY, s);
        break;
      case 3: // Air Zone — kicker ramp
        this.drawParkKicker(g, gx - 40 * s, groundY, s);
        break;
      case 4: // L'Aigle — steep slope warning sign
        this.drawSlopeSign(g, gx - 35 * s, groundY, s);
        break;
      case 5: // Le Glacier — winch anchor with cable to groomer
        this.drawWinchPost(g, gx - 45 * s, groundY, s, gx);
        break;
      case 6: // Tube — halfpipe walls
        this.drawHalfpipeWalls(g, gx, groundY, s);
        break;
      case 7: // La Verticale — stars and moon
        this.drawNightSky(width, snowLineY, s);
        break;
      case 8: // Col Dangereux — avalanche debris
        this.drawAvalancheDebris(g, gx - 50 * s, groundY, s);
        break;
      case 10: // Coupe des Aiguilles — trophy
        this.drawTrophy(g, gx - 40 * s, groundY, s);
        break;
    }
  }

  private drawChalet(g: Phaser.GameObjects.Graphics, x: number, groundY: number, s: number): void {
    // Walls
    g.fillStyle(0x8b4513);
    g.fillRect(x - 10 * s, groundY - 16 * s, 20 * s, 16 * s);
    // Roof
    g.fillStyle(0xa52a2a);
    g.fillRect(x - 12 * s, groundY - 22 * s, 24 * s, 6 * s);
    // Roof overhang
    g.fillStyle(0x8b2020);
    g.fillRect(x - 12 * s, groundY - 16 * s, 24 * s, 1 * s);
    // Snow on roof
    g.fillStyle(0xf0f5f8);
    g.fillRect(x - 11 * s, groundY - 24 * s, 22 * s, 3 * s);
    // Windows (warm glow)
    g.fillStyle(0xffff00);
    g.fillRect(x - 7 * s, groundY - 13 * s, 4 * s, 4 * s);
    g.fillRect(x + 3 * s, groundY - 13 * s, 4 * s, 4 * s);
    // Door
    g.fillStyle(0x5a3018);
    g.fillRect(x - 2 * s, groundY - 8 * s, 4 * s, 8 * s);
  }

  private drawSnowRock(g: Phaser.GameObjects.Graphics, x: number, groundY: number, s: number): void {
    // Rock base
    g.fillStyle(0x696969);
    g.fillRect(x - 10 * s, groundY - 10 * s, 20 * s, 10 * s);
    // Rock top
    g.fillStyle(0x888888);
    g.fillRect(x - 8 * s, groundY - 14 * s, 16 * s, 4 * s);
    // Snow patch on top
    g.fillStyle(0xf0f5f8);
    g.fillRect(x - 6 * s, groundY - 16 * s, 12 * s, 3 * s);
    // Shadow detail
    g.fillStyle(0x555555);
    g.fillRect(x - 10 * s, groundY - 2 * s, 20 * s, 2 * s);
  }

  private drawParkKicker(g: Phaser.GameObjects.Graphics, x: number, groundY: number, s: number): void {
    // Snow ramp — stepped rectangles to approximate a slope
    g.fillStyle(0xddeeff);
    g.fillRect(x - 12 * s, groundY - 3 * s, 24 * s, 3 * s);
    g.fillRect(x - 6 * s, groundY - 6 * s, 18 * s, 3 * s);
    g.fillRect(x, groundY - 9 * s, 12 * s, 3 * s);
    g.fillRect(x + 4 * s, groundY - 12 * s, 8 * s, 3 * s);
    g.fillRect(x + 7 * s, groundY - 15 * s, 5 * s, 3 * s);
    g.fillRect(x + 9 * s, groundY - 18 * s, 3 * s, 3 * s);
    // Ramp edge highlight
    g.fillStyle(0xaabbcc);
    g.fillRect(x - 12 * s, groundY - 3 * s, 1 * s, 3 * s);
    g.fillRect(x - 6 * s, groundY - 6 * s, 1 * s, 3 * s);
    g.fillRect(x, groundY - 9 * s, 1 * s, 3 * s);
    g.fillRect(x + 4 * s, groundY - 12 * s, 1 * s, 3 * s);
    g.fillRect(x + 7 * s, groundY - 15 * s, 1 * s, 3 * s);
    g.fillRect(x + 9 * s, groundY - 18 * s, 1 * s, 3 * s);
  }

  private drawSlopeSign(g: Phaser.GameObjects.Graphics, x: number, groundY: number, s: number): void {
    // Danger pole — yellow/black stripes
    g.fillStyle(0xffcc00);
    g.fillRect(x - 1.5 * s, groundY - 30 * s, 3 * s, 30 * s);
    g.fillStyle(0x111111);
    for (let i = 0; i < 5; i++) {
      g.fillRect(x - 1.5 * s, groundY - (6 + i * 6) * s, 3 * s, 3 * s);
    }
    // Warning sign — yellow diamond with exclamation
    g.fillStyle(0xddaa00);
    g.fillRect(x - 6 * s, groundY - 38 * s, 12 * s, 12 * s);
    // Border
    g.fillStyle(0x111111);
    g.fillRect(x - 6 * s, groundY - 38 * s, 12 * s, 1 * s);
    g.fillRect(x - 6 * s, groundY - 27 * s, 12 * s, 1 * s);
    g.fillRect(x - 6 * s, groundY - 38 * s, 1 * s, 12 * s);
    g.fillRect(x + 5 * s, groundY - 38 * s, 1 * s, 12 * s);
    // Exclamation mark
    g.fillRect(x - 1 * s, groundY - 36 * s, 2 * s, 6 * s);
    g.fillRect(x - 1 * s, groundY - 29 * s, 2 * s, 2 * s);
  }

  private drawWinchPost(g: Phaser.GameObjects.Graphics, x: number, groundY: number, s: number, groomerX: number): void {
    // Anchor post
    g.fillStyle(0x888888);
    g.fillRect(x - 2 * s, groundY - 24 * s, 4 * s, 24 * s);
    // Anchor cross-bar
    g.fillRect(x - 6 * s, groundY - 24 * s, 12 * s, 3 * s);
    // Cable from anchor top to groomer rear
    g.fillStyle(0x999999);
    const cableY = groundY - 22 * s;
    const cableEndX = groomerX - 8 * s;
    const cableEndY = groundY - 10 * s;
    // Stepped cable segments (rectangle-only catenary)
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const nx = x + 6 * s + (cableEndX - x - 6 * s) * t;
      const sag = Math.sin(t * Math.PI) * 4 * s;
      const ny = cableY + (cableEndY - cableY) * t + sag;
      const segW = (cableEndX - x - 6 * s) / steps;
      g.fillRect(nx, ny, segW + 1, 1.5 * s);
    }
  }

  private drawHalfpipeWalls(g: Phaser.GameObjects.Graphics, cx: number, groundY: number, s: number): void {
    // Left wall — stepped rectangles
    g.fillStyle(0xddeeff);
    g.fillRect(cx - 45 * s, groundY - 22 * s, 3 * s, 22 * s);
    g.fillRect(cx - 42 * s, groundY - 14 * s, 3 * s, 14 * s);
    g.fillRect(cx - 39 * s, groundY - 8 * s, 2 * s, 8 * s);
    g.fillRect(cx - 37 * s, groundY - 4 * s, 2 * s, 4 * s);
    // Right wall — stepped rectangles
    g.fillRect(cx + 42 * s, groundY - 22 * s, 3 * s, 22 * s);
    g.fillRect(cx + 39 * s, groundY - 14 * s, 3 * s, 14 * s);
    g.fillRect(cx + 37 * s, groundY - 8 * s, 2 * s, 8 * s);
    g.fillRect(cx + 35 * s, groundY - 4 * s, 2 * s, 4 * s);
    // Lip highlights
    g.fillStyle(0xaabbcc);
    g.fillRect(cx - 42 * s, groundY - 22 * s, 1 * s, 22 * s);
    g.fillRect(cx + 42 * s, groundY - 22 * s, 1 * s, 22 * s);
  }

  private drawNightSky(_width: number, snowLineY: number, s: number): void {
    const g = this.add.graphics().setDepth(3);
    const w = this.scale.width;
    // Moon — rectangle with bite taken out (crescent)
    g.fillStyle(0xffffcc);
    g.fillRect(120 * s - 10 * s, snowLineY * 0.15 - 10 * s, 20 * s, 20 * s);
    // Shadow bite for crescent
    g.fillStyle(0x000022);
    g.fillRect(124 * s - 8 * s, snowLineY * 0.14 - 10 * s, 18 * s, 20 * s);
    // Stars — small squares
    g.fillStyle(0xffffff);
    const starPositions = [
      [0.15, 0.08], [0.3, 0.05], [0.45, 0.12], [0.55, 0.04],
      [0.7, 0.09], [0.85, 0.06], [0.25, 0.15], [0.65, 0.14],
      [0.4, 0.02], [0.8, 0.11], [0.1, 0.18], [0.5, 0.08],
    ];
    for (const [px, py] of starPositions) {
      const sz = (1 + Math.random() * 1.5) * s;
      g.fillRect(w * px, snowLineY * py, sz, sz);
    }
  }

  private drawAvalancheDebris(g: Phaser.GameObjects.Graphics, x: number, groundY: number, s: number): void {
    // Snow boulders — stacked rectangles
    g.fillStyle(0xdde8f0);
    g.fillRect(x - 6 * s, groundY - 10 * s, 12 * s, 10 * s);
    g.fillRect(x - 18 * s, groundY - 6 * s, 8 * s, 6 * s);
    g.fillRect(x + 6 * s, groundY - 8 * s, 10 * s, 8 * s);
    g.fillRect(x - 10 * s, groundY - 12 * s, 6 * s, 5 * s);
    // Rock fragments
    g.fillStyle(0x696969);
    g.fillRect(x - 12 * s, groundY - 4 * s, 3 * s, 3 * s);
    g.fillRect(x + 8 * s, groundY - 2 * s, 2 * s, 2 * s);
    // Broken tree
    g.fillStyle(0x5a3a1a);
    g.fillRect(x + 15 * s, groundY - 12 * s, 2 * s, 12 * s);
    g.fillStyle(0x2d5a1a);
    g.fillRect(x + 12 * s, groundY - 16 * s, 8 * s, 5 * s);
  }

  private drawTrophy(g: Phaser.GameObjects.Graphics, x: number, groundY: number, s: number): void {
    // Pedestal
    g.fillStyle(0x4a3a2a);
    g.fillRect(x - 8 * s, groundY - 6 * s, 16 * s, 6 * s);
    g.fillStyle(0x5a4a3a);
    g.fillRect(x - 6 * s, groundY - 8 * s, 12 * s, 2 * s);
    // Cup stem
    g.fillStyle(0xffd700);
    g.fillRect(x - 1.5 * s, groundY - 18 * s, 3 * s, 10 * s);
    // Cup bowl
    g.fillRect(x - 7 * s, groundY - 28 * s, 14 * s, 10 * s);
    // Cup interior
    g.fillStyle(0xffd700);
    g.fillRect(x - 5 * s, groundY - 26 * s, 10 * s, 6 * s);
    // Handles — small rectangles on sides
    g.fillStyle(0xffd700);
    g.fillRect(x - 10 * s, groundY - 26 * s, 3 * s, 2 * s);
    g.fillRect(x - 10 * s, groundY - 24 * s, 2 * s, 4 * s);
    g.fillRect(x - 10 * s, groundY - 20 * s, 3 * s, 2 * s);
    g.fillRect(x + 7 * s, groundY - 26 * s, 3 * s, 2 * s);
    g.fillRect(x + 8 * s, groundY - 24 * s, 2 * s, 4 * s);
    g.fillRect(x + 7 * s, groundY - 20 * s, 3 * s, 2 * s);
    // Star on cup — small cross
    g.fillStyle(0xfffff0);
    g.fillRect(x - 2 * s, groundY - 24 * s, 4 * s, 1 * s);
    g.fillRect(x - 0.5 * s, groundY - 25.5 * s, 1 * s, 4 * s);
  }

  /** Draw failure-specific visual effects on the terrain groomer. */
  private drawGroomerFailEffect(width: number, snowLineY: number, scaleFactor: number, weather: { isNight: boolean; weather: string }): void {
    const sx = width / 1024;
    const gx = width / 2 + 140 * sx;
    const s = 2.0 * scaleFactor;
    const groundY = snowLineY;
    const isStorm = weather.weather === 'storm';
    const g = this.add.graphics().setDepth(5 + snowLineY * 0.001 + 0.001);

    switch (this.failReason) {
      case 'tumble': {
        // Upside-down groomer: cabin at bottom, tracks on top, full detail
        // Cabin roof (now at bottom)
        g.fillStyle(0xaa1a00);
        g.fillRect(gx - 10 * s, groundY - 4 * s, 24 * s, 3 * s);
        // Window glass (inverted)
        g.fillStyle(0x87ceeb);
        g.fillRect(gx - 5 * s, groundY - 8 * s, 14 * s, 5 * s);
        // Cabin frame
        g.fillStyle(0x1e90ff);
        g.fillRect(gx - 8 * s, groundY - 10 * s, 20 * s, 9 * s);
        // Body — red, sits above cabin (inverted)
        g.fillStyle(0xcc2200);
        g.fillRect(gx - 18 * s, groundY - 24 * s, 36 * s, 14 * s);
        // Front blade (inverted)
        g.fillStyle(0x888888);
        g.fillRect(gx - 26 * s, groundY - 22 * s, 10 * s, 10 * s);
        g.fillStyle(0xaaaaaa);
        g.fillRect(gx - 27 * s, groundY - 22 * s, 4 * s, 12 * s);
        // Exhaust pipe (now points down from body)
        g.fillStyle(0x555555);
        g.fillRect(gx + 10 * s, groundY - 8 * s, 3 * s, 8 * s);
        // Tiller arm (inverted)
        g.fillStyle(0x777777);
        g.fillRect(gx + 22 * s, groundY - 18 * s, 8 * s, 3 * s);
        // Tiller drum
        g.fillStyle(0x555555);
        g.fillRect(gx + 28 * s, groundY - 22 * s, 6 * s, 8 * s);
        // Tracks on top (inverted)
        g.fillStyle(0x333333);
        g.fillRect(gx - 24 * s, groundY - 32 * s, 48 * s, 8 * s);
        g.fillStyle(0x444444);
        for (let tx = -22; tx < 24; tx += 6) {
          g.fillRect(gx + tx * s, groundY - 31 * s, 3 * s, 6 * s);
        }
        // Smoke/dust clouds around wreck
        g.fillStyle(0x888888, 0.5);
        g.fillRect(gx - 32 * s, groundY - 8 * s, 8 * s, 5 * s);
        g.fillRect(gx + 26 * s, groundY - 6 * s, 10 * s, 4 * s);
        // Storm snow on exposed tracks (top)
        if (isStorm) {
          g.fillStyle(0xf0f5f8);
          g.fillRect(gx - 24 * s, groundY - 35 * s, 48 * s, 3 * s);
        }
        break;
      }
      case 'avalanche': {
        if (this.skiMode) {
          // Skier buried under snow — only hand and pole poking out
          g.fillStyle(0xf0f5f8);
          g.fillRect(gx - 24 * s, groundY - 16 * s, 48 * s, 16 * s);
          g.fillRect(gx - 18 * s, groundY - 24 * s, 36 * s, 10 * s);
          g.fillRect(gx - 12 * s, groundY - 30 * s, 24 * s, 8 * s);
          g.fillRect(gx - 8 * s, groundY - 34 * s, 16 * s, 6 * s);
          // Snow texture detail
          g.fillStyle(0xe0e8ef);
          g.fillRect(gx - 14 * s, groundY - 18 * s, 5 * s, 3 * s);
          g.fillRect(gx + 6 * s, groundY - 22 * s, 6 * s, 3 * s);
          // Gloved hand poking out
          const isSnowboard = this.skiMode === 'snowboard';
          g.fillStyle(isSnowboard ? 0xff3388 : 0xcc2288);
          g.fillRect(gx + 8 * s, groundY - 38 * s, 4 * s, 6 * s);
          // Ski pole at an angle
          g.fillStyle(0x444444);
          g.fillRect(gx + 10 * s, groundY - 50 * s, 2 * s, 16 * s);
          g.fillStyle(0xffcc00);
          g.fillRect(gx + 9 * s, groundY - 52 * s, 4 * s, 3 * s);
        } else {
          // Buried under snow: pile of snow over the groomer
          g.fillStyle(0xf0f5f8);
          g.fillRect(gx - 28 * s, groundY - 20 * s, 56 * s, 20 * s);
          g.fillRect(gx - 22 * s, groundY - 28 * s, 44 * s, 10 * s);
          g.fillRect(gx - 16 * s, groundY - 34 * s, 32 * s, 8 * s);
          g.fillRect(gx - 10 * s, groundY - 38 * s, 20 * s, 6 * s);
          // Snow texture detail
          g.fillStyle(0xe0e8ef);
          g.fillRect(gx - 18 * s, groundY - 22 * s, 6 * s, 3 * s);
          g.fillRect(gx + 8 * s, groundY - 26 * s, 8 * s, 3 * s);
          g.fillRect(gx - 4 * s, groundY - 32 * s, 10 * s, 2 * s);
          // Tip of cabin roof poking out
          g.fillStyle(0xaa1a00);
          g.fillRect(gx - 6 * s, groundY - 40 * s, 12 * s, 3 * s);
        }
        break;
      }
      case 'cliff': {
        // Groomer tilted forward, front end dropped off cliff edge
        // Tracks — tilted (rear higher, front lower)
        g.fillStyle(0x333333);
        g.fillRect(gx - 24 * s, groundY - 6 * s, 24 * s, 6 * s); // rear half level
        g.fillRect(gx, groundY - 2 * s, 24 * s, 6 * s); // front half dropped
        g.fillStyle(0x444444);
        for (let tx = -22; tx < 0; tx += 6) {
          g.fillRect(gx + tx * s, groundY - 5 * s, 3 * s, 4 * s);
        }
        for (let tx = 2; tx < 24; tx += 6) {
          g.fillRect(gx + tx * s, groundY - 1 * s, 3 * s, 4 * s);
        }
        // Body — tilted
        g.fillStyle(0xcc2200);
        g.fillRect(gx - 18 * s, groundY - 20 * s, 18 * s, 14 * s); // rear half
        g.fillRect(gx, groundY - 16 * s, 18 * s, 14 * s); // front half lower
        // Cabin — on rear half
        g.fillStyle(0x1e90ff);
        g.fillRect(gx - 8 * s, groundY - 30 * s, 20 * s, 11 * s);
        g.fillStyle(0x87ceeb);
        g.fillRect(gx - 5 * s, groundY - 28 * s, 14 * s, 7 * s);
        // Cabin roof
        g.fillStyle(0xaa1a00);
        g.fillRect(gx - 10 * s, groundY - 32 * s, 24 * s, 3 * s);
        // Front blade — dangling lower
        g.fillStyle(0x888888);
        g.fillRect(gx - 26 * s, groundY - 10 * s, 10 * s, 10 * s);
        g.fillStyle(0xaaaaaa);
        g.fillRect(gx - 27 * s, groundY - 12 * s, 4 * s, 12 * s);
        // Exhaust pipe
        g.fillStyle(0x555555);
        g.fillRect(gx + 10 * s, groundY - 36 * s, 3 * s, 8 * s);
        // Falling rocks/debris below edge
        g.fillStyle(0x6a5e52);
        g.fillRect(gx + 16 * s, groundY + 6 * s, 5 * s, 4 * s);
        g.fillRect(gx + 22 * s, groundY + 10 * s, 3 * s, 3 * s);
        g.fillRect(gx + 10 * s, groundY + 8 * s, 4 * s, 3 * s);
        // Warning stripes at cliff edge
        g.fillStyle(0xff4444);
        g.fillRect(gx - 2 * s, groundY - 1 * s, 4 * s, 2 * s);
        g.fillRect(gx + 4 * s, groundY - 1 * s, 4 * s, 2 * s);
        // Storm snow
        if (isStorm) {
          g.fillStyle(0xf0f5f8);
          g.fillRect(gx - 10 * s, groundY - 35 * s, 24 * s, 3 * s);
          g.fillRect(gx - 18 * s, groundY - 21 * s, 18 * s, 2 * s);
        }
        break;
      }
      case 'fuel': {
        // Empty fuel — groomer with open hood and fuel warning
        // Smoke from engine
        g.fillStyle(0x666666, 0.6);
        g.fillRect(gx + 8 * s, groundY - 42 * s, 6 * s, 4 * s);
        g.fillRect(gx + 6 * s, groundY - 48 * s, 8 * s, 5 * s);
        g.fillRect(gx + 4 * s, groundY - 54 * s, 10 * s, 5 * s);
        // Open hood (popped up)
        g.fillStyle(0xcc2200);
        g.fillRect(gx - 18 * s, groundY - 28 * s, 36 * s, 3 * s);
        // Empty fuel gauge (red indicator)
        g.fillStyle(0xff0000);
        g.fillRect(gx + 16 * s, groundY - 20 * s, 4 * s, 4 * s);
        g.fillStyle(0x440000);
        g.fillRect(gx + 17 * s, groundY - 19 * s, 2 * s, 2 * s);
        break;
      }
      case 'time': {
        // Clock ran out — groomer with zzz sleep marks
        g.fillStyle(0xaaaaaa, 0.7);
        // Zzz floating above cabin
        const zzz = this.add.text(gx + 14 * s, groundY - 46 * s, 'zzZ', {
          fontFamily: THEME.fonts.family,
          fontSize: `${Math.round(14 * s)}px`,
          fontStyle: 'bold',
          color: '#aaaacc',
        }).setDepth(5 + snowLineY * 0.001 + 0.002).setAngle(-10);
        break;
      }
      case 'feature': {
        // Groomer crashed through a park feature — nose-dipped, debris scattered
        // Tracks (front dipped from impact)
        g.fillStyle(0x333333);
        g.fillRect(gx - 24 * s, groundY - 10 * s, 26 * s, 6 * s); // rear level
        g.fillRect(gx + 2 * s, groundY - 6 * s, 22 * s, 6 * s);   // front dropped
        g.fillStyle(0x444444);
        for (let tx = -22; tx < 0; tx += 6) {
          g.fillRect(gx + tx * s, groundY - 9 * s, 3 * s, 4 * s);
        }
        for (let tx = 4; tx < 24; tx += 6) {
          g.fillRect(gx + tx * s, groundY - 5 * s, 3 * s, 4 * s);
        }
        // Body (tilted forward)
        g.fillStyle(0xcc2200);
        g.fillRect(gx - 18 * s, groundY - 24 * s, 20 * s, 14 * s); // rear
        g.fillRect(gx + 2 * s, groundY - 20 * s, 16 * s, 14 * s);  // front (lower)
        // Cabin (on rear)
        g.fillStyle(0x1e90ff);
        g.fillRect(gx - 8 * s, groundY - 34 * s, 20 * s, 11 * s);
        g.fillStyle(0x87ceeb);
        g.fillRect(gx - 5 * s, groundY - 32 * s, 14 * s, 7 * s);
        // Cabin roof
        g.fillStyle(0xaa1a00);
        g.fillRect(gx - 10 * s, groundY - 36 * s, 24 * s, 3 * s);
        // Front blade (buried in debris)
        g.fillStyle(0x888888);
        g.fillRect(gx - 28 * s, groundY - 12 * s, 10 * s, 10 * s);
        g.fillStyle(0xaaaaaa);
        g.fillRect(gx - 29 * s, groundY - 14 * s, 4 * s, 12 * s);

        // Destroyed feature remnants in front of groomer
        // Smashed snow mound (kicker remains — visible gray-blue)
        g.fillStyle(0xb0bcc8);
        g.fillRect(gx - 42 * s, groundY - 8 * s, 14 * s, 8 * s);
        g.fillRect(gx - 38 * s, groundY - 14 * s, 10 * s, 6 * s);
        g.fillStyle(0x99aabb);
        g.fillRect(gx - 40 * s, groundY - 10 * s, 4 * s, 3 * s);
        // Scattered snow chunks (darker to stand out)
        g.fillStyle(0xa8b8c8);
        g.fillRect(gx + 24 * s, groundY - 6 * s, 8 * s, 5 * s);
        g.fillRect(gx + 34 * s, groundY - 3 * s, 6 * s, 4 * s);
        g.fillRect(gx - 46 * s, groundY - 4 * s, 5 * s, 4 * s);
        // Bent metal rail pieces (visible dark)
        g.fillStyle(0x555566);
        g.fillRect(gx - 48 * s, groundY - 2 * s, 12 * s, 3 * s);
        g.fillRect(gx + 28 * s, groundY - 12 * s, 10 * s, 3 * s);
        // Impact dust/snow spray
        g.fillStyle(0xb0bcc8, 0.6);
        g.fillRect(gx - 36 * s, groundY - 22 * s, 10 * s, 8 * s);
        g.fillRect(gx - 44 * s, groundY - 18 * s, 8 * s, 6 * s);
        g.fillStyle(0xc8d4d8, 0.4);
        g.fillRect(gx + 22 * s, groundY - 20 * s, 12 * s, 8 * s);
        g.fillRect(gx + 30 * s, groundY - 16 * s, 8 * s, 6 * s);
        // Exhaust pipe (tilted)
        g.fillStyle(0x555555);
        g.fillRect(gx + 10 * s, groundY - 38 * s, 3 * s, 8 * s);
        // Storm snow
        if (isStorm) {
          g.fillStyle(0xf0f5f8);
          g.fillRect(gx - 10 * s, groundY - 39 * s, 24 * s, 3 * s);
        }
        break;
      }
      case 'ski_wipeout': {
        // Classic yard sale: skier/snowboarder face-planted in snow, gear scattered
        // Colors match the in-game sprites from skiSprites.ts
        const isSnowboard = this.skiMode === 'snowboard';

        // Snow spray / impact crater around the crash site
        g.fillStyle(0xe8eef4, 0.7);
        g.fillRect(gx - 20 * s, groundY - 6 * s, 40 * s, 6 * s);
        g.fillRect(gx - 14 * s, groundY - 10 * s, 28 * s, 4 * s);

        // Body — face-planted, legs up at angle
        // Jacket colors match skiSprites.ts palette
        const jacketMain = isSnowboard ? 0xff3388 : 0x00aaaa; // boardPink / skiTeal
        const jacketSide = isSnowboard ? 0x3366ff : 0xcc2288; // boardBlue / skiMagenta
        const jacketDark = isSnowboard ? 0xcc2266 : 0x007777; // boardDark / skiDark
        g.fillStyle(jacketMain);
        g.fillRect(gx - 8 * s, groundY - 10 * s, 16 * s, 8 * s);
        // Side panels
        g.fillStyle(jacketSide);
        g.fillRect(gx - 8 * s, groundY - 10 * s, 4 * s, 8 * s);
        g.fillRect(gx + 4 * s, groundY - 10 * s, 4 * s, 8 * s);
        // Legs (dark jacket color)
        g.fillStyle(jacketDark);
        g.fillRect(gx - 6 * s, groundY - 18 * s, 6 * s, 10 * s);
        g.fillRect(gx + 0 * s, groundY - 20 * s, 6 * s, 12 * s);
        // Boots
        g.fillStyle(0x333333);
        g.fillRect(gx - 6 * s, groundY - 22 * s, 5 * s, 4 * s);
        g.fillRect(gx + 1 * s, groundY - 24 * s, 5 * s, 4 * s);
        // Bonnet/beanie (buried in snow)
        const hatColor = isSnowboard ? 0xff6600 : 0xcc2200; // boardBeanie / bonnet
        g.fillStyle(hatColor);
        g.fillRect(gx - 4 * s, groundY - 4 * s, 8 * s, 6 * s);
        // Pompom (skier only)
        if (!isSnowboard) {
          g.fillStyle(0xffdd00);
          g.fillRect(gx - 2 * s, groundY + 1 * s, 4 * s, 3 * s);
        }
        // Goggles
        g.fillStyle(0x87ceeb);
        g.fillRect(gx - 3 * s, groundY - 2 * s, 6 * s, 2 * s);
        // Gloves (arms splayed)
        g.fillStyle(jacketDark);
        g.fillRect(gx - 18 * s, groundY - 6 * s, 5 * s, 4 * s);
        g.fillRect(gx + 14 * s, groundY - 8 * s, 5 * s, 4 * s);
        // Arms
        g.fillStyle(jacketDark, 0.8);
        g.fillRect(gx - 14 * s, groundY - 8 * s, 6 * s, 3 * s);
        g.fillRect(gx + 10 * s, groundY - 10 * s, 6 * s, 3 * s);

        // Scattered gear — the yard sale
        if (isSnowboard) {
          // Snowboard flung to the side (brown board, dark edges)
          g.fillStyle(0x8b4513);
          g.fillRect(gx + 30 * s, groundY - 16 * s, 4 * s, 18 * s);
          g.fillStyle(0x664422);
          g.fillRect(gx + 30 * s, groundY - 16 * s, 4 * s, 2 * s);
          g.fillRect(gx + 30 * s, groundY, 4 * s, 2 * s);
          // Binding detail
          g.fillStyle(0x333333);
          g.fillRect(gx + 30 * s, groundY - 10 * s, 4 * s, 2 * s);
          g.fillRect(gx + 30 * s, groundY - 4 * s, 4 * s, 2 * s);
        } else {
          // Ski poles scattered (gray)
          g.fillStyle(0x777777);
          g.fillRect(gx - 36 * s, groundY - 14 * s, 2 * s, 16 * s);
          g.fillRect(gx + 32 * s, groundY - 18 * s, 2 * s, 16 * s);
          // Pole baskets
          g.fillStyle(0x888888);
          g.fillRect(gx - 37 * s, groundY + 1 * s, 4 * s, 2 * s);
          g.fillRect(gx + 31 * s, groundY - 3 * s, 4 * s, 2 * s);
          // Skis separated (gray like in-game)
          g.fillStyle(0x666666);
          g.fillRect(gx - 32 * s, groundY - 4 * s, 3 * s, 14 * s);
          g.fillRect(gx + 28 * s, groundY - 12 * s, 3 * s, 14 * s);
          // Ski tips (darker)
          g.fillStyle(0x555555);
          g.fillRect(gx - 32 * s, groundY - 6 * s, 3 * s, 3 * s);
          g.fillRect(gx + 28 * s, groundY - 14 * s, 3 * s, 3 * s);
        }

        // Snow puff clouds
        g.fillStyle(0xdde4ec, 0.5);
        g.fillRect(gx - 24 * s, groundY - 12 * s, 6 * s, 4 * s);
        g.fillRect(gx + 20 * s, groundY - 14 * s, 8 * s, 5 * s);
        g.fillRect(gx - 10 * s, groundY - 14 * s, 5 * s, 3 * s);

        if (isStorm) {
          g.fillStyle(0xf0f5f8);
          g.fillRect(gx - 8 * s, groundY - 12 * s, 16 * s, 2 * s);
        }
        break;
      }
    }
  }

  /** Draw a celebrating skier or snowboarder on the win screen. */
  private drawSkierCelebration(
    width: number, snowLineY: number, scaleFactor: number,
    weather: { isNight: boolean; weather: string }
  ): void {
    const sx = width / 1024;
    const isLandscape = width > snowLineY * 1.5;
    const gx = isLandscape ? width * 0.82 : width / 2 + 140 * sx;
    const s = 2.0 * scaleFactor;
    const groundY = snowLineY;
    const isStorm = weather.weather === 'storm';
    const isSnowboard = this.skiMode === 'snowboard';
    const g = this.add.graphics().setDepth(5 + snowLineY * 0.001);

    // Colors match skiSprites.ts palette
    const jacketMain = isSnowboard ? 0xff3388 : 0x00aaaa;
    const jacketSide = isSnowboard ? 0x3366ff : 0xcc2288;
    const jacketDark = isSnowboard ? 0xcc2266 : 0x007777;
    const hatColor = isSnowboard ? 0xff6600 : 0xcc2200;

    // Boots on snow
    g.fillStyle(0x333333);
    g.fillRect(gx - 6 * s, groundY - 4 * s, 5 * s, 4 * s);
    g.fillRect(gx + 1 * s, groundY - 4 * s, 5 * s, 4 * s);

    // Legs / pants
    g.fillStyle(jacketDark);
    g.fillRect(gx - 5 * s, groundY - 16 * s, 5 * s, 12 * s);
    g.fillRect(gx + 0 * s, groundY - 16 * s, 5 * s, 12 * s);

    // Torso / jacket
    g.fillStyle(jacketMain);
    g.fillRect(gx - 7 * s, groundY - 28 * s, 14 * s, 12 * s);
    // Side panels
    g.fillStyle(jacketSide);
    g.fillRect(gx - 7 * s, groundY - 28 * s, 3 * s, 12 * s);
    g.fillRect(gx + 4 * s, groundY - 28 * s, 3 * s, 12 * s);

    // Arms raised in celebration
    g.fillStyle(jacketMain);
    g.fillRect(gx - 14 * s, groundY - 38 * s, 5 * s, 14 * s);
    g.fillRect(gx + 9 * s, groundY - 38 * s, 5 * s, 14 * s);
    // Gloves
    g.fillStyle(jacketDark);
    g.fillRect(gx - 14 * s, groundY - 42 * s, 5 * s, 4 * s);
    g.fillRect(gx + 9 * s, groundY - 42 * s, 5 * s, 4 * s);

    // Head — bonnet / beanie
    g.fillStyle(hatColor);
    g.fillRect(gx - 4 * s, groundY - 36 * s, 8 * s, 8 * s);
    // Goggles
    g.fillStyle(0x87ceeb);
    g.fillRect(gx - 3 * s, groundY - 32 * s, 6 * s, 3 * s);
    // Pompom (skier only)
    if (!isSnowboard) {
      g.fillStyle(0xffdd00);
      g.fillRect(gx - 2 * s, groundY - 39 * s, 4 * s, 3 * s);
    }

    // Equipment on snow beside them
    if (isSnowboard) {
      // Snowboard standing upright beside them
      g.fillStyle(0x8b4513);
      g.fillRect(gx + 20 * s, groundY - 20 * s, 4 * s, 20 * s);
      g.fillStyle(0x664422);
      g.fillRect(gx + 20 * s, groundY - 20 * s, 4 * s, 2 * s);
      g.fillRect(gx + 20 * s, groundY - 2 * s, 4 * s, 2 * s);
    } else {
      // Ski poles planted in snow
      g.fillStyle(0x777777);
      g.fillRect(gx - 16 * s, groundY - 40 * s, 2 * s, 40 * s);
      g.fillRect(gx + 14 * s, groundY - 40 * s, 2 * s, 40 * s);
      // Pole baskets
      g.fillStyle(0x888888);
      g.fillRect(gx - 17 * s, groundY - 2 * s, 4 * s, 2 * s);
      g.fillRect(gx + 13 * s, groundY - 2 * s, 4 * s, 2 * s);
    }

    // Snow spray from stop
    g.fillStyle(0xdde4ec, 0.4);
    g.fillRect(gx - 18 * s, groundY - 3 * s, 36 * s, 3 * s);

    if (isStorm) {
      g.fillStyle(0xf0f5f8);
      g.fillRect(gx - 4 * s, groundY - 37 * s, 8 * s, 2 * s);
      g.fillRect(gx - 7 * s, groundY - 29 * s, 14 * s, 2 * s);
    }
  }

  /** Draw ski/snowboard victory props: slalom gates on gate levels, park features on park levels. */
  private drawSkiVictoryProps(width: number, snowLineY: number, scaleFactor: number, levelIndex: number): void {
    const sx = width / 1024;
    const isLandscape = width > snowLineY * 1.5;
    const gx = isLandscape ? width * 0.82 : width / 2 + 140 * sx;
    const s = 3.0 * scaleFactor;
    const groundY = snowLineY;
    const g = this.add.graphics().setDepth(5 + snowLineY * 0.001 + 0.002);

    const level = this.getLevel();

    if (level.slalomGates) {
      this.drawSlalomGatePair(g, gx - 45 * s, groundY, s);
    } else if (level.specialFeatures?.includes('kickers') || level.specialFeatures?.includes('rails')) {
      this.drawParkKicker(g, gx - 40 * s, groundY, s);
    } else if (level.specialFeatures?.includes('halfpipe')) {
      this.drawHalfpipeWalls(g, gx, groundY, s);
    }
  }

  private drawSlalomGatePair(g: Phaser.GameObjects.Graphics, x: number, groundY: number, s: number): void {
    // Red gate pole
    g.fillStyle(0xcc2222);
    g.fillRect(x - 1.5 * s, groundY - 26 * s, 3 * s, 26 * s);
    g.fillStyle(0x111111);
    g.fillRect(x - 1.5 * s, groundY - 4 * s, 3 * s, 4 * s);
    // Blue gate pole (offset right)
    g.fillStyle(0x1e90ff);
    g.fillRect(x + 12 * s, groundY - 26 * s, 3 * s, 26 * s);
    g.fillStyle(0x111111);
    g.fillRect(x + 12 * s, groundY - 4 * s, 3 * s, 4 * s);
  }
}
