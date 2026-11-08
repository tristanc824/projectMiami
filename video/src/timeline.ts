/**
 * Beat timings for the vertical cut, in frames at 30 fps (VIDEO_SCRIPT.md section 1).
 * Each beat starts at the script's time; the previous beat stays alive under it for the
 * length of the incoming transition.
 */
export const BEATS = {
  hook: { from: 0, dur: 90 }, //        0:00-0:03
  bank: { from: 90, dur: 120 }, //      0:03-0:07
  brand: { from: 210, dur: 90 }, //     0:07-0:10
  home: { from: 300, dur: 150 }, //     0:10-0:15
  send: { from: 450, dur: 270 }, //     0:15-0:24 (a, b, c: 90 frames each)
  newNumber: { from: 720, dur: 90 }, // 0:24-0:27
  scam: { from: 810, dur: 120 }, //     0:27-0:31
  hold: { from: 930, dur: 90 }, //      0:31-0:34
  undo: { from: 1020, dur: 150 }, //    0:34-0:39
  undone: { from: 1170, dur: 120 }, //  0:39-0:43
  line: { from: 1290, dur: 150 }, //    0:43-0:48
  end: { from: 1440, dur: 150 }, //     0:48-0:53
} as const;

export const TOTAL_FRAMES = 1590; // 53 s

/**
 * Sound cues (absolute frames) for whoever adds SFX later. Each matches a sound note in the script.
 * Drop files in public/sfx/ and map them in Soundtrack.tsx.
 */
export const SFX = {
  messageAlert: 3, //            beat 1: message slides in
  bankHum: 90, //                beat 2: low flat hum starts
  trackOpens: 210, //            beat 3: the track opens
  lineTick: 300 + 84, //         beat 4: soft tick as the line finishes
  tapMama: 450 + 22, //          beat 5a: thumb taps Mamá
  slideRelease: 540 + 50, //     beat 5b: soft click on release
  faceIdTick: 540 + 76, //       beat 5b: Face ID tick
  arrivedLift: 630, //           beat 5c: the track lifts, faint birds
  scamTone: 810, //              beat 7: a low tone, held
  holdStart: 930 + 12, //        beat 8: tone rises with the hold
  holdRelease: 930 + 56, //      beat 8: tone cuts out on release
  holdFaceId: 930 + 80, //       beat 8: Face ID on the risky send
  undoPulseFirst: 1020 + 30, //  beat 9: one soft pulse per second (every 30 frames)
  undoTap: 1170 + 20, //         beat 10: tap Undo
  release: 1170 + 46, //         beat 10: the release, track back in full
} as const;
