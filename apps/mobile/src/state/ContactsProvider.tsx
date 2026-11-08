import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { decodeContacts, updateContact, type SavedContact } from '../domain/contacts';
import { normalizePhone } from '../services/dat';
import { useLive } from './live';

type ContactsValue = { contacts: SavedContact[]; ready: boolean; problem: string; nameFor: (phone: string | undefined, fallback?: string) => string; saveName: (phone: string, name: string) => Promise<void> };
const Context = createContext<ContactsValue | null>(null);
export function ContactsProvider({ children }: { children: ReactNode }) {
  const live = useLive();
  // A demo contact book never appears in a real wallet or another person's account.
  const owner = live.status === 'off' ? 'demo' : live.address ? `wallet:${live.address}` : '';
  const [state, setState] = useState<{ owner: string; contacts: SavedContact[] }>({ owner: '', contacts: [] });
  const [failure, setFailure] = useState<{ owner: string; message: string } | null>(null);
  const problem = failure?.owner === owner ? failure.message : '';
  const current = useRef(state);
  const activeOwner = useRef(owner);
  useLayoutEffect(() => { activeOwner.current = owner; }, [owner]);
  const pending = useRef(Promise.resolve());
  const key = owner ? `nest:contacts:v1:${owner}` : '';
  useEffect(() => {
    let active = true;
    if (!key) return;
    void AsyncStorage.getItem(key).then(raw => {
      if (!active) return;
      const next = { owner, contacts: decodeContacts(raw) }; current.current = next; setState(next); setFailure(null);
    }).catch(() => { if (active) setFailure({ owner, message: 'Your saved names could not be loaded. Try reopening Nest.' }); });
    return () => { active = false; };
  }, [key, owner]);
  const ready = !!owner && state.owner === owner;
  const contacts = useMemo(() => ready ? state.contacts : [], [ready, state.contacts]);
  const saveName = useCallback(async (phone: string, name: string) => {
    if (!owner || activeOwner.current !== owner || current.current.owner !== owner) throw new Error('Your contacts are still loading.');
    // Serialize writes so a failed disk write never claims the name was saved.
    const work = pending.current.catch(() => undefined).then(async () => {
      if (activeOwner.current !== owner || current.current.owner !== owner) throw new Error('Your account changed. Please try again.');
      const next = { owner, contacts: updateContact(current.current.contacts, phone, name) };
      await AsyncStorage.setItem(key, JSON.stringify(next.contacts));
      if (activeOwner.current === owner && current.current.owner === owner) { current.current = next; setState(next); setFailure(null); }
    });
    pending.current = work.catch(() => undefined);
    return work;
  }, [key, owner]);
  const nameFor = useCallback((phone: string | undefined, fallback = '') => {
    const normalized = normalizePhone(phone ?? '');
    return contacts.find(item => item.phone === normalized)?.name ?? fallback;
  }, [contacts]);
  return <Context.Provider value={{ contacts, ready, problem, nameFor, saveName }}>{children}</Context.Provider>;
}
export function useContacts() {
  const value = useContext(Context);
  if (!value) throw new Error('ContactsProvider is missing.');
  return value;
}
