/*
 * The Nest film timeline (1920x1080, 24 fps). Single source of truth for the picture
 * (src/film/Film.tsx) and the sound mix (scripts/render-film.sh reads this file through
 * scripts/film-cues.mjs), so keep it plain data: no imports, no TS-only syntax beyond types.
 *
 * Beat lengths sit on the 116 BPM grid of music track D (one beat = 12.41 frames) and were
 * checked against Gia's narration (public/film/vo/bNN.mp3, placed at beat start + VO_OFFSET_S).
 * To retime, change DUR: every later beat moves with it, and so do the VO and SFX cues.
 * Inside a beat, animations are timed in local frames; exits are keyed off the beat's `dur`.
 */

export const FILM_FPS = 24;
export const FILM_W = 1920;
export const FILM_H = 1080;
export const BPM = 116;
export const FRAMES_PER_BEAT = (FILM_FPS * 60) / BPM;

/** Beat lengths in frames. Comment = music beats on the grid, narration length. */
const DUR = {
  b01: 124, // 10 beats  Hook: the map. VO 3.32 s
  b02: 149, // 12 beats  Hook: $1,000 in pesos shrinks to $321. VO 5.56 s
  b03: 99, //   8 beats  Brand: note folds into the dot, rings draw: Nest. VO 1.88 s
  // b04 (savings + goal rings) was cut on Nov 7: savings goals are no longer in the product.
  b05: 87, //   7 beats  Send chapter opens: the dot lands in the balance, day-to-night sweep, 24/7. VO 2.93 s
  b06: 249, // 20 beats  Send: old way vs Nest split, Arrived. VO 6.19 s
  b07: 136, // 11 beats  Send: claim link, no app needed. VO 3.55 s
  b08: 211, // 17 beats  Send: offline SMS hop, Queued -> Sent. VO 6.77 s
  b09: 100, //  8 beats  Protect: the plain grey scam message. VO 2.69 s
  b10: 148, // 12 beats  Protect: amber scam check. VO 3.55 s
  b11: 187, // 15 beats  Protect: undo ring, dot flies back, check. VO 5.25 s
  b12: 260, // 21 beats  Protect: four security cards (card 1 holds the line, 2-4 get ~2 s each). VO 4.05 s
  b13: 137, // 11 beats  Close: map, meadow, dot becomes the mark. VO 3.40 s
  b14: 99, //   8 beats  End card hold. No VO.
} as const;

export type BeatId = keyof typeof DUR;
export const BEAT_IDS = Object.keys(DUR) as BeatId[];

export type Span = { from: number; dur: number };

/** Every beat's start and length in frames (seconds = frames / 24). */
export const BEATS: Record<BeatId, Span> = (() => {
  const out = {} as Record<BeatId, Span>;
  let from = 0;
  for (const id of BEAT_IDS) {
    out[id] = { from, dur: DUR[id] };
    from += DUR[id];
  }
  return out;
})();

export const FILM_FRAMES = BEATS.b14.from + BEATS.b14.dur;

/** Narration: one file per beat, mixed in ffmpeg at beat start + VO_OFFSET_S. null = no line. */
export const VO_OFFSET_S = 0.3;
export const VO: Partial<Record<BeatId, string | null>> = {
  b01: "public/film/vo/b01.mp3",
  b02: "public/film/vo/b02.mp3",
  b03: "public/film/vo/b03.mp3",
  b05: "public/film/vo/b05.mp3",
  b06: "public/film/vo/b06.mp3",
  b07: "public/film/vo/b07.mp3",
  b08: "public/film/vo/b08.mp3",
  b09: "public/film/vo/b09.mp3",
  b10: "public/film/vo/b10.mp3",
  b11: "public/film/vo/b11.mp3",
  b12: "public/film/vo/b12.mp3",
  b13: "public/film/vo/b13.mp3",
  b14: "public/film/vo/b14.mp3",
};

/** Chapter markers (top-left label). Frames are absolute. */
export const CHAPTERS = [
  { word: "Send", from: BEATS.b05.from, to: BEATS.b09.from },
  { word: "Protect", from: BEATS.b09.from, to: BEATS.b13.from },
];

