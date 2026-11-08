/*
 * Nest film v4 (FILM_V4.md on top of FILM_V3_FIXES.md / FILM_V2_SPEC.md): the single source of truth
 * for the picture (src/film/Film.tsx) and the mix (scripts/render-film.sh reads this file through
 * scripts/film-cues.mjs; scripts/film-sync.mjs checks the hits against the kicks). Plain data and
 * pure functions only, no imports, so Node can load it directly with type stripping.
 *
 * The clock is SOFI TUKKER, "Best Friend", on its own grid (no time-stretch): 102.024 BPM, measured
 * with librosa over the song's instrumental drop (kick onsets fitted to a fixed-period grid, mean
 * deviation 10 ms): beat 0.588097 s, bar 2.352388 s. Song bar m starts at 0.428705 + m * 2.352388 s.
 * Never accumulate rounded frames: every frame below comes from bar(n), beat(k) or at(n, b).
 */

export const FILM_FPS = 24;
export const FILM_W = 1920;
export const FILM_H = 1080;

/** Beat and bar in seconds and in frames (Best Friend, 102.024 BPM, 24 fps). */
export const BEAT_SEC = 0.5880969;
export const BAR_SEC = BEAT_SEC * 4;
export const BEAT_F = BEAT_SEC * FILM_FPS; // 14.1143
export const BAR_F = BAR_SEC * FILM_FPS; // 56.4573

/** Frame of bar n (0-based). */
export const bar = (n: number) => Math.round(n * BAR_F);
/** Frame of beat k (0-based, counted from film start; k may be fractional: k + 0.5 is the "and"). */
export const beat = (k: number) => Math.round(k * BEAT_F);
/** Frame of bar n, beat b (1-based like the spec: at(13, 2) = bar 13 beat 2; 1.5 = the "and" of 1). */
export const at = (n: number, b = 1) => beat(n * 4 + b - 1);
/** Seconds of beat k (exact, not frame-rounded) for audio placement. */
export const beatSec = (k: number) => k * BEAT_SEC;
export const barSec = (n: number) => n * BAR_SEC;

/** 37 bars (2089 frames = 87.04 s) plus one beat for the final hit to land on the hero. */
export const FILM_BARS = 37;
export const TAIL_F = beat(1);
/** 2103 frames = 87.63 s (FILM_V4.md: 90 s maximum). */
export const FILM_FRAMES = bar(FILM_BARS) + TAIL_F;

/* ------------------------------------------------------------------ the bar map */

export type SceneId =
  | "map" | "inflation" | "drop" | "always" | "send" | "claim" | "offline"
  | "scam" | "check" | "undo" | "security" | "close";

/**
 * [scene, first bar, swap]. A scene runs from its first bar's downbeat to the next scene's.
 * `swap` = frames before the downbeat at which the incoming scene takes over the picture: the
 * transition finishes on the downbeat (0 = hard cut or continuous).
 * v4: re-cut to Best Friend's bars (2.35 s, vs Santa María's 2.04 s), so most scenes have fewer
 * bars of more time; offline gets 4 bars (more emphasis), the scam line (old b10 + b11) spans the
 * check and the undo, and the close runs straight into the website hero.
 */
const BAR_MAP: [SceneId, number, number][] = [
  ["map", 0, 0],
  ["inflation", 3, 6],
  ["drop", 7, 0],
  ["always", 10, 6],
  ["send", 12, 6],
  ["claim", 16, 6],
  ["offline", 20, 6],
  ["scam", 24, 0],
  ["check", 26, 12],
  ["undo", 28, 6],
  ["security", 31, 6],
  ["close", 34, 6],
];

export type Scene = { id: SceneId; bars: [number, number]; from: number; to: number; dur: number; swap: number };

export const SCENES: Scene[] = BAR_MAP.map(([id, b0, swap], i) => {
  const b1 = i + 1 < BAR_MAP.length ? BAR_MAP[i + 1][1] : FILM_BARS;
  const to = i + 1 < BAR_MAP.length ? bar(b1) : FILM_FRAMES;
  return { id, bars: [b0, b1], from: bar(b0), to, dur: to - bar(b0), swap };
});

export const SC = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, Scene>;

/** Chapter label (top-left). Frames are absolute. */
export const CHAPTERS = [
  { word: "Send", from: SC.always.from, to: SC.scam.from },
  { word: "Protect", from: SC.scam.from, to: SC.close.from },
];

/* ------------------------------------------------------------------ the music edit */

