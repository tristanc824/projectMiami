/*
 * Nest film v2: the single source of truth for the picture (src/film/Film.tsx) and the mix
 * (scripts/render-film.sh reads this file through scripts/film-cues.mjs, scripts/film-sync.mjs
 * checks the hits against the kicks). Plain data and pure functions only, no imports, so Node can
 * load it directly with type stripping.
 *
 * The clock is the song: Gotan Project, "Santa María (del Buen Ayre)", 117.855 BPM.
 * Film t = 0 is song t = 0.9336 s (a bar downbeat). Grid: public/film/music/santa-maria-grid.json.
 * Never accumulate rounded frames: every frame below comes from bar(n), beat(k) or at(n, b).
 * Spec: FILM_V2_SPEC.md.
 */

export const FILM_FPS = 24;
export const FILM_W = 1920;
export const FILM_H = 1080;

/** Beat and bar in seconds and in frames (grid json: beatSec 0.5091, barSec 2.0364, 24 fps). */
export const BEAT_SEC = 0.5091;
export const BAR_SEC = 2.0364;
export const BEAT_F = 12.2184;
export const BAR_F = 48.8736;
export const SONG_OFFSET_SEC = 0.9336;

/** Frame of bar n (0-based). */
export const bar = (n: number) => Math.round(n * BAR_F);
/** Frame of beat k (0-based, counted from film start; k may be fractional: k + 0.5 is the "and"). */
export const beat = (k: number) => Math.round(k * BEAT_F);
/** Frame of bar n, beat b (1-based like the spec: at(13, 2) = bar 13 beat 2; 1.5 = the "and" of 1). */
export const at = (n: number, b = 1) => beat(n * 4 + b - 1);
/** Seconds of beat k (exact, not frame-rounded) for audio placement. */
export const beatSec = (k: number) => k * BEAT_SEC;
export const barSec = (n: number) => n * BAR_SEC;

export const FILM_BARS = 42;
/** 2053 frames = 85.54 s. */
export const FILM_FRAMES = bar(FILM_BARS);

/* ------------------------------------------------------------------ the bar map */

export type SceneId =
  | "map" | "inflation" | "drop" | "always" | "send" | "claim" | "offline"
  | "scam" | "check" | "undo" | "security" | "close" | "end";

/**
 * [scene, first bar, swap]. A scene runs from its first bar's downbeat to the next scene's.
 * `swap` = frames before the downbeat at which the incoming scene takes over the picture: the
 * one-beat transition finishes on the downbeat, so the outgoing half plays in the last beat of
 * the previous scene and the incoming half lands on the downbeat (0 = hard cut or continuous).
 *
 * Deviation from the spec table (see report): "undo" keeps bar 32, so the undo check, the music
 * filter opening and the resolved balance all land on the 65.165 downbeat and hold for a bar;
 * the three security cards land on bars 33, 34 and 35.
 */
const BAR_MAP: [SceneId, number, number][] = [
  ["map", 0, 0],
  ["inflation", 4, 6],
  ["drop", 8, 0],
  ["always", 11, 6],
  ["send", 13, 6],
  ["claim", 17, 6],
  ["offline", 20, 6],
  ["scam", 24, 0],
  ["check", 26, 12],
  ["undo", 29, 6],
  ["security", 33, 6],
  ["close", 36, 6],
  ["end", 40, 0],
];

export type Scene = { id: SceneId; bars: [number, number]; from: number; to: number; dur: number; swap: number };

export const SCENES: Scene[] = BAR_MAP.map(([id, b0, swap], i) => {
  const b1 = i + 1 < BAR_MAP.length ? BAR_MAP[i + 1][1] : FILM_BARS;
  return { id, bars: [b0, b1], from: bar(b0), to: bar(b1), dur: bar(b1) - bar(b0), swap };
});

export const SC = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, Scene>;

/** Chapter label (top-left). Frames are absolute. */
export const CHAPTERS = [
  { word: "Send", from: SC.always.from, to: SC.scam.from },
  { word: "Protect", from: SC.scam.from, to: SC.close.from },
];

/* ------------------------------------------------------------------ kicks */

/**
 * Detected kicks from santa-maria-grid.json: [frame, strength]. Used for the kick accents and to
 * snap primary hits. The song runs ~0.14% faster than the grid's 117.855 BPM, so late in the film
 * the kicks fall 1-2 frames before the grid beats; cuts stay on the grid formula, hits snap.
 */
