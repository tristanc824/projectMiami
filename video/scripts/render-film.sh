#!/bin/sh
# Renders the Nest film v4 to out/film.mp4 (1920x1080, 24 fps, 2103 frames = 87.6 s, cut to SOFI TUKKER
# "Best Friend" on its own bars). Every time below comes from src/film/timeline.ts.
# 1. Remotion renders the picture to out/film-picture.mp4 (motion graphics only, no audio:
#    Remotion's bundled ffprobe can't read media at this project's long Windows path).
# 2. scripts/film-cues.mjs mixes narration (each file normalised, placed on its beat), the music
#    (Best Friend re-cut bar by bar from the timeline's EDIT, intro low-pass sweep, per-bar bed level,
#    duck + 2-4 kHz dip under each line, the scam-section low-pass, the final hit) and the sound
#    effects -> out/film-mix.wav + stems + report.
# 3. Two-pass loudnorm to -14 LUFS, true peak under -1 dBTP; light grain on the picture; mux.
# 4. Mix check: excerpts in out/mix-check/ (opening, b03 on the drop, b08 offline, b10 into the undo, the end).
#
# Usage: sh scripts/render-film.sh               (picture + mix)
#        sh scripts/render-film.sh --audio-only  (re-mix onto the existing picture)
# Music: MUSIC_SOFTEN=B|C|off (default off).
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
ffmpeg -v error -y -ss 0 -t 9.5 -i out/film-mix-norm.wav -c:a pcm_s16le out/mix-check/b01-open.wav
ffmpeg -v error -y -ss 15.3 -t 7.2 -i out/film-mix-norm.wav -c:a pcm_s16le out/mix-check/b03-drop.wav
ffmpeg -v error -y -ss 47.0 -t 9.5 -i out/film-mix-norm.wav -c:a pcm_s16le out/mix-check/b08-offline.wav
ffmpeg -v error -y -ss 61.0 -t 12.0 -i out/film-mix-norm.wav -c:a pcm_s16le out/mix-check/b10-undo.wav
ffmpeg -v error -y -ss 79.5 -t 8.2 -i out/film-mix-norm.wav -c:a pcm_s16le out/mix-check/b13-end.wav
cat out/mix-report.txt
echo "wrote out/film.mp4 and out/mix-check/"
