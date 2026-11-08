#!/bin/sh
# Synthesizes the film's two small sound effects with ffmpeg (public/opening/sfx/tick.mp3 is
# nearly silent, -60 LUFS, and there was no message buzz):
#   public/film/sfx/tick.wav  a soft, short "tock" for the logo rings and the undo check
#   public/film/sfx/buzz.wav  a phone vibrating twice on a table, for the scam message
set -e
cd "$(dirname "$0")/.."
mkdir -p public/film/sfx
ffmpeg -v error -y -f lavfi -i "aevalsrc='0.55*sin(2*PI*1320*t)*exp(-t/0.028)+0.22*sin(2*PI*2790*t)*exp(-t/0.011)+0.2*sin(2*PI*660*t)*exp(-t/0.06)':s=48000:d=0.3" \
  -af "afade=t=in:d=0.0015,aformat=channel_layouts=stereo" public/film/sfx/tick.wav
ffmpeg -v error -y -f lavfi -i "aevalsrc='(0.42*sin(2*PI*152*t)+0.26*sin(2*PI*304*t+0.7)+0.17*sin(2*PI*456*t+1.3)+0.11*sin(2*PI*608*t+2.1)+0.05*(random(0)*2-1))*(0.72+0.28*sin(2*PI*29*t))*(between(t,0,0.3)*min(1,min(t/0.012,(0.3-t)/0.025))+between(t,0.42,0.72)*min(1,min((t-0.42)/0.012,(0.72-t)/0.025)))':s=48000:d=0.8" \
  -af "highpass=f=90,lowpass=f=2400,aformat=channel_layouts=stereo" public/film/sfx/buzz.wav
echo "wrote public/film/sfx/tick.wav and buzz.wav"
