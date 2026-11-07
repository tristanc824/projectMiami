import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '../theme';

export function GlassSurface({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, scheme } = useColors();
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => subscription.remove();
  }, []);
  if (reduceTransparency) return <View style={[style, { backgroundColor: colors.elevated }]}>{children}</View>;
  if (Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable()) {
    return <GlassView colorScheme={scheme} glassEffectStyle="regular" style={style}>{children}</GlassView>;
  }
  return <BlurView intensity={65} tint={scheme} style={[style, { backgroundColor: colors.glassFallback }]}>{children}</BlurView>;
}
