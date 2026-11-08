import createQrCode from 'qrcode-generator';
import { useMemo } from 'react';
import { View } from 'react-native';

/** A real QR matrix, rendered as runs so it works offline on native and web. */
export function RequestCode({ value, size = 224 }: { value: string; size?: number }) {
  const rows = useMemo(() => {
    const qr = createQrCode(0, 'M');
    qr.addData(value, 'Byte'); qr.make();
    const count = qr.getModuleCount();
    return Array.from({ length: count }, (_, y) => {
      const runs: { dark: boolean; width: number }[] = [];
      for (let x = 0; x < count; x++) {
        const dark = qr.isDark(y, x);
        const previous = runs[runs.length - 1];
        if (previous?.dark === dark) previous.width++;
        else runs.push({ dark, width: 1 });
      }
      return runs.map(run => ({ ...run, width: run.width / count * size }));
    });
  }, [value, size]);
  return <View accessible accessibilityLabel="Scan to open your Nest payment request" style={{ backgroundColor: '#FFFFFF', padding: 16, width: size + 32, height: size + 32 }}>
    {rows.map((runs, y) => <View key={y} style={{ height: size / rows.length, flexDirection: 'row' }}>{runs.map((run, x) => <View key={x} style={{ width: run.width, height: size / rows.length, backgroundColor: run.dark ? '#17201A' : '#FFFFFF' }} />)}</View>)}
  </View>;
}
