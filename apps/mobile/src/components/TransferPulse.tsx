import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '../theme';
import { Icon } from './ui';

/** A short acknowledgement of a completed action; never delays a receipt. */
export function TransferPulse({ incoming = false }: { incoming?: boolean }) {
  const { colors } = useColors();
  const [progress] = useState(() => new Animated.Value(0));
  const [check] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    let motion: Animated.CompositeAnimation | undefined;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!active) return;
      if (reduce) { progress.setValue(1); check.setValue(1); return; }
      motion = Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(check, { toValue: 1, friction: 6, tension: 100, useNativeDriver: Platform.OS !== 'web' }),
      ]);
      motion.start();
    }).catch(() => { if (active) { progress.setValue(1); check.setValue(1); } });
    return () => { active = false; motion?.stop(); };
  }, [progress, check]);
  return <View testID="transfer-celebration" style={{ width: 136, height: 136, alignItems: 'center', justifyContent: 'center' }}>
    {[0, 1].map(index => <Animated.View key={index} style={{ position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: colors.green, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [.4, 0] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5 + index * .3] }) }] }} />)}
    <Animated.View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', opacity: check, transform: [{ scale: check.interpolate({ inputRange: [0, 1], outputRange: [.65, 1] }) }] }}><Icon name={incoming ? 'arrow-down' : 'checkmark'} color={colors.white} size={44} /></Animated.View>
  </View>;
}
