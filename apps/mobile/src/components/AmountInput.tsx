import { type ReactNode } from 'react';
import { useIsLive } from '../state/live';
import * as Haptics from 'expo-haptics';
import { Keyboard, Pressable, View, useWindowDimensions } from 'react-native';
import { Text, TextInput } from './Text';
import { themedStyles, useColors } from '../theme';
import { Icon, useDesktop } from './ui';

export function AmountInput({ value, onChange, currency = 'USDC', detail, showKeypad = true, compact = false, demo = false }: { value: string; onChange: (value: string) => void; currency?: string; detail?: ReactNode; showKeypad?: boolean; compact?: boolean; demo?: boolean }) {
  const live = useIsLive() && !demo;
  const { colors, styles: t } = useColors();
  const s = useS();
  const { width } = useWindowDimensions();
  const availableWidth = Math.min(572, width - 48);
  const amountFontSize = Math.min(compact ? 76 : 94, (availableWidth - 58) / Math.max(1, value.length * .59));
  const inputWidth = Math.min(availableWidth - 58, Math.max(62, value.length * amountFontSize * .59));
  const update = (next: string) => { if (/^\d{0,5}(?:\.\d{0,2})?$/.test(next)) onChange(next || '0'); };
  const key = (digit: string) => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (digit === 'delete') return update(value.slice(0, -1));
    if (digit === '.') return value.includes('.') ? undefined : update(`${value || '0'}.`);
    update(value === '0' ? digit : value + digit);
  };
  const desktop = useDesktop();
  return <View>
    <View style={{ alignItems: 'center', marginTop: compact ? 4 : 10, marginBottom: compact ? 12 : 18 }}><Text style={[t.muted, { fontSize: 13 }]}>{live ? 'Test dollars' : 'Demo dollars'}</Text><View style={[t.row, { marginTop: 9, justifyContent: 'center', minHeight: compact ? 92 : 112 }]}><Text style={[s.symbol, { fontSize: amountFontSize }]}>$</Text><TextInput testID="amount-input" accessibilityLabel={`Amount in ${currency}`} inputMode="decimal" keyboardType="decimal-pad" showSoftInputOnFocus={false} value={value} onChangeText={update} selectTextOnFocus onFocus={Keyboard.dismiss} style={[s.input, { width: inputWidth, fontSize: amountFontSize, minHeight: compact ? 92 : 112 }]} /></View>{detail}</View>
    {showKeypad ? <View style={[s.pad, desktop && { width: 360, alignSelf: 'center' }]}>{['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'].map(digit => <Pressable key={digit} accessibilityRole="button" accessibilityLabel={digit === 'delete' ? 'Delete digit' : digit === '.' ? 'Decimal point' : `Digit ${digit}`} onPress={() => key(digit)} style={({ pressed }) => [s.key, compact && { minHeight: 52 }, { backgroundColor: pressed ? colors.line : 'transparent' }]}>{digit === 'delete' ? <Icon name="backspace-outline" size={24} /> : <Text style={s.digit}>{digit}</Text>}</Pressable>)}</View> : null}
  </View>;
}
const useS = themedStyles(colors => ({
  symbol: { color: colors.ink, fontWeight: '600', letterSpacing: -3 },
  input: { fontWeight: '600', color: colors.ink, letterSpacing: -3, padding: 0, minHeight: 112, textAlign: 'center' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }, key: { width: '33.333%', minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 32 }, digit: { fontSize: 29, fontWeight: '600', color: colors.ink },
}));