type SfxName = "tick" | "whoosh" | "birds";
type Cue = { beat: BeatId; at: number; sfx: SfxName; vol: number; note: string };

/** Sound-effect cues in beat-local frames. Files: public/opening/sfx/<sfx>.mp3. */
export const SFX_CUES: Cue[] = [
  { beat: "b01", at: 20, sfx: "tick", vol: 0.22, note: "Buenos Aires dot" },
  { beat: "b01", at: 58, sfx: "tick", vol: 0.22, note: "Miami dot" },
  { beat: "b01", at: 108, sfx: "whoosh", vol: 0.28, note: "push into Buenos Aires" },
  { beat: "b03", at: 3, sfx: "whoosh", vol: 0.16, note: "peso note falls away" },
  { beat: "b03", at: 50, sfx: "tick", vol: 0.55, note: "Nest mark completes" },
  { beat: "b05", at: 20, sfx: "tick", vol: 0.3, note: "dot lands in the balance" },
  { beat: "b05", at: 40, sfx: "tick", vol: 0.24, note: "clock starts" },
  { beat: "b05", at: 76, sfx: "whoosh", vol: 0.26, note: "push into the phone" },
  { beat: "b06", at: 78, sfx: "whoosh", vol: 0.34, note: "money dot flies the arc" },
  { beat: "b06", at: 100, sfx: "tick", vol: 0.5, note: "lands whole, timer stops" },
  { beat: "b06", at: 138, sfx: "tick", vol: 0.28, note: "$0 fee" },
  { beat: "b06", at: 236, sfx: "whoosh", vol: 0.24, note: "whip to Mamá's phone" },
  { beat: "b07", at: 66, sfx: "tick", vol: 0.3, note: "tap the link" },
  { beat: "b07", at: 102, sfx: "tick", vol: 0.45, note: "claimed" },
  { beat: "b07", at: 124, sfx: "whoosh", vol: 0.2, note: "tilt" },
  { beat: "b08", at: 58, sfx: "whoosh", vol: 0.24, note: "SMS hops to the tower" },
  { beat: "b08", at: 164, sfx: "tick", vol: 0.5, note: "Queued -> Sent" },
  { beat: "b09", at: 44, sfx: "tick", vol: 0.22, note: "message arrives (buzz)" },
  { beat: "b10", at: 26, sfx: "tick", vol: 0.25, note: "tap the new number" },
  { beat: "b11", at: 38, sfx: "whoosh", vol: 0.28, note: "dot flies to the new number" },
  { beat: "b11", at: 110, sfx: "whoosh", vol: 0.3, note: "undo: dot flies back" },
  { beat: "b11", at: 130, sfx: "tick", vol: 0.6, note: "ring closes into a check" },
  { beat: "b12", at: 12, sfx: "tick", vol: 0.32, note: "card 1" },
  { beat: "b12", at: 110, sfx: "tick", vol: 0.32, note: "card 2" },
  { beat: "b12", at: 158, sfx: "tick", vol: 0.32, note: "card 3" },
  { beat: "b12", at: 206, sfx: "tick", vol: 0.32, note: "card 4" },
  { beat: "b13", at: 10, sfx: "birds", vol: 0.42, note: "meadow washes in" },
  { beat: "b13", at: 86, sfx: "tick", vol: 0.45, note: "rings draw: Nest" },
];

/** Absolute SFX cues for the mixer. */
export const SFX = SFX_CUES.map((c) => ({
  file: `public/opening/sfx/${c.sfx}.mp3`,
  frame: BEATS[c.beat].from + c.at,
  vol: c.vol,
  note: c.note,
}));

/**
 * Music bed. Swap the track here (or run with MUSIC=path/to/track.mp3). A track at least as long as
 * the film plays straight through and fades out; a shorter one is looped once with a crossfade
 * inside the ducked scam stretch. Ducked from the scam message until the undo check.
 */
export const MUSIC_FILE = "public/opening/music-d.mp3";
export const MUSIC = {
  file: MUSIC_FILE,
  volume: 0.32,
  duck: { from: BEATS.b09.from, to: BEATS.b11.from + 130, level: 0.3 },
};
