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
