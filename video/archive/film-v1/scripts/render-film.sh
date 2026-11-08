#!/bin/sh
# Renders the full Nest film to out/film.mp4 (1920x1080, 24 fps, ~89 s).
# 1. Remotion renders the picture (motion graphics only) to out/film-picture.mp4.
# 2. ffmpeg mixes narration (public/film/vo/bNN.mp3 at each beat start + 0.3 s; missing files
#    are skipped), the music (straight through if long enough, else looped once with a crossfade;
#    ducked under the scam beats) and the
#    SFX cues, all read from src/film/timeline.ts by scripts/film-cues.mjs.
# 3. Two-pass loudnorm to -14 LUFS, true peak under -1 dBTP (targets -1.5 for AAC overshoot); a light grain pass on the picture (stops banding).
# Remotion can't read media itself here (its bundled ffprobe fails on the long Windows path),
# which is why the audio is joined in ffmpeg.
#
# Music: MUSIC_FILE in src/film/timeline.ts; override per run with MUSIC=public/film/music.mp3 sh scripts/render-film.sh
# Usage: sh scripts/render-film.sh            (picture + mix)
#        sh scripts/render-film.sh --audio-only (re-mix onto the existing picture)
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe}"
mkdir -p out
export NODE_NO_WARNINGS=1

if [ "$1" != "--audio-only" ]; then
  npx remotion render Film out/film-picture.mp4 --codec=h264 --crf=16 --browser-executable="$CHROME"
fi

# Build the audio graph from the timeline. (Input paths have no spaces, so word-splitting is safe.)
INPUTS=$(node scripts/film-cues.mjs)
node scripts/film-cues.mjs --list

# Pass 1: mix to a WAV.
# shellcheck disable=SC2086
ffmpeg -v error -y -i out/film-picture.mp4 $INPUTS -/filter_complex out/film-mix.txt \
  -map "[aout]" -c:a pcm_s24le -ar 48000 out/film-mix.wav

# Pass 2: measure loudness.
STATS=$(ffmpeg -hide_banner -i out/film-mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$STATS" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
MI=$(get input_i); MTP=$(get input_tp); MLRA=$(get input_lra); MTH=$(get input_thresh); OFF=$(get target_offset)
echo "measured: I=$MI LUFS, TP=$MTP dBTP, LRA=$MLRA"

# Pass 3: normalise, add grain to the picture, mux.
ffmpeg -v error -y -i out/film-picture.mp4 -i out/film-mix.wav \
  -filter_complex "[0:v]noise=c0s=4:c0f=t+u,format=yuv420p[v];[1:a]loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$MI:measured_TP=$MTP:measured_LRA=$MLRA:measured_thresh=$MTH:offset=$OFF:linear=true,aresample=48000[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 16 -preset slow -r 24 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -shortest -movflags +faststart out/film.mp4

ffmpeg -hide_banner -i out/film.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)" | tail -2
echo "wrote out/film.mp4"