/** Best Friend's measured grid (song seconds). */
export const SONG = { file: "public/film/music/best-friend.wav", firstDownbeat: 0.428705, bpm: 102.024 };
/** Song second of song bar m's downbeat. */
export const songBarSec = (m: number) => SONG.firstDownbeat + m * BAR_SEC;

/**
 * Film bar n plays song bar EDIT[n] (cuts on downbeats only, no stretch). Vocal check: Whisper on the
 * whole song puts lyrics at 0-18.2 s (song bars 0-7), 55.8-80 s (bars 23-33) and from 88.4 s (bar 37)
 * on; probing bar ranges on their own, bars 17-22 also carry the spoken "you wanna meet me at the..."
 * chant and bars 34-36 something voice-like, while bars 8-16 transcribe as nothing (or as Whisper's
 * stock hallucination). So the whole bed is the instrumental first half of the drop, song bars 8-16:
 * [8 = the drop hit, 9, 10, 11 = break, 12 = kick re-enters on beat 2, 13, 14, 15, 16 = break].
 *  - film 0-6 = song 10-16 under a low-pass that opens bar by bar (the gentle intro); the song's
 *    drop hit (song 8) lands on the film's drop (bar 7, the Nest mark);
 *  - film 7-15 = song 8-16 straight through (drop, 24/7 on the break bar, send; Arrived on the break);
 *  - claim = song 12-15 (the link drops on the kick re-entry, bar 16 beat 2);
 *  - offline lands on the drop hit again (FILM_V4.md: more emphasis), ending on the break;
 *  - the scam section (film 24-29) is low-passed; film 24 = song 12, whose kick re-enters on beat 2
 *    with the message buzz; film 29 = the break bar under the undo tap;
 *  - the undo release (film 30) is the drop hit with the filter opening; security runs 9-11;
 *  - the close runs song 12-14 and the film ends on one more drop hit, ringing out over a beat.
 */
export const EDIT: number[] = [
  10, 11, 12, 13, 14, 15, 16, //     0-6   map, inflation (filtered build)
  8, 9, 10, 11, 12, 13, 14, 15, 16, // 7-15 drop, 24/7, send
  12, 13, 14, 15, //                 16-19 claim
  8, 9, 10, 11, //                   20-23 offline
  12, 13, 14, 15, 10, 11, //         24-29 scam, check, undo (muffled)
  8, 9, 10, 11, //                   30-33 the undo release, security
  12, 13, 14, //                     34-36 close
  8, //                              37    the final hit (one beat, rings out)
];

/** Kick pattern of a song bar: strength per beat (0 = no kick). */
const songKicks = (m: number): number[] => {
  if (m === 8) return [0.45, 0.12, 0.12, 0.12];
  if (m === 11) return [0, 0, 0, 0.16];
  if (m === 16) return [0, 0, 0, 0];
  if (m === 20) return [0, 0.16, 0, 0.2];
  if (m === 12) return [0, 0.3, 0.12, 0.12];
  return [0.2, 0.12, 0.14, 0.12];
};

/** Kicks in film frames: [frame, strength], from the edit. */
export const KICKS: [number, number][] = [];
for (let n = 0; n < EDIT.length; n++) {
  const ks = songKicks(EDIT[n]);
  for (let b = 0; b < 4; b++) {
    const f = beat(n * 4 + b);
    if (ks[b] > 0 && f < FILM_FRAMES) KICKS.push([f, ks[b]]);
  }
}

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
 * Primary hits: the moments a scene is built around. `f` is the frame the impact shows on screen.
 * Re-timed to the v4 narration (word times measured with faster-whisper; see VO below).
 */
export type Hit = { id: string; f: number; note: string; beatOnly?: boolean };

