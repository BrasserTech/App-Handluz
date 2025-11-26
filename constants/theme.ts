import { Platform } from 'react-native';

/**
 * Paleta de cores do HandLuz (estilo LHEsp).
 */

export const AppColors = {
  primary: '#1B5E20',        // Verde institucional
  primaryDark: '#104a16',
  primaryLight: '#4CAF50',
  background: '#F5F6FA',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  textPrimary: '#1A1A1A',
  textSecondary: '#555555',
  textMuted: '#777777',
  success: '#388E3C',
  danger: '#D32F2F',
  warning: '#F9A825',

  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#1B5E20',

  drawerBackground: '#1B5E20',
  drawerText: '#FFFFFF',
  drawerIcon: '#FFFFFF',
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const AppTheme = {
  ...AppColors,
  fonts: Fonts,
};
