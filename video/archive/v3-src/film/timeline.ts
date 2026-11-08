/*
 * Nest film v3 (FILM_V3_FIXES.md on top of FILM_V2_SPEC.md): the single source of truth for the picture (src/film/Film.tsx) and the mix
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
const SM_KICKS: [number, number][] = [
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

/*
 * Track 2 (Caleb, Nov 7): SOFI TUKKER, "Best Friend", takes over on the undo release (bar 32 =
 * 65.165 s). Native tempo 102.006 BPM (measured: beat 0.58820 s over 19-57 s), rubberband-stretched
 * to the grid's 117.855 BPM (x1.15537), so its four-on-the-floor kick sits on every grid beat.
 * Offset 31.008 s = a phrase downbeat: the song's 0:49.83 downbeat (after its break bar) lands on
 * bar 40 (81.456 s, the logo), its 0:40.42 hit on bar 36, and the window (31.0-54.5 s of the song)
 * ends before its vocals return at ~0:57, so nothing is sung under b12 or b13. Its phrases are
 * 3 bars of kick + 1 break bar, so film bars 35 and 39 have no kick.
 */
export const MUSIC2_DEFAULT = { file: "public/film/music/best-friend.wav", offsetSec: 31.008, bpm: 102.006, fromBar: 32 };
/** The picture is cut for track 2 (the mix can still be rendered without it: MUSIC2=none). */
export const MUSIC2_ON = true;
const BREAK_BARS = [35, 39];
const T2_KICKS: [number, number][] = [];
for (let k = MUSIC2_DEFAULT.fromBar * 4; k < FILM_BARS * 4; k++) {
  if (BREAK_BARS.includes(Math.floor(k / 4))) continue;
  T2_KICKS.push([beat(k), k % 4 === 0 ? 0.2 : k % 2 === 0 ? 0.14 : 0.1]);
}
export const KICKS: [number, number][] = MUSIC2_ON
  ? [...SM_KICKS.filter(([f]) => f < bar(MUSIC2_DEFAULT.fromBar) - 2), ...T2_KICKS]
  : SM_KICKS;

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
 * `beatOnly` hits sit on a grid beat that has no kick under it. v3: re-timed to Martha's v3
 * narration (word times measured with faster-whisper).
 */
export type Hit = { id: string; f: number; note: string; beatOnly?: boolean };

