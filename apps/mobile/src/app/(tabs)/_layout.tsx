import { Tabs } from 'expo-router';
import { type ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '../../components/GlassSurface';
import { DOCK_HEIGHT, Icon, type IconName } from '../../components/ui';
import { themedStyles, useColors } from '../../theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const tabs: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', active: 'home' },
  family: { label: 'Family', icon: 'people-outline', active: 'people' },
  activity: { label: 'Activity', icon: 'swap-vertical-outline', active: 'swap-vertical' },
  account: { label: 'You', icon: 'person-outline', active: 'person' },
};

function FloatingTabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useColors();
  const s = useS();
  return <View pointerEvents="box-none" style={[s.position, { bottom: Math.max(insets.bottom, 16) }]}>
    <GlassSurface style={s.bar}>
      {state.routes.map((route, index) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const active = state.index === index;
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: active }}
          onPress={() => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) navigateToTab(route.key);
          }} onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
          style={({ pressed }) => [s.item, active && s.active, { opacity: pressed ? .65 : 1 }]}>
          <Icon name={active ? tab.active : tab.icon} size={21} color={active ? colors.accent : colors.tabInactive} />
          <Text style={[s.label, { color: active ? colors.accent : colors.tabInactive }]}>{tab.label}</Text>
        </Pressable>;
      })}
    </GlassSurface>
  </View>;
}

export default function TabsLayout() {
  const { colors } = useColors();
  return <Tabs tabBar={props => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} /><Tabs.Screen name="family" options={{ title: 'Family' }} /><Tabs.Screen name="activity" options={{ title: 'Activity' }} /><Tabs.Screen name="account" options={{ title: 'You' }} />
  </Tabs>;
}

const useS = themedStyles(colors => ({
  position: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  bar: { width: '100%', maxWidth: 540, height: DOCK_HEIGHT, borderRadius: DOCK_HEIGHT / 2, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder, padding: 7, flexDirection: 'row', alignItems: 'center', boxShadow: '0 5px 32px rgba(22, 38, 75, 0.12), inset 0 1px 1px rgba(255,255,255,0.9)' },
  item: { flex: 1, height: 60, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 31 },
  active: { backgroundColor: colors.accentTint }, label: { fontSize: 10, fontWeight: '600' },
}));
