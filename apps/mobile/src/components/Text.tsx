import { useRef, type ComponentRef } from 'react';
import { useFormFocus } from './KeyboardForm';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextInputProps, type TextProps, type TextStyle } from 'react-native';

function typography(style: TextProps['style']): TextStyle {
  const flat = StyleSheet.flatten(style);
  const weight = Number(flat?.fontWeight ?? 400);
  return { fontFamily: weight >= 600 ? 'Figtree-Semibold' : weight >= 500 ? 'Figtree-Medium' : 'Figtree', fontWeight: 'normal' };
}

export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontSize: 15 }, style, typography(style)]} />;
}

export function TextInput({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const input = useRef<ComponentRef<typeof NativeTextInput>>(null);
  const form = useFormFocus();
  return <NativeTextInput {...props} ref={input} onFocus={event => { form.focus(input.current); onFocus?.(event); }} onBlur={event => { form.blur(input.current); onBlur?.(event); }} style={[{ fontSize: 16 }, style, typography(style)]} />;
}