export const HIT = {
  // 1 globe (b01 from bar 0 beat 2: "My mom lives in Buenos Aires. I live in Miami, and every month I send her what I can.")
  ghost: at(0, 2), // 14: the globe settles
  baPop: at(0, 4), // 42: on "Buenos Aires"
  baLabel: at(0, 4.5), // 49
  miamiPop: at(1, 2), // 71: on "Miami"
  miamiLabel: at(1, 2.5), // 78
  arcFrom: at(1, 3), // 85
  arcLand: at(1, 4), // 99
  dotIn: at(1, 4.5), // 106: the money dot pops in Miami ("every month")
  dotGo: at(2, 1), // 113: "send her"
  dotLands: at(2, 3), // 141: lands in Buenos Aires ("what I can")
  // 2 inflation: month k on the scene's beat 3 + k (k = 0 Jan ... 11 Dec), collapse on the pickup
  monthsFrom: at(3, 4), // 212
  pickup: at(6, 4), // 381
  // 3 drop (b03 on the drop)
  ring1: at(7, 1), // 395 = the drop: the full mark slams in on the song's drop hit
  ring2: at(7, 2), // 409
  ring3: at(7, 3), // 423
  word: at(7, 4), // 437
  keyword: at(8, 1), // 452: the lockup steps left, Mamá's phone lands
  chip: at(8, 2), // 466: "Held in digital US dollars (USDC)"
  fly: at(9, 1), // 508
  // 5 send (b06 from bar 12 beat 2: "Banks took days and paid her in pesos. Now she gets dollars in about a second, no transfer fee.")
  bank1: at(12, 2), // 691
  bank2: at(12, 3), // 706
  bank3: at(12, 4), // 720
  oldArrives: at(13, 1), // 734: $231 ("paid her in pesos")
  nestLaunch: at(13, 3), // 762: "Now"
  nestLands: at(14, 1), // 790: "dollars in about a second"
  feesChip: at(14, 2), // 805
  zeroFee: at(14, 3), // 819: "no transfer fee"
  arrived: at(15, 1), // 847: Arrived + "No fee."
  // 6 claim (b07 from bar 16 beat 2: "She doesn't need to download anything. She opens the link and keeps it in dollars.")
  linkIn: at(16, 2), // 917
  morph: at(16, 3), // 931
  noDownload: at(16, 4), // 945: "download anything"
  tapLink: at(17, 2), // 974: "opens the link"
  browser: at(17, 3), // 988: the browser lands on nest.app
  typeFrom: at(17, 4), // 1002: her number types in
  tapSignIn: at(18, 2), // 1030
  claimIn: at(18, 3), // 1044: "keeps it in dollars"
  tapClaim: at(19, 1), // 1073
  claimed: at(19, 2), // 1087
  // 7 offline (b08 from bar 20 beat 2: "Even without internet, I can send and receive money, so it's never stuck.")
  wifiOff: at(20, 3), // 1157: "without internet": the big Wi-Fi glyph is struck out
  phonesIn: at(21, 1), // 1185: the two phones and the tower land
  smsOut: at(21, 2), // 1199: "send"
  smsTower: at(21, 3), // 1214
  mamaGets: at(21, 4), // 1228: "receive money"
  stuck: at(22, 1), // 1242: "never stuck"
  replyOut: at(22, 3), // 1270: the receipt goes back to Ana
  replyIn: at(23, 1), // 1298
  // 8 scam
  scamCut: at(24, 1), // 1355
  buzz: at(24, 2), // 1369 = 57.05 s, on song bar 12's kick re-entry
  // 9 check (b10 from bar 26 beat 2: "Nest detected it might be a scam and warned me. I still sent it, and I had twenty-four hours to undo it.")
  amber: at(26, 1), // 1468
  reason1: at(26, 2), // 1482
  reason2: at(26, 3), // 1496
  reason3: at(26, 4), // 1510
  holdFrom: at(27, 2), // 1538: she holds "send anyway" ("I still sent it")
  // 10 undo
  sendAnyway: at(28, 1), // 1581: the dot leaves for the new number
  heldAt: at(28, 2), // 1595: held; the 24-hour ring draws ("twenty-four hours")
  waitNote: at(28, 3), // 1609
  btnIn: at(28, 4), // 1623
  undoTap: at(29, 1), // 1637: "undo it"
  flyBack: at(29, 2), // 1651
  undone: at(30, 1), // 1694 = 70.58 s: the check, the balance, the filter opens on the drop hit
  // 11 security (b12 from bar 30 beat 2)
  card1: at(31, 1), // 1750: "fingerprint or PIN"
  card1Fx: at(31, 3), // 1778
  card2: at(32, 1), // 1806: "lock Nest"
  card2Fx: at(32, 3), // 1835
  card3: at(32, 4), // 1849: "trusted contact" 
  card3Fx: at(33, 2), // 1877
  // 12 close (b13 from bar 34 beat 1.5)
  mapBack: at(34, 1), // 1920
  dotGo2: at(34, 2), // 1934
  dotLands2: at(34, 4), // 1962
  arcsIn: at(35, 1), // 1976: "That's why..."
  rings: at(35, 3), // 2004: the arcs land as the Nest mark ("...use Nest")
  word2: at(35, 4), // 2019: wordmark
  hero: at(36, 1), // 2033: the website hero lands ("Protect what matters.")
  end: bar(37), // 2089: the final hit
};