export const KICKS: [number, number][] = [
  [42, 0.136], [91, 0.161], [139, 0.403], [171, 0.306], [186, 0.055], [209, 0.077], [215, 0.133], [227, 0.151],
  [234, 0.124], [239, 0.148], [257, 0.193], [263, 0.181], [276, 0.238], [287, 0.145], [293, 0.075], [307, 0.087],
  [312, 0.169], [325, 0.125], [332, 0.141], [337, 0.095], [342, 0.081], [355, 0.138], [361, 0.183], [373, 0.173],
  [385, 0.158], [392, 0.125], [398, 0.127], [404, 0.081], [422, 0.063], [435, 0.069], [440, 0.062], [446, 0.247],
  [452, 0.226], [465, 0.118], [489, 0.153], [495, 0.118], [501, 0.108], [507, 0.062], [533, 0.079], [538, 0.069],
  [544, 0.231], [550, 0.215], [559, 0.058], [587, 0.078], [596, 0.071], [604, 0.073], [618, 0.089], [625, 0.056],
  [636, 0.077], [642, 0.140], [648, 0.240], [673, 0.057], [684, 0.077], [690, 0.116], [697, 0.140], [716, 0.059],
  [733, 0.053], [739, 0.090], [745, 0.176], [782, 0.122], [788, 0.127], [794, 0.088], [800, 0.067], [813, 0.055],
  [826, 0.072], [839, 0.104], [855, 0.125], [880, 0.156], [886, 0.089], [892, 0.122], [931, 0.094], [940, 0.203],
  [953, 0.134], [977, 0.122], [984, 0.086], [989, 0.137], [995, 0.072], [1008, 0.064], [1013, 0.062], [1026, 0.094],
  [1032, 0.095], [1038, 0.172], [1044, 0.072], [1051, 0.061], [1075, 0.137], [1081, 0.137], [1087, 0.159], [1109, 0.052],
  [1122, 0.056], [1132, 0.079], [1142, 0.096], [1148, 0.099], [1173, 0.105], [1179, 0.116], [1185, 0.126], [1190, 0.079],
  [1195, 0.060], [1217, 0.052], [1222, 0.116], [1235, 0.087], [1246, 0.184], [1270, 0.190], [1276, 0.124], [1282, 0.133],
  [1299, 0.052], [1319, 0.084], [1325, 0.096], [1331, 0.067], [1337, 0.125], [1343, 0.126], [1363, 0.065], [1368, 0.090],
  [1374, 0.067], [1380, 0.135], [1386, 0.095], [1417, 0.069], [1423, 0.075], [1429, 0.132], [1435, 0.109], [1441, 0.089],
  [1465, 0.080], [1471, 0.116], [1478, 0.150], [1482, 0.060], [1514, 0.132], [1520, 0.108], [1526, 0.104], [1532, 0.177],
  [1539, 0.112], [1545, 0.067], [1557, 0.065], [1564, 0.080], [1569, 0.164], [1581, 0.070], [1589, 0.066], [1608, 0.077],
  [1615, 0.086], [1630, 0.117], [1642, 0.139], [1658, 0.081], [1666, 0.203], [1673, 0.105], [1679, 0.096], [1690, 0.069],
  [1710, 0.068], [1715, 0.139], [1722, 0.078], [1730, 0.095], [1737, 0.151], [1752, 0.065], [1764, 0.158], [1777, 0.076],
  [1789, 0.102], [1799, 0.052], [1813, 0.167], [1820, 0.077], [1825, 0.116], [1837, 0.110], [1847, 0.054], [1856, 0.072],
  [1862, 0.182], [1868, 0.086], [1874, 0.057], [1886, 0.107], [1905, 0.081], [1911, 0.167], [1917, 0.084], [1923, 0.088],
  [1935, 0.119], [1949, 0.097], [1954, 0.063], [1959, 0.245], [1966, 0.114], [1972, 0.093], [1976, 0.077], [1984, 0.090],
  [2002, 0.084], [2008, 0.127], [2021, 0.077], [2033, 0.195], [2045, 0.120],
];

/** Nearest kick frame within ±w frames of f (ties go to the stronger kick), else f itself. */
export const snap = (f: number, w = 3) => {
  let best = f;
  let d = w + 1;
  let s = -1;
  for (const [k, st] of KICKS) {
    const dk = Math.abs(k - f);
    if (dk < d || (dk === d && st > s)) {
      d = dk;
      best = k;
      s = st;
    }
  }
  return best;
};

