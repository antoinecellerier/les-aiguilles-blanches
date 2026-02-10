/** Event payloads for cross-scene communication via game.events */
export interface GameStateEvent {
  fuel: number;
  stamina: number;
  coverage: number;
  winchActive: boolean;
  levelIndex: number;
  // Bonus objective tracking
  tumbleCount: number;
  fuelUsed: number;
  winchUseCount: number;
  pathsVisited: number;
  totalPaths: number;
  restartCount: number;
}

export interface TouchInputEvent {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  groom: boolean;
  winch: boolean;
}

/** Event name constants */
export const GAME_EVENTS = {
  /** GameScene → HUDScene: emitted every frame with current game state */
  GAME_STATE: 'gameState',
  /** GameScene → HUDScene: timer tick */
  TIMER_UPDATE: 'timerUpdate',
  /** HUDScene → GameScene: touch input state */
  TOUCH_INPUT: 'touchInput',
  /** HUDScene/PauseScene → GameScene: request pause */
  PAUSE_REQUEST: 'pauseRequest',
  /** PauseScene → GameScene: request resume */
  RESUME_REQUEST: 'resumeRequest',
  /** HUDScene → GameScene: skip to next level */
  SKIP_LEVEL: 'skipLevel',
  /** HUDScene → GameScene: top edge of touch controls in screen pixels */
  TOUCH_CONTROLS_TOP: 'touchControlsTop',
  /** SettingsScene → HUDScene: accessibility settings changed, redraw needed */
  ACCESSIBILITY_CHANGED: 'accessibilityChanged',
  /** SettingsScene → AudioSystem: volume channel changed */
  VOLUME_CHANGED: 'volumeChanged',
  /** SettingsScene/PauseScene → AudioSystem: mute toggled */
  MUTE_CHANGED: 'muteChanged',
  /** DialogueScene → GameScene: all dialogues dismissed via ESC/B (not advanced) */
  DIALOGUE_DISMISSED: 'dialogueDismissed',
} as const;
