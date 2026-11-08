import { Image, View } from 'react-native';
import { useColors } from '../theme';

export function NestMark({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return <Image accessible={false} source={light ? require('../../assets/nest/mark-white.png') : require('../../assets/nest/mark.png')} style={{ width: size, height: size }} />;
}

/** Quiet, static bird silhouettes; no motion when opening the app. */
export function Birds({ light = false }: { light?: boolean }) {
  const { colors } = useColors();
  return <View pointerEvents="none" accessible={false} style={{ width: 180, height: 60 }}>
    {[{ left: 4, top: 26, scale: 1 }, { left: 75, top: 8, scale: .65 }, { left: 124, top: 39, scale: .8 }].map((bird, i) => <View key={i} style={{ position: 'absolute', left: bird.left, top: bird.top, width: 30, height: 12, transform: [{ scale: bird.scale }] }}>
      {[-1, 1].map(side => <View key={side} style={{ position: 'absolute', left: side === -1 ? 0 : 13, top: 0, width: 17, height: 9, borderTopWidth: 2, borderColor: light ? '#FFFFFFAA' : colors.green, borderRadius: 20, transform: [{ rotate: `${side * 15}deg` }] }} />)}
    </View>)}
  </View>;
}

export function DollarComparison() {
  const { colors } = useColors();
  return <View accessible accessibilityLabel="Illustration: dollars remain flat while peso purchasing power declines. Not your account performance." style={{ height: 64, marginTop: 14, marginBottom: 10 }}>
    <View style={{ position: 'absolute', top: 10, left: 0, right: 4, height: 2, backgroundColor: colors.green }} />
    <View style={{ position: 'absolute', top: 6, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.surface }} />
    <View style={{ position: 'absolute', left: 0, right: 4, top: 10, height: 47, flexDirection: 'row', alignItems: 'flex-start' }}>
      {Array.from({ length: 24 }, (_, i) => <View key={i} style={{ flex: 1, height: 2, backgroundColor: '#5FA8D6', marginRight: 4, marginTop: i * 1.85, transform: [{ rotate: '10deg' }] }} />)}
    </View>
    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: '#5FA8D6', borderWidth: 2, borderColor: colors.surface }} />
  </View>;
}
