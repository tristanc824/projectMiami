import { Platform, Text as NativeText, TextInput as NativeTextInput, type TextInputProps, type TextProps } from 'react-native';

/** The native system font (SF Pro on iOS, Roboto on Android, system-ui on web), used app-wide. */
export const SYSTEM_FONT = Platform.select({ android: 'sans-serif', default: 'System' });

/** App-wide Text: always the system font; a style can still override fontFamily. */
export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: SYSTEM_FONT }, style]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <NativeTextInput {...props} style={[{ fontFamily: SYSTEM_FONT }, style]} />;
}
