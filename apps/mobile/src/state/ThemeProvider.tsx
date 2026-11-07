import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

export type Scheme = 'light' | 'dark';
export type ThemePreference = 'system' | Scheme;

const THEME_KEY = 'guard:theme:v1';
const ThemeContext = createContext<{ scheme: Scheme; preference: ThemePreference; setPreference: (value: ThemePreference) => void }>({
  scheme: 'light', preference: 'system', setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_KEY).then(value => {
      if (active && (value === 'light' || value === 'dark' || value === 'system')) setPreferenceState(value);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  // Keep native chrome (keyboard, alerts, pickers) in sync with the in-app choice.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try { Appearance.setColorScheme(preference === 'system' ? 'auto' : preference); } catch { /* unsupported platform */ }
  }, [preference]);
  const setPreference = (value: ThemePreference) => {
    setPreferenceState(value);
    void AsyncStorage.setItem(THEME_KEY, value).catch(() => undefined);
  };
  const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return <ThemeContext.Provider value={{ scheme, preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
