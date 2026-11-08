#!/bin/sh
# Renders the first 15 s of the 16:9 film to out/opening.mp4 (1920x1080, 24 fps).
# 1. Remotion renders the motion graphics with alpha (frames 0-93 are transparent except labels).
# 2. ffmpeg puts the AI shots underneath (Rosa 0-2.208 s, Ana 2.208-3.917 s), adds grade + grain
#    to the AI shots only, then mixes narration, music and sound effects.
# Remotion can't read media itself here (bundled ffprobe fails on the long Windows path),
# which is why the shots and audio are joined in ffmpeg.
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe}"
O=public/opening

if [ "$1" != "--audio-only" ]; then
  npx remotion render Opening out/opening-overlay.mov --codec=prores --prores-profile=4444 \
    --pixel-format=yuva444p10le --image-format=png --browser-executable="$CHROME"
fi

# Picture: black base, Rosa (cut in at 0.0, 0.6 s in), Ana (2.208 s), overlay on top.
ffmpeg -v error -y \
  -f lavfi -i "color=c=black:s=1920x1080:r=24:d=15" \
  -ss 0.6 -t 2.25 -i $O/rosa.mp4 \
  -t 1.75 -i $O/ana.mp4 \
  -i out/opening-overlay.mov \
  -filter_complex "\
[1:v]fps=24,scale=1920:1080,setpts=PTS-STARTPTS[r];\
[2:v]fps=24,scale=1920:1080,eq=saturation=0.88:contrast=0.97,colorbalance=rh=0.03:bh=-0.03,curves=all='0/0.035 0.5/0.5 1/0.98',noise=c0s=7:c0f=t+u,setpts=PTS-STARTPTS+2.2083/TB[a];\
[0:v][r]overlay=enable='lt(t,2.2083)'[v1];\
[v1][a]overlay=enable='between(t,2.2083,3.9166)'[v2];\
[v2][3:v]overlay=format=auto[v3];\
[v3]noise=c0s=3:c0f=t+u,format=yuv420p[v]" \
  -map "[v]" -t 15 -c:v libx264 -crf 16 -preset slow -r 24 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 out/opening-picture.mp4

# Sound: narration from 0.5 s, music under it (ducked), ambience per place, ticks and whooshes on cuts.
ffmpeg -v error -y \
  -i out/opening-picture.mp4 \
  -i $O/vo.mp3 -i $O/music-d.mp3 \
  -i $O/sfx/ba.mp3 -i $O/sfx/miami.mp3 -i $O/sfx/birds.mp3 \
  -i $O/sfx/whoosh.mp3 -i $O/sfx/tick.mp3 -i $O/sfx/whoosh.mp3 -i $O/sfx/whoosh.mp3 \
  -filter_complex "\
[1:a]adelay=500|500,volume=1.0[vo];\
[2:a]atrim=0:15,volume=0.32,afade=t=in:st=0:d=0.6,afade=t=out:st=13.8:d=1.2[mu];\
[3:a]atrim=0:2.3,volume=0.35,afade=t=out:st=2.0:d=0.3[ba];\
[4:a]atrim=0:1.8,volume=0.35,adelay=2208|2208,afade=t=out:st=3.6:d=0.3[mi];\
[5:a]atrim=0:2.0,volume=0.45,adelay=8208|8208[bi];\
[6:a]volume=0.35,adelay=3870|3870[w1];\
[7:a]volume=0.6,adelay=7600|7600[tk];\
[8:a]volume=0.3,adelay=8170|8170[w2];\
[9:a]volume=0.3,adelay=9960|9960[w3];\
[vo][mu][ba][mi][bi][w1][tk][w2][w3]amix=inputs=9:normalize=0,alimiter=limit=0.89,loudnorm=I=-14:TP=-1:LRA=11[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -t 15 -movflags +faststart out/opening.mp4
echo "wrote out/opening.mp4"
