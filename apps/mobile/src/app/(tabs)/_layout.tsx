import { Tabs } from 'expo-router';
import { type ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useKeyboardVisible } from '../../components/KeyboardForm';
import { Text } from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DOCK_HEIGHT, Icon, type IconName } from '../../components/ui';
import { themedStyles, useColors } from '../../theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const tabs: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', active: 'home' },
  save: { label: 'Save', icon: 'leaf-outline', active: 'leaf' },
  security: { label: 'Security', icon: 'shield-checkmark-outline', active: 'shield-checkmark' },
  account: { label: 'You', icon: 'person-outline', active: 'person' },
};

function NestTabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { colors } = useColors();
  const s = useS();
  if (keyboardVisible) return null;
  return <View style={[s.position, { paddingBottom: Math.max(insets.bottom, 12) }]}>
    <View accessibilityRole="tablist" style={s.bar}>{state.routes.map((route, index) => {
      const tab = tabs[route.name];
      if (!tab) return null;
      const active = state.index === index;
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} aria-selected={active} onPress={() => {
        const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!active && !event.defaultPrevented) navigateToTab(route.key);
      }} onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })} style={({ pressed }) => [s.item, { opacity: pressed ? .6 : 1 }]}>
        <View style={[s.icon, active && { backgroundColor: colors.mint }]}><Icon name={active ? tab.active : tab.icon} size={23} color={active ? colors.green : colors.tabInactive} /></View>
        <Text style={[s.label, { color: active ? colors.green : colors.tabInactive }]}>{tab.label}</Text>
      </Pressable>;
    })}</View>
  </View>;
}

export default function TabsLayout() {
  const { colors } = useColors();
  return <Tabs tabBar={props => <NestTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} /><Tabs.Screen name="save" options={{ title: 'Save' }} /><Tabs.Screen name="security" options={{ title: 'Security' }} /><Tabs.Screen name="account" options={{ title: 'You' }} />
  </Tabs>;
}
const useS = themedStyles(colors => ({
  position: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.line },
  bar: { width: '100%', maxWidth: 620, height: DOCK_HEIGHT, paddingHorizontal: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 3 },
  icon: { width: 52, height: 32, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '500' },
}));
