import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { money } from '../domain/wallet';
import { useColors } from '../theme';
import { Text } from './Text';
import { Brand, Button, Detail, Icon, Pill } from './ui';

const DOUBLE_TAP_MS = 850;

/** An on-screen gesture rehearsal, not the iPhone side button or Apple Pay authorization. */
export function AppleCashDemoConfirmation({ amountCents, feeCents, balanceAfterCents, disabled, onConfirm, onCancel }: {
  amountCents: number; feeCents: number; balanceAfterCents: number; disabled: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const { colors, styles: t } = useColors();
  const [firstTap, setFirstTap] = useState(false);
  const [singleTap, setSingleTap] = useState(false);
  const lastTap = useRef<number | null>(null);
  const confirmed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  const confirm = () => {
    if (disabled || confirmed.current) return;
    confirmed.current = true;
    if (timer.current !== null) clearTimeout(timer.current);
    onConfirm();
  };
  const tap = () => {
    if (disabled || confirmed.current) return;
    if (singleTap) { confirm(); return; }
    const now = Date.now();
    void Haptics.selectionAsync().catch(() => undefined);
    if (lastTap.current !== null && now - lastTap.current <= DOUBLE_TAP_MS) { confirm(); return; }
    lastTap.current = now;
    setFirstTap(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => { lastTap.current = null; setFirstTap(false); }, DOUBLE_TAP_MS);
  };
  return <Modal transparent animationType="slide" onRequestClose={onCancel}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#17201AE6', justifyContent: 'flex-end' }}>
      <View accessibilityViewIsModal role="dialog" aria-label="Confirm Apple Cash demo" style={{ width: '100%', maxWidth: 480, maxHeight: '96%', alignSelf: 'center', borderRadius: 32, padding: 20, backgroundColor: colors.background }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          <View style={[t.between, { gap: 12 }]}><Brand small /><Pill>Demo only</Pill></View>
          <Text accessibilityRole="header" style={[t.heading, { textAlign: 'center' }]}>Confirm Apple Cash withdrawal</Text>
          <View style={{ backgroundColor: '#101512', borderRadius: 24, padding: 18, gap: 12 }}>
            <View style={[t.row, { gap: 7 }]}><Icon name="logo-apple" color="#FFFFFF" size={27} /><Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '600' }}>Cash</Text></View>
            <Text style={{ color: '#FFFFFF', fontSize: 38, fontWeight: '600' }}>{money(amountCents)}</Text>
            <Text style={{ color: '#C8D7C5', fontSize: 12 }}>NEST DEMO · NO REAL PAYOUT</Text>
          </View>
          <View><Detail label="Fee" value={feeCents ? `${money(feeCents)} · example` : 'Paid by Nest'} /><Detail label="Account balance after" value={money(Math.max(0, balanceAfterCents))} strong /></View>
          <View accessibilityLiveRegion="polite" style={{ gap: 7 }}><Text style={[t.heading, { textAlign: 'center' }]}>{singleTap ? 'Tap to confirm' : firstTap ? 'Tap once more' : 'Double-tap to confirm'}</Text><Text style={[t.muted, { textAlign: 'center' }]}>Tap the on-screen button twice quickly. No side button or Face ID is used.</Text></View>
        </ScrollView>
        <View style={{ gap: 8, paddingTop: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={singleTap ? 'Confirm demo withdrawal with one tap' : 'Double-tap to confirm demo withdrawal'} accessibilityHint={singleTap ? 'Confirms this demo withdrawal.' : 'Tap this on-screen button twice quickly to confirm the demo withdrawal.'} disabled={disabled} accessibilityState={{ disabled }} onPress={tap} style={({ pressed }) => ({ minHeight: 64, borderRadius: 24, padding: 18, backgroundColor: colors.ink, opacity: disabled ? .45 : pressed ? .7 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 })}>
            <Icon name="phone-portrait-outline" color={colors.background} size={27} /><Text style={{ color: colors.background, fontSize: 17, fontWeight: '600' }}>{singleTap ? 'Confirm demo' : firstTap ? 'Tap again to confirm' : 'Double-tap here'}</Text><View style={{ height: 30, width: 5, borderRadius: 3, backgroundColor: colors.background }} />
          </Pressable>
          {disabled ? <Text accessibilityRole="alert" style={t.muted}>Your balance changed or is unavailable. Cancel and review the amount.</Text> : null}
          {!singleTap ? <Button title="Use single-tap confirmation" variant="light" onPress={() => { if (timer.current !== null) clearTimeout(timer.current); lastTap.current = null; setFirstTap(false); setSingleTap(true); }} /> : null}
          <Button title="Cancel withdrawal" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </SafeAreaView>
  </Modal>;
}
