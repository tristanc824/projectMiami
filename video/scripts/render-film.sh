#!/bin/sh
# Renders the Nest film v2 to out/film.mp4 (1920x1080, 24 fps, 2053 frames = 85.5 s, cut to
# "Santa María"). Every time below comes from src/film/timeline.ts.
# 1. Remotion renders the picture to out/film-picture.mp4 (motion graphics only, no audio:
#    Remotion's bundled ffprobe can't read media at this project's long Windows path).
# 2. scripts/film-cues.mjs mixes narration (each file normalised, placed on its beat), the song
#    (trimmed from 0.9336 s, per-bar bed level, duck + 2-4 kHz dip under each line, the scam-section
#    low-pass, fade over the last 2 bars) and the sound effects -> out/film-mix.wav + stems + report.
# 3. Two-pass loudnorm to -14 LUFS, true peak under -1 dBTP; light grain on the picture; mux.
# 4. Mix check: three excerpts in out/mix-check/ (b03 on the drop, b06, b11 into the undo).
#
# Usage: sh scripts/render-film.sh               (picture + mix)
#        sh scripts/render-film.sh --audio-only  (re-mix onto the existing picture)
#        MUSIC=path/to/track.wav sh scripts/render-film.sh --audio-only
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe}"
mkdir -p out out/mix-check
export NODE_NO_WARNINGS=1

if [ "$1" != "--audio-only" ]; then
  npx remotion render Film out/film-picture.mp4 --codec=h264 --crf=16 --browser-executable="$CHROME"
fi
[ -f public/film/sfx/tick.wav ] && [ -f public/film/sfx/buzz.wav ] || sh scripts/make-sfx.sh

node scripts/film-cues.mjs --list
node scripts/film-cues.mjs

# Loudness: measure, then normalise linearly (targets -1.5 dBTP so the AAC encode stays under -1).
STATS=$(ffmpeg -hide_banner -i out/film-mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$STATS" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
MI=$(get input_i); MTP=$(get input_tp); MLRA=$(get input_lra); MTH=$(get input_thresh); OFF=$(get target_offset)
echo "mix before normalising: I=$MI LUFS, TP=$MTP dBTP, LRA=$MLRA"
ffmpeg -v error -y -i out/film-mix.wav \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$MI:measured_TP=$MTP:measured_LRA=$MLRA:measured_thresh=$MTH:offset=$OFF:linear=true:print_format=summary,aresample=48000" \
  -c:a pcm_s24le out/film-mix-norm.wav

ffmpeg -v error -y -i out/film-picture.mp4 -i out/film-mix-norm.wav \
  -filter_complex "[0:v]noise=c0s=4:c0f=t+u,format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v libx264 -crf 16 -preset slow -r 24 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 256k -shortest -movflags +faststart out/film.mp4

echo "final loudness (out/film.mp4):"
ffmpeg -hide_banner -i out/film.mp4 -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p' | grep -E "I:|Peak:"

# Mix check excerpts (from the normalised mix) and their voice-vs-music numbers (out/mix-report.txt).
ffmpeg -v error -y -ss 15.27 -t 6.6 -i out/film-mix-norm.wav -c:a pcm_s16le out/mix-check/b03-drop.wav
ffmpeg -v error -y -ss 26.47 -t 8.2 -i out/film-mix-norm.wav -c:a pcm_s16le out/mix-check/b06-send.wav
ffmpeg -v error -y -ss 59.06 -t 8.2 -i out/film-mix-norm.wav -c:a pcm_s16le out/mix-check/b11-undo.wav
grep -E "^(bar|line|b03|b06|b11)" out/mix-report.txt
echo "wrote out/film.mp4 and out/mix-check/"
