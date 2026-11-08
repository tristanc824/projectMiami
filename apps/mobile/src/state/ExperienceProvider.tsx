import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// This remembers the welcome screen only. It is never an authentication token
// or a permission to move money; all wallet screens remain a local demo.
// v2: accounts were reset on Nov 8, so every device starts from onboarding again.
const WELCOME_KEY = 'lazo:welcome:v2';
const ExperienceContext = createContext({ ready: false, hasEntered: false, enter: () => {} });

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(WELCOME_KEY).then(value => {
      if (active) setHasEntered(value === 'seen');
    }).catch(() => undefined).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const enter = () => {
    setHasEntered(true);
    void AsyncStorage.setItem(WELCOME_KEY, 'seen').catch(() => undefined);
  };
  return <ExperienceContext.Provider value={{ ready, hasEntered, enter }}>{children}</ExperienceContext.Provider>;
}

export const useExperience = () => useContext(ExperienceContext);
