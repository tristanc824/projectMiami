import { useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { useColors } from '../theme';

export function NestMark({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return <Image accessible={false} source={light ? require('../../assets/nest/mark-white.png') : require('../../assets/nest/mark.png')} style={{ width: size, height: size }} />;
}

/** Quiet, static bird silhouettes; no motion when opening the app. */
export function Birds({ light = false }: { light?: boolean }) {
  const { colors } = useColors();
  return <View pointerEvents="none" accessible={false} style={{ width: 180, height: 60 }}>
    {[{ left: 4, top: 26, scale: 1 }, { left: 75, top: 8, scale: .65 }, { left: 124, top: 39, scale: .8 }].map((bird, i) => <View key={i} style={{ position: 'absolute', left: bird.left, top: bird.top, width: 30, height: 12, transform: [{ scale: bird.scale }] }}>
      {[-1, 1].map(side => <View key={side} style={{ position: 'absolute', left: side === -1 ? 0 : 13, top: 0, width: 17, height: 9, borderTopWidth: 2, borderColor: light ? '#FFFFFFAA' : colors.green, borderRadius: 20, transform: [{ rotate: `${side * 15}deg` }] }} />)}
    </View>)}
  </View>;
}

const DAY = 86_400_000;
type Movement = { kind: 'send' | 'add' | 'withdraw' | 'receive'; amountCents: number; feeCents: number; createdAt: string };

/** Balance at each change over the past `days`, rebuilt backwards from today's balance. */
export function balanceSeries(balanceCents: number, activity: Movement[], now = Date.now(), days = 30) {
  const start = now - days * DAY;
  const recent = activity.filter(item => Date.parse(item.createdAt) > start).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const points = [{ t: now, cents: balanceCents }];
  let cents = balanceCents;
  for (const item of recent) {
    const t = Date.parse(item.createdAt);
    const incoming = item.kind === 'add' || item.kind === 'receive';
    points.push({ t, cents });
    cents -= incoming ? item.amountCents : -(item.amountCents + item.feeCents);
    cents = Math.max(0, cents);
    points.push({ t, cents });
  }
  points.push({ t: start, cents });
  return points.reverse();
}

/** One line: the balance over the past month, in dollars only. Drawn as steps, because a balance changes in steps. */
export function BalanceLine({ balanceCents, activity, height = 72 }: { balanceCents: number; activity: Movement[]; height?: number }) {
  const { colors } = useColors();
  const [width, setWidth] = useState(0);
  const now = useMemo(() => Date.now(), []);
  const points = useMemo(() => balanceSeries(balanceCents, activity, now), [balanceCents, activity, now]);
  const max = Math.max(...points.map(p => p.cents), 1);
  const start = points[0].t, span = Math.max(1, now - start);
  const x = (t: number) => (t - start) / span * width;
  const y = (cents: number) => height - 3 - cents / max * (height - 8);
  const segments: { left: number; top: number; w: number; h: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (a.cents === b.cents) segments.push({ left: x(a.t), top: y(a.cents) - 1, w: Math.max(0, x(b.t) - x(a.t)), h: 2.5 });
    else segments.push({ left: x(b.t) - 1, top: Math.min(y(a.cents), y(b.cents)) - 1, w: 2.5, h: Math.abs(y(a.cents) - y(b.cents)) + 2.5 });
  }
  return <View accessible accessibilityLabel="Your balance over the past month" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height, marginTop: 18 }}>
    {width ? segments.map((seg, i) => <View key={i} style={{ position: 'absolute', left: seg.left, top: seg.top, width: seg.w, height: seg.h, borderRadius: 2, backgroundColor: colors.green }} />) : null}
    {width ? <View style={{ position: 'absolute', left: width - 5, top: y(balanceCents) - 4, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green }} /> : null}
  </View>;
}