/** A hit on grid frame f: kept on the grid when a kick is within 1 frame, else moved onto the nearest kick within ±w. */
export const hit = (f: number, w = 3) => {
  const k = snap(f, w);
  return Math.abs(k - f) <= 1 ? f : k;
};

/* ------------------------------------------------------------------ hits */

/**
 * Primary hits: the moments a scene is built around. `f` is the frame the impact shows on screen;
 * kick hits are snapped to the nearest detected kick (scripts/film-sync.mjs checks |f - kick| <= 1).
 * `beatOnly` hits sit on a grid beat that has no kick under it (ring 3, the wordmark...).
 */
export type Hit = { id: string; f: number; note: string; beatOnly?: boolean };

export const HIT = {
  // 1 map (b01: "My mom lives in Buenos Aires. I live in Miami.")
  baPop: hit(at(0, 4.5)), // 42: on "Aires", the intro's first accent
  baLabel: at(1, 1), // 49
  miamiPop: at(1, 3), // 73: on "Miami"
  miamiLabel: at(1, 3.5), // 79
  arcFrom: at(2, 1), // 98
  arcLand: hit(at(2, 4.5)), // 139: strongest accent of the intro
  dotIn: at(3, 1), // 147
  // 2 inflation: month k on beat 3 + k (k = 0 Jan ... 11 Dec), collapse on the pickup
  monthsFrom: at(4, 4), // 232
  pickup: at(7, 4), // 379
  // 3 drop
  ring1: at(8, 1), // 391 = the drop
  ring2: at(8, 2), // 403
  ring3: at(8, 3), // 415
  word: at(8, 4), // 428
  keyword: at(9, 1), // 440
  fly: at(10, 1), // 489
  // 5 send
  bank1: at(13, 2), // 648
  bank2: at(13, 3), // 660
  bank3: at(13, 4), // 672
  oldArrives: at(14, 1), // 684
  nestLaunch: at(14, 2), // 696
  nestLands: at(14, 3), // 709
  feesChip: at(15, 1), // 733
  zeroFee: at(15, 2), // 745
  arrived: at(16, 1), // 782: "No fee." on the word "fee"
  // 6 claim
  linkIn: at(17, 2), // 843
  morph: at(18, 1), // 880
  tapLink: at(18, 3), // 904
  claimIn: at(19, 1), // 929
  tapClaim: at(19, 2), // 941
  claimed: at(19, 3), // 953
  // 7 offline
  wifiOff: at(20, 2), // 990
  smsOut: at(21, 1), // 1026
  smsTower: at(21, 2), // 1039
  smsAway: at(21, 3), // 1051
  signalOff: at(21, 4), // 1063
  queued: at(22, 1), // 1075
  sent: at(23, 1), // 1124
  // 8 scam
  scamCut: at(24, 1), // 1173
  buzz: at(24, 2), // 1185 = 49.383 s
  // 9 check
  amber: at(26, 1), // 1271
  reason1: at(26, 2), // 1283
  reason2: at(26, 3), // 1295
  reason3: at(26, 4), // 1307
  holdFrom: at(28, 1), // 1368
  // 10 undo
  sendAnyway: at(29, 2), // 1430
  heldAt: at(29, 4), // 1454
  undoTap: at(31, 1), // 1515
  flyBack: at(31, 2), // 1527
  undone: at(32, 1), // 1564 = 65.165 s, the filter opens
  // 11 security (each card lands on its bar's kick; inner animation on beat 3)
  card1: hit(at(33, 1)), // 1615
  card1Fx: at(33, 3), // 1637
  card2: hit(at(34, 1), 4), // 1666: the bar's strong kick, 4 frames after the grid downbeat
  card2Fx: at(34, 3), // 1686
  card3: hit(at(35, 1)), // 1711
  card3Fx: hit(at(35, 3)), // 1737
  // 12 close
  mapBack: at(36, 1), // 1759
  lift: at(37, 1), // 1808
  closeRing1: at(37, 2), // 1821
  closeRing2: at(37, 3), // 1833
  closeRing3: at(37, 4), // 1845
  tagline: at(38, 1), // 1857 "Protect what matters."
  // 13 end
  endLine: at(40, 1), // 1955
  loopFrom: at(41, 1), // 2004
};

