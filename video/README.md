# Nest demo video

Built with [Remotion](https://www.remotion.dev) from the real app screens, so the video always matches the product. Script: `../VIDEO_SCRIPT.md`. Storyboard: `../app-design/storyboard.html`.

```sh
npm install
npm run studio          # live preview in the browser
npm run render:vertical # 1080x1920, 53s  -> out/nest-vertical.mp4
npm run render:wide     # 1920x1080, ~68s -> out/nest-wide.mp4
```

Both cuts must stay under 90 seconds.

**Windows with a long folder path:** Remotion's bundled headless browser can fail to unpack ("chrome-headless-shell.exe ENOENT"). Add your installed Chrome to any render command:
`--browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"`

Assets in `public/` are copies of the website photos (Unsplash license).

## Vertical cut: how it's built

- `src/NestVertical.tsx` sequences the 12 beats (`src/scenes/B01Hook.tsx` ... `B12End.tsx`) with the script's timings from `src/timeline.ts`. Each beat overlaps the previous one for its transition (blur, push, zoom, fade).
- `src/ui/` holds the shared pieces: `Phone` (frame, status bar, island), `screens.tsx` (the real app screens ported from `app-design/nest-app-screens.html`), `Atoms` (avatars with the app's photo crops, chips, buttons, rows), `Birds` (frame-driven wing morph), `NestMark` (draws itself), `Finger` (touch indicator), `Stage` (logical-px canvas, backgrounds, transitions, the "Prototype" pill).
- Sound: `src/Soundtrack.tsx` plays `public/music.mp3` (first 2 s skipped, fade in 1 s, fade out over the last 45 frames). SFX cue frames are listed in `src/timeline.ts` (`SFX`).
- End card URL: set `END_URL` in `src/scenes/B12End.tsx` once the address is final.
- Review stills: `node scripts/stills.mjs [frame ...]` writes `out/review/f####.jpg` from one bundle.
- On this machine the project path is too long for Remotion's bundled `ffprobe.exe`, so audio fails to load during render. `sh scripts/render-vertical.sh` renders the picture with `--props='{"music":false}'` and muxes the same music in with system ffmpeg.
- Typecheck: `npx tsc --noEmit -p .` from this folder.
