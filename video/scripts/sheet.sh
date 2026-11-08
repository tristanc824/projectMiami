#!/bin/sh
# usage: sheet.sh out.jpg a.jpg b.jpg c.jpg ... (stacks stills side by side at half size)
o=$1; shift; n=$#; inputs=""; f=""; i=0
for x in "$@"; do inputs="$inputs -i $x"; f="$f[$i]scale=540:960[v$i];"; i=$((i+1)); done
s=""; i=0; while [ $i -lt $n ]; do s="$s[v$i]"; i=$((i+1)); done
ffmpeg -v error -y $inputs -filter_complex "${f}${s}hstack=$n" "$o"
