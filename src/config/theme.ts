/**
 * Les Aiguilles Blanches - Centralized UI Theme
 * All colors, fonts, and spacing values for consistent styling across scenes
 */

export const THEME = {
  // Color palette
  colors: {
    // Primary button colors
    buttonPrimary: 0x2d5a7b,
    buttonPrimaryHex: '#2d5a7b',
    buttonHover: 0x3d7a9b,
    buttonHoverHex: '#3d7a9b',

    // Backgrounds
    panelBg: 0x222222,
    panelBgHex: '#222222',
    overlayDim: 0x000000,
    darkBg: 0x0a1628,
    dialogBg: 0x1a2a3e,
    dialogBgHex: '#1a2a3e',

    // Text colors
    textPrimary: '#ffffff',
    textSecondary: '#aaaaaa',
    textMuted: '#888888',
    textDark: '#333333',

    // Accent colors
    accent: '#FFD700',        // Gold - highlights, titles
    accentHex: 0xffd700,
    info: '#87CEEB',          // Sky blue - info text
    infoHex: 0x87ceeb,
    success: '#22aa22',       // Green - stamina, positive
    successHex: 0x22aa22,
    danger: '#cc2200',        // Red - fuel low, errors
    dangerHex: 0xcc2200,
    warning: '#FF6600',       // Orange - warnings

    // UI element colors
    border: 0x3d7a9b,
    borderHex: '#3d7a9b',
    disabled: '#666666',
  },

  // Font configuration
  fonts: {
    family: 'Courier New, monospace',
    familyEmoji: 'Arial',

    sizes: {
      tiny: 12,
      small: 14,
      medium: 16,
      large: 18,
      xlarge: 24,
      title: 28,
      hero: 36,
    },
  },

  // Spacing and sizing
  spacing: {
    padding: {
      small: 8,
      medium: 12,
      large: 20,
      xlarge: 30,
    },
    button: {
      paddingX: 30,
      paddingY: 12,
    },
    panel: {
      borderRadius: 8,
    },
  },

  // Opacity values
  opacity: {
    overlay: 0.7,
    panelBg: 0.95,
    disabled: 0.5,
    touchControls: 0.6,
  },
} as const;

// Helper to create button style object
export function buttonStyle(
  fontSize: number = THEME.fonts.sizes.large,
  paddingX: number = THEME.spacing.button.paddingX,
  paddingY: number = THEME.spacing.button.paddingY
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fonts.family,
    fontSize: `${fontSize}px`,
    color: THEME.colors.textPrimary,
    backgroundColor: THEME.colors.buttonPrimaryHex,
    padding: { x: paddingX, y: paddingY },
  };
}

// Helper to create title style object
export function titleStyle(
  fontSize: number = THEME.fonts.sizes.title
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fonts.family,
    fontSize: `${fontSize}px`,
    fontStyle: 'bold',
    color: THEME.colors.textPrimary,
  };
}

// Helper to create info text style
export function infoStyle(
  fontSize: number = THEME.fonts.sizes.medium
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: THEME.fonts.family,
    fontSize: `${fontSize}px`,
    color: THEME.colors.info,
  };
}