/** The QA list for scripts/film-sync.mjs: every frame here is the frame the scene code uses. */
export const HITS: Hit[] = [
  { id: "baPop", f: HIT.baPop, note: "Buenos Aires pin" },
  { id: "miamiPop", f: HIT.miamiPop, note: "Miami pin (intro break bar)", beatOnly: true },
  { id: "dotLands", f: HIT.dotLands, note: "money dot lands in Buenos Aires" },
  { id: "jan", f: HIT.monthsFrom, note: "first month tick (Jan)" },
  { id: "ring1", f: HIT.ring1, note: "the drop: the mark slams in" },
  { id: "keyword", f: HIT.keyword, note: "Mamá's phone lands" },
  { id: "always", f: SC.always.from, note: "24/7 lands on the break bar, label rolls to Send", beatOnly: true },
  { id: "send", f: SC.send.from, note: "Send split lands" },
  { id: "oldArrives", f: HIT.oldArrives, note: "$231 arrives, 3-5 days" },
  { id: "nestLands", f: HIT.nestLands, note: "Nest coin lands whole" },
  { id: "arrived", f: HIT.arrived, note: "Arrived + No fee. (break bar)", beatOnly: true },
  { id: "linkIn", f: HIT.linkIn, note: "the link drops on the kick re-entry" },
  { id: "tapLink", f: HIT.tapLink, note: "she opens the link" },
  { id: "claimed", f: HIT.claimed, note: "$250.00 is yours" },
  { id: "offline", f: SC.offline.from, note: "offline lands on the song's drop" },
  { id: "wifiOff", f: HIT.wifiOff, note: "Wi-Fi struck out" },
  { id: "phonesIn", f: HIT.phonesIn, note: "phones + tower land" },
  { id: "mamaGets", f: HIT.mamaGets, note: "Mamá gets it" },
  { id: "stuck", f: HIT.stuck, note: "Never stuck." },
  { id: "scamCut", f: HIT.scamCut, note: "hard cut to night (break, kick re-enters on 2)", beatOnly: true },
  { id: "buzz", f: HIT.buzz, note: "message arrives + buzz" },
  { id: "amber", f: HIT.amber, note: "amber wash lands" },
  { id: "reason1", f: HIT.reason1, note: "reason 1" },
  { id: "undo", f: SC.undo.from, note: "undo scene lands, dot leaves" },
  { id: "undoTap", f: HIT.undoTap, note: "undo tap (break bar)", beatOnly: true },
  { id: "undone", f: HIT.undone, note: "undo check + filter opens on the drop hit" },
  { id: "card1", f: HIT.card1, note: "card 1 lands" },
  { id: "card2", f: HIT.card2, note: "card 2 lands" },
  { id: "card3", f: HIT.card3, note: "card 3 lands" },
  { id: "rings", f: HIT.rings, note: "the arcs land as the Nest mark" },
  { id: "hero", f: HIT.hero, note: "the website hero lands (soft downbeat)", beatOnly: true },
];

/* ------------------------------------------------------------------ narration */

/**
 * Narration: one file per line, placed on a beat (seconds = beatSec(k)). v4: b07, b08 and b10 are
 * new (voice "Gia", Eleven v4, stability 0.55, normalised to -18 LUFS); b11 is merged into b10.
 */
export const VO: { id: string; file: string; k: number; line: string }[] = [
  { id: "b01", file: "public/film/vo/b01.mp3", k: 1, line: "My mom lives in Buenos Aires. I live in Miami, and every month I send her what I can." },
  { id: "b02", file: "public/film/vo/b02.mp3", k: 12, line: "In Argentina, prices tripled in a year. Money in local currency lost about two-thirds of its value." },
  { id: "b03", file: "public/film/vo/b03.mp3", k: 28, line: "Nest keeps our money in U.S. dollars, so it doesn't shrink with the local currency." },
  { id: "b05", file: "public/film/vo/b05.mp3", k: 41, line: "It works any time, day or night." },
  { id: "b06", file: "public/film/vo/b06.mp3", k: 49, line: "Banks took days and paid her in pesos. Now she gets dollars in about a second, no transfer fee." },
  { id: "b07", file: "public/film/vo/b07.mp3", k: 65, line: "She doesn't need to download anything. She opens the link and keeps it in dollars." },
  { id: "b08", file: "public/film/vo/b08.mp3", k: 81, line: "Even without internet, I can send and receive money, so it's never stuck." },
  { id: "b09", file: "public/film/vo/b09.mp3", k: 97, line: "Then one night, I got this." },
  { id: "b10", file: "public/film/vo/b10.mp3", k: 105, line: "Nest detected it might be a scam and warned me. I still sent it, and I had twenty-four hours to undo it." },
  { id: "b12", file: "public/film/vo/b12.mp3", k: 121, line: "Nothing leaves my account without my fingerprint or PIN. I can lock Nest, and Mamá is my trusted contact." },
  { id: "b13", file: "public/film/vo/b13.mp3", k: 136.5, line: "No bank holds or lends our money. That's why we use Nest. Protect what matters." },
];

