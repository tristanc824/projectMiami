import { Redirect, Tabs } from 'expo-router';
import { useLive } from '../../state/live';
import { type ComponentProps } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useKeyboardVisible } from '../../components/KeyboardForm';
import { Text } from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Brand, DOCK_HEIGHT, Icon, SIDEBAR_WIDTH, useDesktop, type IconName } from '../../components/ui';
import { formatPhone } from '../../services/dat';
import { themedStyles, useColors } from '../../theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const tabs: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', active: 'home' },
  security: { label: 'Security', icon: 'shield-checkmark-outline', active: 'shield-checkmark' },
  account: { label: 'You', icon: 'person-outline', active: 'person' },
};

/** Laptop browsers: a left sidebar with the logo and the same tabs, like a web banking app. */
function NestSidebar({ state, emitter, navigateToTab }: TabBarProps) {
  const { colors } = useColors();
  const s = useS();
  const live = useLive();
  return <View style={s.sidebar}>
    <View style={{ paddingHorizontal: 12, marginBottom: 36 }}><Brand small /></View>
    <View accessibilityRole="tablist" style={{ gap: 4 }}>{state.routes.map((route, index) => {
      const tab = tabs[route.name];
      if (!tab) return null;
      const active = state.index === index;
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} aria-selected={active} onPress={() => {
        const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!active && !event.defaultPrevented) navigateToTab(route.key);
      }} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [s.sideItem, { backgroundColor: active ? colors.mint : hovered ? colors.softer : 'transparent', opacity: pressed ? .7 : 1 }]}>
        <Icon name={active ? tab.active : tab.icon} size={21} color={active ? colors.green : colors.tabInactive} />
        <Text style={{ fontSize: 16, fontWeight: active ? '600' : '500', color: active ? colors.green : colors.ink }}>{tab.label}</Text>
      </Pressable>;
    })}</View>
    <View style={{ flex: 1 }} />
    {live.status === 'ready' ? <View style={[s.sideItem, { marginBottom: 4 }]}><Avatar contact={{ initials: '' }} size={32} /><Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: colors.ink }}>{formatPhone(live.phone) || 'Signed in'}</Text></View> : null}
  </View>;
}

function NestTabBar(props: TabBarProps) {
  const { state, emitter, navigateToTab } = props;
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const desktop = useDesktop();
  const { colors } = useColors();
  const s = useS();
  if (desktop) return <NestSidebar {...props} />;
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
  const live = useLive();
  const desktop = useDesktop();
  if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_NEST_WEB_WALLET === 'true' && live.status !== 'ready') return <Redirect href="/sign-in" />;
  return <Tabs tabBar={props => <NestTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background, paddingLeft: desktop ? SIDEBAR_WIDTH : 0 } }}>
    {/* Save is hidden: no savings goals in the app (Nov 7). The route redirects home. */}
    <Tabs.Screen name="index" options={{ title: 'Home' }} /><Tabs.Screen name="save" options={{ title: 'Save', href: null }} /><Tabs.Screen name="security" options={{ title: 'Security' }} /><Tabs.Screen name="account" options={{ title: 'You' }} />
  </Tabs>;
}
const useS = themedStyles(colors => ({
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH, paddingTop: 32, paddingBottom: 20, paddingHorizontal: 16, backgroundColor: colors.background, borderRightWidth: 1, borderRightColor: colors.line },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingHorizontal: 12, borderRadius: 14 },
  position: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.line },
  bar: { width: '100%', maxWidth: 620, height: DOCK_HEIGHT, paddingHorizontal: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 3 },
  icon: { width: 52, height: 32, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '500' },
}));
