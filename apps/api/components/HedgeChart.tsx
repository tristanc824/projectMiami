'use client';

import { useState } from 'react';

const W = 340;
const H = 170;
const PAD = { top: 14, right: 12, bottom: 24, left: 34 };
const MONTHS = 12;
const USD = '#0F7A5A';
const LOCAL = '#C2552D';

const local = (rate: number, month: number) => 100 * Math.pow(1 - rate / 100, month / 12);
const x = (m: number) => PAD.left + (m / MONTHS) * (W - PAD.left - PAD.right);
const y = (v: number) => Number((PAD.top + (1 - v / 100) * (H - PAD.top - PAD.bottom)).toFixed(2));

// An illustration of a falling currency, driven by the slider: it is not market data.
export default function HedgeChart() {
  const [rate, setRate] = useState(40);
  const [hover, setHover] = useState<number | null>(null);
  const months = Array.from({ length: MONTHS + 1 }, (_, m) => m);
  const end = local(rate, MONTHS);
  const shown = hover ?? MONTHS;

  return (
    <section className="card">
      <h2>Why hold dollars</h2>
      <p className="muted">
        If your currency loses {rate}% a year against the dollar, $100 of savings is worth about{' '}
        <strong>${Math.round(end)}</strong> after a year.
      </p>
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Value of $100 over 12 months. Held in dollars it stays at $100. Held in a currency falling ${rate}% a year it ends near $${Math.round(end)}.`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - box.left) / box.width) * W;
            setHover(Math.max(0, Math.min(MONTHS, Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * MONTHS))));
          }}
        >
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="grid" />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="axis">${v}</text>
            </g>
          ))}
          {[0, 6, 12].map((m) => (
            <text key={m} x={x(m)} y={H - 6} textAnchor="middle" className="axis">
              {m === 0 ? 'Today' : `${m} mo`}
            </text>
          ))}
          <polyline fill="none" stroke={USD} strokeWidth="2" strokeLinecap="round" points={months.map((m) => `${x(m)},${y(100)}`).join(' ')} />
          <polyline fill="none" stroke={LOCAL} strokeWidth="2" strokeLinecap="round" points={months.map((m) => `${x(m)},${y(local(rate, m))}`).join(' ')} />
          <line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={H - PAD.bottom} className="crosshair" />
          <circle cx={x(shown)} cy={y(100)} r="4" fill={USD} stroke="var(--surface)" strokeWidth="2" />
          <circle cx={x(shown)} cy={y(local(rate, shown))} r="4" fill={LOCAL} stroke="var(--surface)" strokeWidth="2" />
        </svg>
      </div>
      <dl className="legend">
        <div>
          <dt><i style={{ background: USD }} />In DAT dollars</dt>
          <dd>$100</dd>
        </div>
        <div>
          <dt><i style={{ background: LOCAL }} />In local currency</dt>
          <dd>${Math.round(local(rate, shown))}</dd>
        </div>
        <div className="legend-when">{shown === 0 ? 'Today' : `After ${shown} months`}</div>
      </dl>
      <label className="slider">
        <span>Yearly currency loss: {rate}%</span>
        <input type="range" min="10" max="80" step="5" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
      </label>
      <p className="fine">Illustration only. USDC follows the dollar, so dollar inflation still applies.</p>
    </section>
  );
}
