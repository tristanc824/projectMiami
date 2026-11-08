import React from "react";
import { Audio, getInputProps, interpolate, staticFile } from "remotion";
import { TOTAL_FRAMES } from "./timeline";

/** Music: public/music.mp3, skipping its first 2 s so the warm opening lands near the brand reveal. */
export const MUSIC_FILE = "music.mp3";
export const MUSIC_TRIM_BEFORE = 60; // frames (2 s)
const FADE_IN = 30;
const FADE_OUT = 45;
const PEAK = 0.9;

/**
 * Pass --props='{"music":false}' to render without the music (scripts/render-vertical.sh does this on
 * Windows paths too long for Remotion's bundled ffprobe, then muxes the same music in with ffmpeg).
 */
export const Soundtrack = () =>
  (getInputProps() as { music?: boolean }).music === false ? null : (
  <Audio
    src={staticFile(MUSIC_FILE)}
    trimBefore={MUSIC_TRIM_BEFORE}
    volume={(f) =>
      interpolate(f, [0, FADE_IN, TOTAL_FRAMES - FADE_OUT, TOTAL_FRAMES], [0, PEAK, PEAK, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    }
  />
);

/*
 * SFX: cue frames live in timeline.ts (SFX). To add a sound, drop it in public/sfx/ and add e.g.
 *   <Sequence from={SFX.messageAlert}><Audio src={staticFile("sfx/alert.mp3")} /></Sequence>
 */
