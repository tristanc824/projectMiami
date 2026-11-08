import { StyleSheet } from 'react-native';
import { useTheme, type Scheme } from './state/ThemeProvider';

export const lightColors = {
  background: '#F3F0EA', surface: '#FFFFFF', elevated: '#FFFFFF', ink: '#17201A', muted: '#646C66',
  accent: '#2F5D3A', black: '#17201A', soft: '#FFFFFF', softer: '#EDE9E0',
  green: '#2F5D3A', greenDark: '#16301D', mint: '#E4ECDF', mintLight: '#E4ECDF',
  line: '#DDD7CA', track: '#E9E1D1', dash: '#C5CDBF', danger: '#A53D35', dangerBg: '#FAEAE4', amber: '#8A5A10',
  peach: '#E9E1D1', lavender: '#E4ECDF', blue: '#DCEEF8', white: '#FFFFFF',
  tabInactive: '#646C66', glassBorder: '#DDD7CA', glassFallback: '#F3F0EA', accentTint: '#E4ECDF',
};

export type Palette = typeof lightColors;

export const darkColors: Palette = {
  background: '#17201A', surface: '#222F25', elevated: '#2B3A2D', ink: '#F3F0EA', muted: '#B6BEB2',
  accent: '#A9C4A1', black: '#0E1711', soft: '#222F25', softer: '#1C281F',
  green: '#A9C4A1', greenDark: '#C8DCC2', mint: '#304635', mintLight: '#304635',
  line: '#3C493D', track: '#3C493D', dash: '#64745F', danger: '#F0A090', dangerBg: '#472E29', amber: '#E0BC79',
  peach: '#3B372D', lavender: '#304635', blue: '#243E4C', white: '#FFFFFF',
  tabInactive: '#B6BEB2', glassBorder: '#3C493D', glassFallback: '#17201A', accentTint: '#304635',
};

export const palettes: Record<Scheme, Palette> = { light: lightColors, dark: darkColors };

const makeShared = (colors: Palette) => StyleSheet.create({
  title: { fontSize: 36, fontWeight: '600', letterSpacing: -1.3, color: colors.ink },
  heading: { fontSize: 20, fontWeight: '600', letterSpacing: -0.6, color: colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 19, color: colors.muted },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 1.4, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: 28, padding: 22 },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.line },
});

/** Builds a StyleSheet per color scheme once, and returns a hook that picks the active one. */
type StyleObject = Parameters<typeof StyleSheet.create>[0];
export function themedStyles<T extends StyleObject>(factory: (colors: Palette) => T) {
  const cache: Partial<Record<Scheme, Readonly<T>>> = {};
  return function useThemedStyles(): Readonly<T> {
    const { scheme } = useTheme();
    return (cache[scheme] ??= StyleSheet.create(factory(palettes[scheme])));
  };
}

const useShared = themedStyles(makeShared);

/** Active palette plus the shared text/layout styles. */
export function useColors() {
  const { scheme } = useTheme();
  return { colors: palettes[scheme], styles: useShared(), scheme };
}
