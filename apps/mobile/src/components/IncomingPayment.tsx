import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { money, type Activity } from '../domain/wallet';
import { useLive } from '../state/live';
import { useColors } from '../theme';
import { Text } from './Text';
import { TransferPulse } from './TransferPulse';
import { Icon } from './ui';

export function IncomingPayment() {
  const live = useLive();
  const { colors, styles: t } = useColors();
  const insets = useSafeAreaInsets();
  const seen = useRef<{ owner: string; ids: Set<string> } | null>(null);
  const [arrival, setArrival] = useState<{ owner: string; item: Activity } | null>(null);
  useEffect(() => {
    if (live.status !== 'ready' || live.balanceCents === null || !live.activityReady) { seen.current = null; return; }
    const ids = new Set(live.activity.map(item => item.id));
    if (!seen.current || seen.current.owner !== live.address) { seen.current = { owner: live.address, ids }; return; }
    const incoming = live.activity.find(item => item.kind === 'receive' && !seen.current!.ids.has(item.id));
    seen.current = { owner: live.address, ids };
    if (incoming) setArrival({ owner: live.address, item: incoming });
  }, [live.status, live.address, live.balanceCents, live.activity, live.activityReady]);
  useEffect(() => {
    if (!arrival) return;
    const timer = setTimeout(() => setArrival(null), 8000);
    return () => clearTimeout(timer);
  }, [arrival]);
  if (!arrival || live.status !== 'ready' || arrival.owner !== live.address) return null;
  return <View accessibilityLiveRegion="polite" style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16, maxWidth: 560, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 28, borderWidth: 1, borderColor: colors.green, padding: 14, shadowColor: '#000', shadowOpacity: .15, shadowRadius: 18, elevation: 8 }}>
    <View style={[t.row, { gap: 10 }]}><View style={{ width: 68, height: 68, alignItems: 'center', justifyContent: 'center', transform: [{ scale: .5 }] }}><TransferPulse key={arrival.item.id} incoming /></View><Pressable accessibilityRole="button" accessibilityLabel={`Received ${money(arrival.item.amountCents)}, view receipt`} onPress={() => { const id = arrival.item.id; setArrival(null); router.push({ pathname: '/receipt', params: { id } }); }} style={{ flex: 1, minHeight: 48, justifyContent: 'center', gap: 4 }}><Text style={t.heading}>Money just landed.</Text><Text style={t.muted}>+{money(arrival.item.amountCents)} · Test dollars received</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Dismiss payment notification" onPress={() => setArrival(null)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={20} /></Pressable></View>
  </View>;
}