export const HIT = {
  // 1 map (b01 from bar 1: "My mom lives in Buenos Aires. I live in Miami, and every month I send her what I can.")
  ghost: snap(at(0, 4.5)), // 42: the intro's first accent, the two ghost cities breathe
  baPop: at(1, 3), // 73: on "Buenos Aires"
  baLabel: at(1, 3.5), // 79
  miamiPop: at(2, 2), // 110: on "Miami"
  miamiLabel: at(2, 2.5), // 116
  arcFrom: at(2, 3), // 122
  arcLand: hit(at(2, 4.5)), // 139: strongest accent of the intro
  dotIn: at(3, 1), // 147: the money dot pops in Miami ("every month")
  dotGo: at(3, 2), // 159: "send her"
  dotLands: hit(at(3, 3)), // 171: lands in Buenos Aires ("what I can")
  // 2 inflation: month k on beat 3 + k (k = 0 Jan ... 11 Dec), collapse on the pickup
  monthsFrom: at(4, 4), // 232
  pickup: at(7, 4), // 379
  // 3 drop
  ring1: at(8, 1), // 391 = the drop: the full mark slams in
  ring2: at(8, 2), // 403
  ring3: at(8, 3), // 415
  word: at(8, 4), // 428
  keyword: at(9, 1), // 440: the lockup steps left, Mamá's phone lands
  chip: hit(at(9, 2)), // 452: "Held in digital US dollars (USDC)"
  fly: at(10, 1), // 489
  // 5 send (b06: "Banks took days and paid her in pesos. Now she gets dollars in about a second, no transfer fee.")
  bank1: at(13, 2), // 648
  bank2: at(13, 3), // 660
  bank3: at(13, 4), // 672
  oldArrives: at(14, 1), // 684: $231, "Paid out in local currency"
  nestLaunch: at(14, 4), // 721: "Now"
  nestLands: hit(at(15, 1)), // 733: "Arrives as US dollars"
  feesChip: at(15, 2), // 745
  zeroFee: at(15, 3), // 758
  arrived: at(16, 1), // 782: "No fee." on "no transfer fee"
  // 6 claim (b07: "She doesn't need the app. She taps the link and keeps it in dollars.")
  linkIn: at(17, 2), // 843
  morph: hit(at(17, 3)), // 855
  tapLink: hit(at(18, 2)), // 892: "taps"
  claimIn: at(18, 4), // 917: "keeps it in dollars"
  tapClaim: hit(at(19, 1)), // 931
  claimed: hit(at(19, 2)), // 940
  // 7 offline (b08: "Without Wi-Fi, it goes by text, and Mamá still gets it.")
  wifiOff: at(20, 2), // 990
  smsOut: at(21, 1), // 1026: "goes by text"
  smsTower: hit(at(21, 3)), // 1051
  mamaGets: hit(at(22, 1)), // 1075: "Mamá still gets it"
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
  sendAnyway: snap(at(29, 2)), // 1429 (on the kick)
  heldAt: at(29, 4), // 1454
  waitNote: at(30, 1), // 1466: "First payments to someone new wait 24 hours."
  undoTap: at(31, 1), // 1515
  flyBack: at(31, 2), // 1527
  undone: at(32, 1), // 1564 = 65.165 s: the check, the balance, track 2 starts
  // 11 security (track 2's kick is on every grid beat; bar 35 is its break bar)
  card1: at(33, 1), // 1613
  card1Fx: at(33, 3), // 1637
  card2: at(34, 1), // 1662
  card2Fx: at(34, 3), // 1686
  card3: at(35, 1), // 1711
  card3Fx: at(35, 3), // 1735
  // 12 close
  mapBack: at(36, 1), // 1759
  dotGo2: at(37, 1), // 1808: one last trip
  dotLands2: at(37, 3), // 1833
  arcsIn: at(38, 3), // 1881: two more arcs
  sweep: at(39, 1), // 1906: the three arcs sweep into the rings
  rings: at(40, 1), // 1955 = 81.456 s, the mark lands ("...use Nest")
  word2: at(40, 2), // 1967: wordmark (+ the disclaimer)
  tagline: at(40, 3), // 1979: "Protect what matters." on the spoken words
  position: at(41, 1), // 2004: "US dollars, in your own account."
  loopFrom: 2041, // the last 12 frames ease back to frame 0
};