/** The QA list for scripts/film-sync.mjs: every frame here is the frame the scene code uses. */
export const HITS: Hit[] = [
  { id: "baPop", f: HIT.baPop, note: "Buenos Aires dot pops" },
  { id: "arcLand", f: HIT.arcLand, note: "arc lands on Buenos Aires" },
  { id: "dotPulse3", f: at(3, 3), note: "money dot pulse (bar 3 beat 3)" },
  { id: "jan", f: HIT.monthsFrom, note: "first month tick (Jan)", beatOnly: true },
  { id: "ring1", f: HIT.ring1, note: "the drop: ring 1" },
  { id: "ring2", f: HIT.ring2, note: "ring 2" },
  { id: "ring3", f: HIT.ring3, note: "ring 3", beatOnly: true },
  { id: "word", f: HIT.word, note: "wordmark", beatOnly: true },
  { id: "keyword", f: HIT.keyword, note: "Held in US dollars" },
  { id: "always", f: SC.always.from, note: "24/7 lands, label rolls to Send" },
  { id: "send", f: SC.send.from, note: "Send split lands" },
  { id: "bank1", f: HIT.bank1, note: "bank 1 takes a slice" },
  { id: "bank3", f: HIT.bank3, note: "bank 3 takes a slice" },
  { id: "oldArrives", f: HIT.oldArrives, note: "$231 arrives, 3-5 days" },
  { id: "nestLaunch", f: HIT.nestLaunch, note: "Nest dot launches" },
  { id: "zeroFee", f: HIT.zeroFee, note: "$0 fee chip" },
  { id: "arrived", f: HIT.arrived, note: "Arrived + No fee." },
  { id: "morph", f: HIT.morph, note: "link morphs to For Mamá" },
  { id: "tapClaim", f: HIT.tapClaim, note: "claim tap" },
  { id: "claimed", f: HIT.claimed, note: "$250.00 is yours" },
  { id: "offline", f: SC.offline.from, note: "offline scene lands" },
  { id: "smsOut", f: HIT.smsOut, note: "SMS leaves the phone" },
  { id: "queued", f: HIT.queued, note: "Queued chip" },
  { id: "scamCut", f: HIT.scamCut, note: "hard cut to night" },
  { id: "buzz", f: HIT.buzz, note: "message arrives + buzz" },
  { id: "amber", f: HIT.amber, note: "amber wash lands" },
  { id: "reason1", f: HIT.reason1, note: "reason 1" },
  { id: "undo", f: SC.undo.from, note: "undo scene lands" },
  { id: "sendAnyway", f: HIT.sendAnyway, note: "dot leaves for the new number" },
  { id: "undoTap", f: HIT.undoTap, note: "undo tap" },
  { id: "undone", f: HIT.undone, note: "undo check + filter opens" },
  { id: "card1", f: HIT.card1, note: "card 1 lands" },
  { id: "card2", f: HIT.card2, note: "card 2 lands" },
  { id: "card3", f: HIT.card3, note: "card 3 lands" },
  { id: "card3Fx", f: HIT.card3Fx, note: "card 3 arrives on Mamá's phone" },
  { id: "tagline", f: HIT.tagline, note: "Protect what matters." },
];

/* ------------------------------------------------------------------ narration */

/** Narration: one file per line, placed on a beat (seconds = beatSec(k)). Missing files are skipped. */
export const VO: { id: string; file: string; k: number; line: string }[] = [
  { id: "b01", file: "public/film/vo/b01.mp3", k: 1, line: "My mom lives in Buenos Aires. I live in Miami." },
  { id: "b02", file: "public/film/vo/b02.mp3", k: 17, line: "Back home, prices keep going up, and month after month, the same money buys less." },
  { id: "b03", file: "public/film/vo/b03.mp3", k: 32, line: "Nest uses U.S. dollars, so our money holds its value." },
  { id: "b05", file: "public/film/vo/b05.mp3", k: 45, line: "It works any time, day or night." },
  { id: "b06", file: "public/film/vo/b06.mp3", k: 53, line: "My bank took days. Now she has it in about a second, and neither of us pays a fee." },
  { id: "b07", file: "public/film/vo/b07.mp3", k: 69, line: "She doesn't even need the app. She just taps the link." },
  { id: "b08", file: "public/film/vo/b08.mp3", k: 81, line: "Without Wi-Fi, it sends by text. With no signal at all, it waits and sends when I'm back online." },
  { id: "b09", file: "public/film/vo/b09.mp3", k: 97, line: "Then one night, I got this." },
  { id: "b10", file: "public/film/vo/b10.mp3", k: 105, line: "Before I paid, Nest showed me why it looked wrong." },
  { id: "b11", file: "public/film/vo/b11.mp3", k: 117, line: "I sent it anyway. Paying someone new, I had twenty-four hours to take it back." },
  { id: "b12", file: "public/film/vo/b12.mp3", k: 129, line: "Only I can move my money, with my fingerprint or my pin." },
  { id: "b13", file: "public/film/vo/b13.mp3", k: 148, line: "That's why we use Nest. Protect what matters." },
];

