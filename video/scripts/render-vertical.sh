#!/bin/sh
# Renders NestVertical to out/nest-vertical.mp4 on this Windows machine.
# The project path is too long for Remotion's bundled ffprobe.exe (MAX_PATH), so the picture is
# rendered without music and the same music is muxed in with system ffmpeg, matching Soundtrack.tsx:
# skip the first 2 s, ramp 0 -> 0.9 over 1 s, fade to 0 over the last 45 frames (1.5 s).
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe}"
npx remotion render NestVertical out/nest-vertical-picture.mp4 --props='{"music":false}' --crf=16 --browser-executable="$CHROME"
ffmpeg -v error -y -i out/nest-vertical-picture.mp4 -ss 2 -i public/music.mp3 \
  -filter_complex "[1:a]atrim=0:53,asetpts=PTS-STARTPTS,volume=0.9,afade=t=in:st=0:d=1,afade=t=out:st=51.5:d=1.5[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest out/nest-vertical.mp4
rm -f out/nest-vertical-picture.mp4
echo "wrote out/nest-vertical.mp4"