/** The QA list for scripts/film-sync.mjs: every frame here is the frame the scene code uses. */
export const HITS: Hit[] = [
  { id: "ghost", f: HIT.ghost, note: "ghost cities breathe (first accent)" },
  { id: "arcLand", f: HIT.arcLand, note: "arc lands on Buenos Aires" },
  { id: "dotLands", f: HIT.dotLands, note: "money dot lands in Buenos Aires" },
  { id: "jan", f: HIT.monthsFrom, note: "first month tick (Jan)", beatOnly: true },
  { id: "ring1", f: HIT.ring1, note: "the drop: the mark slams in" },
  { id: "ring2", f: HIT.ring2, note: "ring 2 accent" },
  { id: "word", f: HIT.word, note: "wordmark", beatOnly: true },
  { id: "keyword", f: HIT.keyword, note: "Mamá's phone lands" },
  { id: "chip", f: HIT.chip, note: "USDC chip" },
  { id: "always", f: SC.always.from, note: "24/7 lands, label rolls to Send" },
  { id: "send", f: SC.send.from, note: "Send split lands" },
  { id: "bank1", f: HIT.bank1, note: "bank 1 takes a slice" },
  { id: "bank3", f: HIT.bank3, note: "bank 3 takes a slice" },
  { id: "oldArrives", f: HIT.oldArrives, note: "$231 arrives, 3-5 days" },
  { id: "nestLands", f: HIT.nestLands, note: "Nest coin lands whole" },
  { id: "arrived", f: HIT.arrived, note: "Arrived + No fee." },
  { id: "morph", f: HIT.morph, note: "link morphs to For Mamá" },
  { id: "tapLink", f: HIT.tapLink, note: "she taps the link" },
  { id: "claimed", f: HIT.claimed, note: "$250.00 is yours" },
  { id: "offline", f: SC.offline.from, note: "offline scene lands" },
  { id: "smsTower", f: HIT.smsTower, note: "text reaches the tower" },
  { id: "mamaGets", f: HIT.mamaGets, note: "Mamá gets it" },
  { id: "scamCut", f: HIT.scamCut, note: "hard cut to night" },
  { id: "buzz", f: HIT.buzz, note: "message arrives + buzz" },
  { id: "amber", f: HIT.amber, note: "amber wash lands" },
  { id: "reason1", f: HIT.reason1, note: "reason 1" },
  { id: "undo", f: SC.undo.from, note: "undo scene lands" },
  { id: "sendAnyway", f: HIT.sendAnyway, note: "dot leaves for the new number" },
  { id: "undoTap", f: HIT.undoTap, note: "undo tap" },
  { id: "undone", f: HIT.undone, note: "undo check + track 2 downbeat" },
  { id: "card1", f: HIT.card1, note: "card 1 lands" },
  { id: "card2", f: HIT.card2, note: "card 2 lands" },
  { id: "card3", f: HIT.card3, note: "card 3 lands (track 2 break bar)", beatOnly: MUSIC2_ON },
  { id: "mapBack", f: HIT.mapBack, note: "map pull-back lands" },
  { id: "rings", f: HIT.rings, note: "the arcs land as the Nest mark" },
];

/* ------------------------------------------------------------------ narration */

/** Narration (Martha's v3): one file per line, placed on a beat (seconds = beatSec(k)). Missing files are skipped. */
export const VO: { id: string; file: string; k: number; line: string }[] = [
  { id: "b01", file: "public/film/vo/b01.mp3", k: 4, line: "My mom lives in Buenos Aires. I live in Miami, and every month I send her what I can." },
  { id: "b02", file: "public/film/vo/b02.mp3", k: 16, line: "In Argentina, prices tripled in a year. Money in local currency lost about two-thirds of its value." },
  { id: "b03", file: "public/film/vo/b03.mp3", k: 32, line: "Nest keeps our money in U.S. dollars, so it doesn't shrink with the local currency." },
  { id: "b05", file: "public/film/vo/b05.mp3", k: 45, line: "It works any time, day or night." },
  { id: "b06", file: "public/film/vo/b06.mp3", k: 53, line: "Banks took days and paid her in pesos. Now she gets dollars in about a second, no transfer fee." },
  { id: "b07", file: "public/film/vo/b07.mp3", k: 69, line: "She doesn't need the app. She taps the link and keeps it in dollars." },
  { id: "b08", file: "public/film/vo/b08.mp3", k: 81, line: "Without Wi-Fi, it goes by text, and Mamá still gets it." },
  { id: "b09", file: "public/film/vo/b09.mp3", k: 97, line: "Then one night, I got this." },
  { id: "b10", file: "public/film/vo/b10.mp3", k: 105, line: "Before I paid, Nest showed me why it might be a scam." },
  { id: "b11", file: "public/film/vo/b11.mp3", k: 117, line: "I sent it anyway, and I still had twenty-four hours to undo it." },
  { id: "b12", file: "public/film/vo/b12.mp3", k: 129, line: "Nothing leaves my account without my fingerprint or PIN. I can lock Nest, and Mamá is my trusted contact." },
  { id: "b13", file: "public/film/vo/b13.mp3", k: 153, line: "No bank holds or lends our money. That's why we use Nest. Protect what matters." },
];

