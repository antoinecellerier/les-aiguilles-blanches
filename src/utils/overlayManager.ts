import Phaser from 'phaser';
import { t } from '../setup';
import { THEME } from '../config/theme';
import { playCancel } from '../systems/UISounds';

/**
 * Manages modal overlay dialogs (simple and scrollable) for menu scenes.
 * Handles backdrop, keyboard dismiss, and cleanup lifecycle.
 */
export class OverlayManager {
  private scene: Phaser.Scene;
  private _open = false;
  private closeCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get open(): boolean { return this._open; }

  /** Close the current overlay if one is open (used by gamepad B / ESC). */
  close(): void {
    this.closeCallback?.();
  }

  /**
   * Show an overlay with a translated title and content lines.
   * Automatically picks simple dialog or scrollable panel based on content height.
   */
  show(titleKey: string, lines: string[]): void {
    this._open = true;
    const { width, height } = this.scene.cameras.main;

    const fontSize = Math.round(Math.max(12, Math.min(22, height / 30)));
    const titleSize = Math.round(fontSize * 1.4);
    const scaleFactor = fontSize / 18;
    const panelWidth = Math.min(700 * scaleFactor, width - 40);
    const padding = 20;
    const titleSpacing = Math.round(fontSize * 1.5);
    const buttonHeight = Math.round(fontSize * 2.5);

    const contentText = this.scene.add.text(0, 0, lines.join('\n'), {
      fontFamily: THEME.fonts.family,
      fontSize: fontSize + 'px',
      color: '#cccccc',
      align: 'center',
      lineSpacing: Math.round(fontSize * 0.6),
      wordWrap: { width: panelWidth - 60 },
    });

    const maxPanelHeight = height * 0.85;
    const headerFooterHeight = titleSize + titleSpacing * 2 + buttonHeight + padding * 2;
    const availableContentHeight = maxPanelHeight - headerFooterHeight;
    const needsScroll = contentText.height > availableContentHeight;

    if (!needsScroll) {
      this.showSimple(titleKey, contentText, panelWidth, fontSize, titleSize, titleSpacing, padding, scaleFactor);
    } else {
      const textContent = lines.join('\n');
      contentText.destroy();
      this.showScrollable(titleKey, textContent, panelWidth, fontSize, titleSize, availableContentHeight, maxPanelHeight, padding, scaleFactor, buttonHeight);
    }
  }

  private showScrollable(
    titleKey: string, textContent: string,
    panelWidth: number, fontSize: number, titleSize: number,
    availableContentHeight: number, maxPanelHeight: number,
    padding: number, scaleFactor: number, buttonHeight: number
  ): void {
    const scene = this.scene;
    const rexUI = (scene as any).rexUI;
    const { width, height } = scene.cameras.main;

    const scrollContent = scene.add.text(0, 0, textContent, {
      fontFamily: THEME.fonts.family,
      fontSize: fontSize + 'px',
      color: '#cccccc',
      align: 'center',
      lineSpacing: Math.round(fontSize * 0.6),
      wordWrap: { width: panelWidth - 60 },
    });

    const contentSizer = rexUI.add.sizer({ orientation: 'vertical' })
      .add(scrollContent, { align: 'center' });

    const scrollPanel = rexUI.add.scrollablePanel({
      x: width / 2,
      y: height / 2 - buttonHeight / 2,
      width: panelWidth - padding * 2,
      height: availableContentHeight,
      scrollMode: 'y',
      background: rexUI.add.roundRectangle(0, 0, 0, 0, 0, 0x1a2a3e, 0),
      panel: { child: contentSizer },
      slider: {
        track: rexUI.add.roundRectangle(0, 0, 6, 0, 3, 0x555555),
        thumb: rexUI.add.roundRectangle(0, 0, 6, 40, 3, 0x888888),
      },
      mouseWheelScroller: { speed: 0.3 },
      space: { panel: 5 },
    }).layout();
    scrollPanel.setChildrenInteractive({});

    const titleText = scene.add.text(width / 2, height * 0.075 + padding, t(titleKey) || titleKey, {
      fontFamily: THEME.fonts.family,
      fontSize: titleSize + 'px',
      fontStyle: 'bold',
      color: '#87CEEB',
    }).setOrigin(0.5, 0);

    const backBtn = this.createButton('← ' + (t('back') || 'Back'), fontSize, scaleFactor);
    backBtn.setPosition(width / 2 - backBtn.width / 2, height * 0.925 - buttonHeight);

    const bgPanel = rexUI.add.roundRectangle(
      width / 2, height / 2, panelWidth, maxPanelHeight, 8, 0x1a2a3e
    ).setStrokeStyle(4, 0x3d7a9b);

    const baseDepth = 100;
    bgPanel.setDepth(baseDepth);
    titleText.setDepth(baseDepth + 1);
    scrollPanel.setDepth(baseDepth + 1);
    backBtn.setDepth(baseDepth + 1);

    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    overlay.setInteractive();
    overlay.setDepth(baseDepth - 1);

    const closeOverlay = () => {
      playCancel();
      this._open = false;
      this.closeCallback = null;
      scene.input.keyboard?.off('keydown-ESC', closeOverlay);
      scene.input.keyboard?.off('keydown-ENTER', closeOverlay);
      scene.input.keyboard?.off('keydown-SPACE', closeOverlay);
      overlay.destroy();
      bgPanel.destroy();
      titleText.destroy();
      scrollPanel.destroy();
      backBtn.destroy();
    };
    this.closeCallback = closeOverlay;
    scene.input.keyboard?.on('keydown-ESC', closeOverlay);
    scene.input.keyboard?.on('keydown-ENTER', closeOverlay);
    scene.input.keyboard?.on('keydown-SPACE', closeOverlay);
    backBtn.on('pointerup', closeOverlay);
  }