/* ------------------------------------------------------------------ music and sound */

/*
 * Mix targets (Caleb, Nov 7): every VO line normalised to VO_TARGET_LUFS; the music bed rides at
 * about `bedLU` below the voice between lines and `duckLU` below it under a line (measured as
 * short-term LUFS of the stems; scripts/film-cues.mjs builds a per-bar gain curve from the song's
 * own loudness to hit those levels), plus a ~3 dB dip at 2-4 kHz under each line. Attack 80 ms,
 * release 400 ms, starting 100 ms before each line.
 */
export const MUSIC = {
  file: "public/film/music/santa-maria.wav",
  offsetSec: SONG_OFFSET_SEC,
  /** Music short-term loudness between lines, relative to the voice (LU). */
  bedLU: -5,
  /** Music under a line, relative to the voice (LU). */
  duckLU: -13.5,
  /** Never lift the song more than this (the quiet intro stays quiet-ish). */
  maxBoostDb: 4,
  duck: { attackMs: 80, releaseMs: 400, preRollMs: 100, eq: { hz: 3000, widthOct: 1, db: -3 } },
  /** Scam section: low-pass on the music; 1-beat sweeps that start on the bar 24 downbeat and finish full open on the bar 32 downbeat. */
  lowpass: { hz: 500, from: barSec(24), to: barSec(32), sweepSec: BEAT_SEC, makeupDb: 3 },
  /** Fade over the last 2 bars. */
  fadeOut: { from: barSec(40), to: barSec(42) },
};

/** Every narration file is normalised to this integrated loudness (static gain) before mixing. */
export const VO_TARGET_LUFS = -18;

type Sfx = { file: string; f: number; db: number; note: string; alignSec?: number };

/**
 * Sound effects, only where they reinforce a beat. `alignSec` = the moment inside the file that
 * should land on frame f (the whoosh peaks 0.36 s in, so it peaks on the transition's swap frame).
 */
export const SFX: Sfx[] = [
  { file: "public/film/sfx/tick.wav", f: HIT.ring1, db: -16, note: "ring 1 (the drop)" },
  { file: "public/film/sfx/tick.wav", f: HIT.ring2, db: -17, note: "ring 2" },
  { file: "public/film/sfx/tick.wav", f: HIT.ring3, db: -18, note: "ring 3" },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.always.from - 6, db: -9, note: "push-through into 24/7", alignSec: 0.36 },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.send.from - 6, db: -10, note: "push into the phone", alignSec: 0.36 },
  { file: "public/opening/sfx/whoosh.mp3", f: HIT.arrived - 6, db: -10, note: "push into Arrived", alignSec: 0.36 },
  { file: "public/film/sfx/buzz.wav", f: HIT.buzz, db: -15, note: "the message buzz" },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.undo.from - 6, db: -11, note: "push into the undo", alignSec: 0.36 },
  { file: "public/film/sfx/tick.wav", f: HIT.undone, db: -15, note: "ring closes into a check" },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.security.from - 6, db: -12, note: "push into the cards", alignSec: 0.36 },
  { file: "public/opening/sfx/birds.mp3", f: at(36, 3), db: -12, note: "meadow washes in" },
  { file: "public/film/sfx/tick.wav", f: HIT.closeRing1, db: -19, note: "close ring 1" },
  { file: "public/film/sfx/tick.wav", f: HIT.closeRing2, db: -19, note: "close ring 2" },
  { file: "public/film/sfx/tick.wav", f: HIT.closeRing3, db: -19, note: "close ring 3" },
];