/* ------------------------------------------------------------------ music and sound */

/*
 * Mix targets (Caleb, Nov 7): every VO line normalised to VO_TARGET_LUFS; the music bed rides at
 * about `bedLU` below the voice between lines and `duckLU` below it under a line (measured as
 * short-term LUFS of the stems; scripts/film-cues.mjs builds a per-bar gain curve from the song's
 * own loudness to hit those levels), plus a ~3 dB dip at 2-4 kHz under each line. Attack 80 ms,
 * release 400 ms, starting 100 ms before each line.
 *
 * v3: Santa María is pitched up (MUSIC_PITCH semitones, default +1, rubberband, duration unchanged)
 * and its low end softened (MUSIC_SOFTEN = B | C | off) before anything else; bars 8-9 are lifted
 * 5 dB on top of the bed (the drop lands even under b03); track 2 (MUSIC2, default "Best Friend")
 * takes over hard on the bar 32 downbeat. MUSIC2=none renders Santa María to the end.
 */
export const MUSIC = {
  file: "public/film/music/santa-maria.wav",
  offsetSec: SONG_OFFSET_SEC,
  pitchSemis: 1,
  soften: {
    B: { threshold: 0.08, ratio: 4, attack: 5, release: 120, lowDb: -3, shelfDb: 1.5 },
    C: { threshold: 0.06, ratio: 6, attack: 3, release: 100, lowDb: -5, shelfDb: 2 },
  },
  /** Music short-term loudness between lines, relative to the voice (LU). */
  bedLU: -5,
  /** Music under a line, relative to the voice (LU). */
  duckLU: -13.5,
  /** Never lift the song more than this (the quiet intro stays quiet-ish). */
  maxBoostDb: 4,
  /** H3: the drop. Extra gain on top of the bed over bars 8-9 (ramped in over the pickup beat, out over a beat). */
  lift: { from: barSec(8), to: barSec(10), db: 5, rampSec: BEAT_SEC },
  duck: { attackMs: 80, releaseMs: 400, preRollMs: 100, eq: { hz: 3000, widthOct: 1, db: -3 } },
  /** Scam section: low-pass on the music; 1-beat sweep in from the bar 24 downbeat; opens on the bar 32 downbeat (hard switch to track 2 when it plays). */
  lowpass: { hz: 500, from: barSec(24), to: barSec(32), sweepSec: BEAT_SEC, makeupDb: 3 },
  /** Track 2 switch: crossfade length (s) centred on the bar 32 downbeat. */
  switchSec: 0.03,
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
  { file: "public/film/sfx/tick.wav", f: HIT.ring1, db: -14, note: "the drop: the mark slams in" },
  { file: "public/film/sfx/tick.wav", f: HIT.ring2, db: -18, note: "ring 2 accent" },
  { file: "public/film/sfx/tick.wav", f: HIT.ring3, db: -19, note: "ring 3 accent" },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.always.from - 6, db: -9, note: "push-through into 24/7", alignSec: 0.36 },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.send.from - 6, db: -10, note: "push into the phone", alignSec: 0.36 },
  { file: "public/opening/sfx/whoosh.mp3", f: HIT.arrived - 6, db: -10, note: "push into Arrived", alignSec: 0.36 },
  { file: "public/film/sfx/buzz.wav", f: HIT.buzz, db: -15, note: "the message buzz" },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.undo.from - 6, db: -11, note: "push into the undo", alignSec: 0.36 },
  { file: "public/film/sfx/tick.wav", f: HIT.undone, db: -15, note: "ring closes into a check" },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.security.from - 6, db: -12, note: "push into the cards", alignSec: 0.36 },
  { file: "public/film/sfx/tick.wav", f: HIT.rings, db: -16, note: "the arcs land as the mark" },
];