  private showSimple(
    titleKey: string, contentText: Phaser.GameObjects.Text,
    panelWidth: number, fontSize: number, titleSize: number,
    titleSpacing: number, padding: number, scaleFactor: number
  ): void {
    const scene = this.scene;
    const rexUI = (scene as any).rexUI;
    const { width, height } = scene.cameras.main;

    const dialog = rexUI.add.dialog({
      x: width / 2,
      y: height / 2,
      width: panelWidth,
      background: rexUI.add.roundRectangle(0, 0, 0, 0, 8, 0x1a2a3e).setStrokeStyle(4, 0x3d7a9b),
      title: scene.add.text(0, 0, t(titleKey) || titleKey, {
        fontFamily: THEME.fonts.family,
        fontSize: titleSize + 'px',
        fontStyle: 'bold',
        color: '#87CEEB',
      }),
      content: contentText,
      actions: [
        this.createButton('← ' + (t('back') || 'Back'), fontSize, scaleFactor)
      ],
      space: {
        title: titleSpacing,
        content: titleSpacing,
        action: Math.round(fontSize * 0.8),
        left: padding,
        right: padding,
        top: padding,
        bottom: padding,
      },
      align: { actions: 'center' },
      expand: { content: false },
    }).layout();

    dialog.setDepth(100);
    // Ensure content text renders above the dialog background
    scene.children.bringToTop(contentText);

    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    overlay.setInteractive();
    overlay.setDepth(dialog.depth - 1);

    const closeOverlay = () => {
      playCancel();
      this._open = false;
      this.closeCallback = null;
      scene.input.keyboard?.off('keydown-ESC', closeOverlay);
      scene.input.keyboard?.off('keydown-ENTER', closeOverlay);
      scene.input.keyboard?.off('keydown-SPACE', closeOverlay);
      overlay.destroy();
      dialog.destroy();
    };
    this.closeCallback = closeOverlay;
    scene.input.keyboard?.on('keydown-ESC', closeOverlay);
    scene.input.keyboard?.on('keydown-ENTER', closeOverlay);
    scene.input.keyboard?.on('keydown-SPACE', closeOverlay);

    dialog.on('button.click', closeOverlay);
  }

  private createButton(text: string, fontSize: number, scaleFactor: number): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(0, 0, text, {
      fontFamily: THEME.fonts.family,
      fontSize: fontSize + 'px',
      color: '#ffffff',
      backgroundColor: '#CC2200',
      padding: { x: Math.round(30 * scaleFactor), y: Math.round(10 * scaleFactor) },
    }).setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setStyle({ backgroundColor: '#FF3300' }))
      .on('pointerout', () => btn.setStyle({ backgroundColor: '#CC2200' }));
    return btn;
  }
}
