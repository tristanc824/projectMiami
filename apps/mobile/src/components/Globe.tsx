import { Image, View, type StyleProp, type ViewStyle } from 'react-native';

export function Globe({ size = 350, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size }, style]}>
    <Image source={require('../../assets/globe/dotted-globe.png')} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
  </View>;
}
