import * as Haptics from 'expo-haptics';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Text, TextInput } from './Text';
import { themedStyles, useColors } from '../theme';
import { Icon } from './ui';

export function AmountInput({ value, onChange, currency = 'USDC' }: { value: string; onChange: (value: string) => void; currency?: string }) {
  const { colors, styles: t } = useColors();
  const s = useS();
  const { width } = useWindowDimensions();
  const availableWidth = Math.min(572, width - 48);
  const amountFontSize = Math.min(94, (availableWidth - 58) / Math.max(1, value.length * .59));
  const inputWidth = Math.min(availableWidth - 58, Math.max(62, value.length * amountFontSize * .59));
  const update = (next: string) => { if (/^\d{0,5}(?:\.\d{0,2})?$/.test(next)) onChange(next || '0'); };
  const key = (digit: string) => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (digit === 'delete') return update(value.slice(0, -1));
    if (digit === '.') return value.includes('.') ? undefined : update(`${value || '0'}.`);
    update(value === '0' ? digit : value + digit);
  };
  return <View>
    <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 18 }}><Text style={[t.muted, { fontSize: 12, fontWeight: '600' }]}>{currency} · Demo</Text><View style={[t.row, { marginTop: 9, justifyContent: 'center', minHeight: 112 }]}><Text style={[s.symbol, { fontSize: amountFontSize }]}>$</Text><TextInput testID="amount-input" accessibilityLabel={`Amount in ${currency}`} inputMode="decimal" keyboardType="decimal-pad" showSoftInputOnFocus={false} value={value} onChangeText={update} selectTextOnFocus style={[s.input, { width: inputWidth, fontSize: amountFontSize }]} /></View></View>
    <View style={s.pad}>{['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'].map(digit => <Pressable key={digit} accessibilityRole="button" accessibilityLabel={digit === 'delete' ? 'Delete digit' : digit === '.' ? 'Decimal point' : `Digit ${digit}`} onPress={() => key(digit)} style={({ pressed }) => [s.key, { backgroundColor: pressed ? colors.line : 'transparent' }]}>{digit === 'delete' ? <Icon name="backspace-outline" size={24} /> : <Text style={s.digit}>{digit}</Text>}</Pressable>)}</View>
  </View>;
}
const useS = themedStyles(colors => ({
  symbol: { color: colors.ink, fontWeight: '700', letterSpacing: -4 },
  input: { fontWeight: '700', color: colors.ink, letterSpacing: -3, padding: 0, minHeight: 112, textAlign: 'center' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }, key: { width: '33.333%', minHeight: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 32 }, digit: { fontSize: 27, fontWeight: '700', color: colors.ink },
}));
