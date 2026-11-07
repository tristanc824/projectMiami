import { StyleSheet } from 'react-native';
import { useTheme, type Scheme } from './state/ThemeProvider';

export const lightColors = {
  background: '#FFFFFF', surface: '#FFFFFF', elevated: '#FFFFFF', ink: '#101114', muted: '#7D828C',
  accent: '#246BFD', black: '#08090C', soft: '#F5F6F8', softer: '#F7F8FA',
  // Semantic aliases keep the existing money flows on the shared palette.
  green: '#246BFD', greenDark: '#1550CD', mint: '#E8F0FF', mintLight: '#F1F5FE',
  line: '#EAECF0', track: '#E6E9EF', dash: '#D9DDE5', danger: '#B53737', dangerBg: '#FFF1F1', amber: '#7D828C',
  peach: '#E8EBF0', lavender: '#E8EEFB', blue: '#E8F0FF', white: '#FFFFFF',
  tabInactive: '#727782', glassBorder: '#FFFFFF', glassFallback: 'rgba(255, 255, 255, 0.85)', accentTint: '#246BFD0D',
};

export type Palette = typeof lightColors;

export const darkColors: Palette = {
  background: '#0B0C0F', surface: '#121419', elevated: '#1C1F26', ink: '#F2F3F5', muted: '#8E939D',
  accent: '#4F8AFF', black: '#000000', soft: '#181A20', softer: '#16181D',
  green: '#4F8AFF', greenDark: '#2F6BF0', mint: '#1A2747', mintLight: '#152039',
  line: '#262931', track: '#2A2D35', dash: '#3A3E48', danger: '#FF7A7A', dangerBg: '#2C1618', amber: '#8E939D',
  peach: '#23262D', lavender: '#1D2340', blue: '#1A2747', white: '#FFFFFF',
  tabInactive: '#9095A0', glassBorder: '#FFFFFF1F', glassFallback: 'rgba(22, 24, 29, 0.85)', accentTint: '#4F8AFF1F',
};

export const palettes: Record<Scheme, Palette> = { light: lightColors, dark: darkColors };

const makeShared = (colors: Palette) => StyleSheet.create({
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -1.3, color: colors.ink },
  heading: { fontSize: 20, fontWeight: '700', letterSpacing: -0.6, color: colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 19, color: colors.muted },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: colors.muted },
  card: { backgroundColor: colors.soft, borderRadius: 28, padding: 22 },
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
