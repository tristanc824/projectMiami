import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLive } from './live';

type Profile = { name: string; photos: Record<string, string> };
type Value = Profile & { ready: boolean; update: (change: { name: string } | { id: string; photo: string | null }) => Promise<void> };
const Context = createContext<Value | null>(null);
const empty: Profile = { name: '', photos: {} };
export function ProfileProvider({ children }: { children: ReactNode }) {
  const live = useLive();
  const owner = live.status === 'off' ? 'demo' : live.address;
  const key = owner ? `nest:profile:v1:${owner}` : '';
  const [state, setState] = useState({ key: '', profile: empty });
  const current = useRef(state);
  const ownerKey = useRef(key);
  useLayoutEffect(() => { ownerKey.current = key; }, [key]);
  const pending = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    if (!key) return;
    void AsyncStorage.getItem(key).then(raw => {
      const value = raw ? JSON.parse(raw) : {};
      const photos: Record<string, string> = {};
      if (value.photos && typeof value.photos === 'object') for (const [id, photo] of Object.entries(value.photos)) {
        if (typeof photo === 'string' && photo.startsWith('data:image/') && photo.length < 2_000_000) photos[id] = photo;
      }
      if (active) { const next = { key, profile: { name: typeof value.name === 'string' ? value.name.slice(0, 40) : '', photos } }; current.current = next; setState(next); }
    }).catch(() => { if (active) { const next = { key, profile: empty }; current.current = next; setState(next); } });
    return () => { active = false; };
  }, [key]);
  const update: Value['update'] = change => {
    const work = pending.current.catch(() => undefined).then(async () => {
      if (!key || ownerKey.current !== key || current.current.key !== key) throw new Error('Your profile is still loading. Please try again.');
      if (owner !== 'demo' && ('name' in change || change.id === 'self')) {
        const { approvePayment } = await import('../services/approval');
        await approvePayment('Update your Nest profile');
        if (ownerKey.current !== key) throw new Error('Your account changed. Please try again.');
      }
      const profile = { ...current.current.profile, photos: { ...current.current.profile.photos } };
      if ('name' in change) profile.name = change.name.trim().slice(0, 40);
      else if (change.photo) profile.photos[change.id] = change.photo;
      else delete profile.photos[change.id];
      await AsyncStorage.setItem(key, JSON.stringify(profile));
      if (ownerKey.current === key) { const next = { key, profile }; current.current = next; setState(next); }
    });
    pending.current = work.catch(() => undefined);
    return work;
  };
  const ready = !!key && state.key === key;
  return <Context.Provider value={{ ...(ready ? state.profile : empty), ready, update }}>{children}</Context.Provider>;
}
export function useProfile() {
  const value = useContext(Context);
  if (!value) throw new Error('ProfileProvider is missing.');
  return value;
}
