import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Platform, ScrollView, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { money } from '../domain/wallet';
import { useColors } from '../theme';
import { Text } from './Text';
import { Brand, Button, Icon, Pill } from './ui';

/** Nest's own animation, never a system Apple Pay sheet or payment authorization. */
export function AppleCashDemoAnimation({ amountCents, onDone }: { amountCents: number; onDone: () => void }) {
  const { colors, styles: t } = useColors();
  const [progress] = useState(() => new Animated.Value(0));
  const [check] = useState(() => new Animated.Value(0));
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    let sequence: Animated.CompositeAnimation | undefined;
    const finish = () => {
      if (!active) return;
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    };
    const start = (reduce: boolean) => {
      if (!active) return;
      if (reduce) { progress.setValue(1); check.setValue(1); finish(); return; }
      sequence = Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(check, { toValue: 1, friction: 7, tension: 90, useNativeDriver: Platform.OS !== 'web' }),
      ]);
      sequence.start(({ finished }) => { if (finished) finish(); });
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(start).catch(() => start(true));
    return () => { active = false; sequence?.stop(); };
  }, [progress, check]);
  return <Modal transparent animationType="fade" onRequestClose={onDone}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#17201AE6', justifyContent: 'flex-end' }}>
      <View accessibilityViewIsModal role="dialog" aria-label="Apple Cash demo animation" style={{ width: '100%', maxWidth: 480, maxHeight: '96%', alignSelf: 'center', backgroundColor: colors.background, borderRadius: 32, padding: 24 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 22, alignItems: 'center' }}>
          <View style={[t.between, { width: '100%', gap: 12 }]}><Brand small /><Pill>Demo only</Pill></View>
          <Text accessibilityRole="header" style={[t.heading, { textAlign: 'center' }]}>Withdraw to Apple Cash</Text>
          <Animated.View style={{ width: '100%', minHeight: 164, borderRadius: 24, backgroundColor: '#101512', padding: 22, justifyContent: 'space-between', overflow: 'hidden', opacity: progress.interpolate({ inputRange: [0, .2, 1], outputRange: [.7, 1, 1] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
            <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#2F5D3A', opacity: .3, right: -80, top: -100 }} />
            <View style={[t.row, { gap: 7 }]}><Icon name="logo-apple" color="#FFFFFF" size={28} /><Text style={{ color: '#FFFFFF', fontSize: 25, fontWeight: '600' }}>Cash</Text></View>
            <View style={[t.between, { gap: 12 }]}><Text style={{ color: '#FFFFFF', fontSize: 35, fontWeight: '600' }}>{money(amountCents)}</Text><Text style={{ color: '#C8D7C5', fontSize: 12 }}>NEST DEMO</Text></View>
          </Animated.View>
          <View style={{ height: 96, width: 96, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.mint, borderTopColor: colors.green, opacity: check.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) }] }} />
            <Animated.View style={{ opacity: check.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: progress.interpolate({ inputRange: [0, .35, .7, 1], outputRange: [.85, 1.1, .95, 1] }) }] }}><Icon name="radio-outline" color={colors.green} size={36} /></Animated.View>
            <Animated.View style={{ position: 'absolute', width: 84, height: 84, borderRadius: 42, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', opacity: check, transform: [{ scale: check.interpolate({ inputRange: [0, 1], outputRange: [.65, 1] }) }] }}><Icon name="checkmark" color="#FFFFFF" size={44} /></Animated.View>
          </View>
          <View accessibilityLiveRegion="polite" style={{ gap: 7, alignItems: 'center' }}><Text style={[t.heading, { textAlign: 'center' }]}>{done ? 'Demo complete' : 'Simulating withdrawal…'}</Text><Text style={[t.muted, { textAlign: 'center' }]}>Animation preview only. No Apple Pay authorization or Apple Cash payout occurs.</Text></View>
          <Button title="View demo receipt" disabled={!done} onPress={onDone} style={{ width: '100%' }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
