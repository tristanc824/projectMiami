import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type ComponentRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text as NativeText, View, type ScrollViewProps, TextInput, type ViewStyle, type StyleProp } from 'react-native';
import { useColors } from '../theme';

type InputInstance = ComponentRef<typeof TextInput>;
const FocusContext = createContext({ focus: (_input: InputInstance | null) => {}, blur: (_input: InputInstance | null) => {} });
export const useFormFocus = () => useContext(FocusContext);
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}
export function KeyboardFrame({ children, style, offset = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; offset?: number }) {
  const { colors } = useColors();
  const visible = useKeyboardVisible();
  const [webInset, setWebInset] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => setWebInset(viewport.scale === 1 ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0);
    resize(); viewport.addEventListener('resize', resize);
    return () => viewport.removeEventListener('resize', resize);
  }, []);
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} keyboardVerticalOffset={offset} style={[{ flex: 1 }, style, webInset > 0 && { paddingBottom: webInset }]}>
    {children}
    {visible ? <View style={{ backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'flex-end', paddingHorizontal: 18 }}><Pressable accessibilityRole="button" accessibilityLabel="Done typing" onPress={Keyboard.dismiss} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}><NativeText style={{ fontFamily: 'Figtree-Medium', fontSize: 16, color: colors.green }}>Done</NativeText></Pressable></View> : null}
  </KeyboardAvoidingView>;
}

/** Keep the focused field inside the actual scroll viewport, including fixed footers. */
export function KeyboardScroll({ children, onScroll, onLayout, ...props }: ScrollViewProps) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const focused = useRef<InputInstance | null>(null);
  const offset = useRef(0);
  const frame = useRef<number | null>(null);
  const reveal = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = focused.current, container = scroll.current;
      if (!input || !container) return;
      if (Platform.OS === 'web') {
        (input as unknown as HTMLElement).scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        return;
      }
      input.measureInWindow((_x, y, _w, height) => {
        if (focused.current !== input) return;
        container.measureInWindow((_sx, top, _sw, availableHeight) => {
          if (scroll.current !== container || focused.current !== input) return;
          const keyboardTop = Keyboard.metrics()?.screenY ?? Number.POSITIVE_INFINITY;
          const bottom = Math.min(top + availableHeight, keyboardTop) - 20;
          const delta = y + height > bottom ? y + height - bottom : y < top + 16 ? y - top - 16 : 0;
          if (delta) container.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
        });
      });
    });
  }, []);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', reveal);
    const change = Keyboard.addListener('keyboardDidChangeFrame', reveal);
    const viewport = Platform.OS === 'web' ? window.visualViewport : undefined;
    viewport?.addEventListener('resize', reveal);
    return () => { show.remove(); change.remove(); viewport?.removeEventListener('resize', reveal); if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, [reveal]);
  return <FocusContext.Provider value={{ focus: input => { focused.current = input; reveal(); }, blur: input => { if (focused.current === input) focused.current = null; } }}><ScrollView {...props} ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : Platform.OS === 'android' ? 'on-drag' : 'none'} scrollEventThrottle={16} onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }} onLayout={event => { reveal(); onLayout?.(event); }}>{children}</ScrollView></FocusContext.Provider>;
}