/* ------------------------------------------------------------------ music and sound */

/*
 * Mix targets: every VO line normalised to VO_TARGET_LUFS; the music bed rides `bedLU` below the
 * voice between lines and `duckLU` below it under a line (short-term LUFS of the stems; film-cues
 * builds a per-bar gain curve from the edit's own loudness), plus a ~3 dB dip at 2-4 kHz under
 * each line. FILM_V4.md: the opening was too loud, so the first bars ride lower (`introLU`).
 */
export const MUSIC = {
  /** Low-pass sweep over the intro: cutoff (Hz) at each film bar's downbeat, opening fully on the drop. */
  introSweep: { from: 0, to: barSec(7), hz: [650, 700, 800, 1000, 1400, 2200, 4000, 20000] },
  /** Optional low-end soften (MUSIC_SOFTEN = B | C | off; default off for Best Friend). */
  soften: {
    B: { threshold: 0.08, ratio: 4, attack: 5, release: 120, lowDb: -3, shelfDb: 1.5 },
    C: { threshold: 0.06, ratio: 6, attack: 3, release: 100, lowDb: -5, shelfDb: 2 },
  },
  /** Music short-term loudness between lines, relative to the voice (LU). */
  bedLU: -6,
  /** The first bars (gentle): the bed target for bars 0-2, relative to the voice. */
  introLU: -12,
  introBars: 3,
  /** Music under a line, relative to the voice (LU). */
  duckLU: -13.5,
  maxBoostDb: 6,
  /** The drop: extra gain over bar 7 (ramped in over the pickup beat, out over a beat). */
  lift: { from: barSec(7), to: barSec(8), db: 2.5, rampSec: BEAT_SEC },
  duck: { attackMs: 80, releaseMs: 400, preRollMs: 100, eq: { hz: 3000, widthOct: 1, db: -3 } },
  /** Scam section: low-pass on the music from the bar 24 downbeat (1-beat sweep in); opens on the bar 30 downbeat. */
  lowpass: { hz: 500, from: barSec(24), to: barSec(30), sweepSec: BEAT_SEC, outSec: 0.03, makeupDb: 3 },
  /** Edit crossfade at every cut (s). */
  xfadeSec: 0.006,
  /** The final hit: fade over this long after the last downbeat. */
  tailFadeSec: TAIL_F / FILM_FPS,
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
  { file: "public/film/sfx/tick.wav", f: HIT.baPop, db: -22, note: "Buenos Aires pin" },
  { file: "public/film/sfx/tick.wav", f: HIT.miamiPop, db: -22, note: "Miami pin" },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.always.from - 6, db: -10, note: "push-through into 24/7", alignSec: 0.36 },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.send.from - 6, db: -11, note: "push into the split", alignSec: 0.36 },
  { file: "public/opening/sfx/whoosh.mp3", f: HIT.arrived - 6, db: -11, note: "push into Arrived", alignSec: 0.36 },
  { file: "public/film/sfx/tick.wav", f: HIT.tapLink, db: -22, note: "she opens the link" },
  { file: "public/film/sfx/tick.wav", f: HIT.wifiOff, db: -18, note: "Wi-Fi struck out" },
  { file: "public/film/sfx/buzz.wav", f: HIT.buzz, db: -15, note: "the message buzz" },
  { file: "public/opening/sfx/whoosh.mp3", f: SC.undo.from - 6, db: -12, note: "push into the undo", alignSec: 0.36 },
  { file: "public/film/sfx/tick.wav", f: HIT.undone, db: -15, note: "ring closes into a check" },
  { file: "public/film/sfx/tick.wav", f: HIT.rings, db: -16, note: "the arcs land as the mark" },
  { file: "public/opening/sfx/whoosh.mp3", f: HIT.hero - 4, db: -14, note: "into the hero", alignSec: 0.36 },
];
