# Film v4: re-cut to "Best Friend" only

Nov 7, 2026. These are Caleb's notes after watching v3. The base is v3: `src/film/*` and `FILM_V3_FIXES.md`. Keep everything he liked: the dollar/inflation beats, "No app needed", the text-message send, the scam flow, Bank wire, and the arc-to-logo idea.

## 1. Music

- **The whole film uses SOFI TUKKER "Best Friend"** (`public/film/music/best-friend.wav` / `.m4a`). No Santa María.
- **Re-cut to Best Friend's own beat grid.** It runs about 102 BPM, a beat of about 0.588 s. Don't time-stretch it. Rebuild the bar map from its detected beats and downbeats with librosa.
  - Pick an instrumental-led stretch that covers about 85 s, avoiding vocals under narration. Use local Whisper to check where the vocals are.
  - A short intro section is fine.
  - Keep cuts on downbeats.
- **Mind the level at the start.** Caleb said the opening was too loud. Keep the music under the voice, about 13.5 LU below during lines, and keep the first bars gentle.
- **The muffled scam section can stay** (a low-pass on Best Friend), opening up on the undo hit.

## 2. Opening: color, the Earth

- Replace the plain white map with a **stylized Earth / globe** in the brand palette.
  - Option: `apps/mobile/assets/globe/dotted-globe.png` from Tristan's app on `origin/main`, or draw one.
  - Put **pins on Miami and Buenos Aires, Argentina** (label "Buenos Aires, Argentina").
  - The arc between the pins carries the money dot as before.
- Add color wherever it fits the brand.

## 3. Narration changes

Record with voice "Gia": Higgsfield `generate_audio`, model `elevenlabs_v4`, `dialogue` voice_id `530df032-c311-483b-a750-cb3c9e1bcdfd` (preset), stability 0.55, prefix `[confident, warm, steady]`. Then normalize to −18 LUFS.

- **Scam line (replaces b10 and b11):** "Nest detected it might be a scam and warned me. I still sent it, and I had twenty-four hours to undo it." The meaning is Caleb's. Tighten it if needed, but keep it plain.
- **Offline: more emphasis.** It's a breakthrough no other app offers. Give it more time and a stronger visual, and a line like "No Wi-Fi? It still goes, by text, so my money is never stuck." The copy deck bans the question-then-answer pattern, so prefer "Even without Wi-Fi, it goes by text, so my money is never stuck."
- **"No app needed" (b07):** keep the idea, and make the visual show Mamá opening the link **in her phone's browser** and signing in with her number. Suggested line: "She doesn't need to download anything. She opens the link and keeps it in dollars."
- Keep the other lines as in v3.

## 4. Ending

- The arc-to-logo transition was "really good, just a little slow": cut the pause and make it flow.
- **Finish on the website's hero**: the meadow photo (`public/meadow.jpg` or `../web-earth/public/photos/meadow.jpg`), the birds, and "Protect what matters.", in 16:9 landscape.
- Transition into the hero faster, and **don't sit on any still image for about 3 s** (that felt awkward). End crisply. Keep the disclaimer readable but brief.
- Loop is optional this round.

## 5. Format

16:9 landscape, 1920×1080, 24 fps, 90 s maximum.

## Process

Same quality bar as v3:
1. Typecheck.
2. Stills on every downbeat; look at each one, fix, second pass.
3. Full render via `render-film.sh`, then the mix report.
4. Make a phone copy (`out/film-v4-share.mp4`, about 2.5 Mbps, under 30 MB).
5. Copy the master to `../pitch/nest-film-v4.mp4`.
6. Commit and push to `calebs-output`, ending the message with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
