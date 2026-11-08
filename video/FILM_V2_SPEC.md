# Nest film v2: cut to "Santa María", higher production

Nov 7, 2026. Caleb's notes on v1:
- Cut every motion to the song's beat, so it feels satisfying and loopable.
- Use more complex, higher-production motion graphics.
- Watch for misalignment: everything evenly spaced and pleasing to look at.
- Keep the feature breakdown clear.
- No savings and no family safe word.
- A better inflation scene, with the message "Nest keeps my money in US dollars, so it holds its value."

He liked the first draft overall.

## 1. Music and the beat grid (the clock for everything)

- **Song:** Gotan Project, "Santa María (del Buen Ayre)", `public/film/music/santa-maria.wav` (the .m4a sits next to it).
- **Grid:** `public/film/music/santa-maria-grid.json` has beats, bars, phrases and 183 detected kick hits, all in film seconds and film frames at 24 fps.
- **Film time 0 = song time 0.9336 s.** That is a bar downbeat. Trim the song from there in the mix.
- **Tempo** 117.855 BPM: beat = 0.50910 s = 12.218 frames; bar (4 beats) = 2.03640 s = 48.874 frames; phrase (8 bars) = 16.2912 s.
- **The song's shape in film time:**
  - 0–16.29 s: quiet intro (bass, bandoneón, samples).
  - The full beat enters with a one-beat pickup at 15.78 s and **lands on the downbeat at 16.291 s (the drop)**.
  - Phrase downbeats: 16.291, 32.582, 48.874, 65.165, 81.456.
- **Frame of bar n** = `Math.round(n * 48.8736)`. **Frame of beat k** = `Math.round(k * 12.2184)`. Never accumulate rounded values: always compute from n or k, so there's no drift.
- **Kicks:** most land on beat 1, the "and" of 1, beat 2 and the "and" of 2 of each bar (tango feel). Use the `kicks` list (with `strength`) for accent hits.

## 2. The film on the grid (85.5 s, 42 bars)

| # | Scene | Bars | Film seconds | Frames (start–end) | Narration (starts on a beat) |
|---|---|---|---|---|---|
| 1 | Map | 0–3 | 0.000–8.146 | 0–196 | b01 at beat 2 (0.509 s) |
| 2 | Inflation (new) | 4–7 | 8.146–16.291 | 196–391 | new b02 at bar 4 beat 2 (8.655 s) |
| 3 | **Drop → Nest** | 8–10 | 16.291–22.401 | 391–538 | new b03 **exactly on the drop (16.291 s)** |
| 4 | 24/7 | 11–12 | 22.401–26.474 | 538–635 | b05 at 22.910 |
| 5 | Send: old way vs Nest, Arrived | 13–16 | 26.474–34.619 | 635–831 | b06 at 26.983 |
| 6 | Claim link | 17–19 | 34.619–40.728 | 831–978 | b07 at 35.128 |
| 7 | Offline | 20–23 | 40.728–48.874 | 978–1173 | b08 at 41.237 |
| 8 | Scam message | 24–25 | 48.874–52.946 | 1173–1271 | b09 at 49.383 |
| 9 | Scam check | 26–28 | 52.946–59.056 | 1271–1417 | b10 at 53.455 |
| 10 | Undo | 29–31 | 59.056–65.165 | 1417–1564 | b11 at 59.565; **the undo check lands on the 65.165 downbeat** |
| 11 | Security: 3 cards | 32–35 | 65.165–73.310 | 1564–1759 | b12 at 65.674 |
| 12 | Close | 36–39 | 73.310–81.456 | 1759–1955 | b13 at 75.346 |
| 13 | End card, then loop frame | 40–41 | 81.456–85.529 | 1955–2053 | none |

**Narration** is in `public/film/vo/`: b01, b05–b13, plus a new b02 and b03, which I'll drop in. **There is no b04** (savings cut) and **b12's spoken line doesn't change**. If a line runs past its scene, tell me; don't squeeze the cut.

**Mix:**
- Narration at full level, with the music ducked about 5 dB under it (sidechain-style, 80 ms attack, 300 ms release).
- **Scam section (48.874–65.165): put a low-pass filter on the music** (about 500 Hz, so the kick and bass stay and the bandoneón goes muffled), crossfading in over 1 beat. At **65.165 the filter opens to full on the downbeat**, together with the undo check. That's the release.
- Fade the music out over the last 2 bars (81.456–85.529).
- Sound effects only where they reinforce a beat (tick on the logo rings, soft whoosh on push-throughs, a single message buzz at 49.383 if you can make one with the tools you have; otherwise skip it).
- Loudness -14 LUFS, true peak below -1 dBTP.

## 3. Design system (fixes v1's misalignments)

- **Grid:** 1920×1080, 12 columns, **120 px outer margins**, 24 px gutters (column = 118 px). Every text block's left edge sits on a column line. Group centers sit on the canvas centerline (x = 960) or on a column center when the layout is 2-up.
- **2-up layouts** (phone + text, left panel + right panel): the two halves split at x = 960. Each element is **centered in its half**, so the whole thing is visually centered. No more phone at x=470 with text at x=1140.
- **Phone:** one size everywhere (screen height 880 px), the same shadow and the same bezel. Vertically centered (y center = 540) unless it's deliberately bleeding off the bottom.
- **Type scale:**
  - 112 / 72 / 48 / 32 / 24 px, Figtree.
  - Headlines 600 weight, -0.035em tracking.
  - Captions in ink-400. Nothing under 24 px outside the phone.
  - Line height 1.05 for display, 1.35 for body.
- **Spacing:** 8 px baseline. Gaps between grouped items are equal, and the group is centered as a unit. Cards in a row are the same size with identical gaps.
- **Chapter label:** at (120, 96) on the margin, the same size in every scene. Remove the "Save" chapter. Chapters are "Send" (scenes 4–7) and "Protect" (scenes 8–11).
- **Colors:**
  - Page #F3F0EA, ink #17201A, moss #2F5D3A, sky #5FA8D6, amber #8A5A10 / #F6EBD3.
  - Amber only for the scam check and undo.
  - Dark backgrounds only for the scam message (night).
- **The app's Home screen now matches the real app:** a single balance line ("Your balance · Past month"), **no peso line and no "same money in pesos"**. The tab bar is Home, Security, You. Check every phone in the film for this.
- **Avatars:** use the same Ana and Mamá crops in every scene (v1's claim screen showed a different woman as Ana).

## 4. Motion language (what makes it satisfying)

1. **Every scene cut lands on a bar downbeat**, at the exact frame from the formula. Transitions take one beat (12 frames) and **finish** on the downbeat. Push-throughs and match cuts, with `CameraMotionBlur` (180°, 6 samples) only during fast moves.
2. **Things hit on the beat.** A primary entrance starts on a beat with a fast attack: 6–8 frames, spring with a small overshoot (damping 14, stiffness 220), so the landing reads as an impact on the kick.
3. **Groups stagger** by an 8th note (6 frames) or a quarter (12 frames). Never by random amounts.
4. **Kick accents:** on strong kicks (strength above the scene's median), the scene's focal element does a micro scale punch (1.000 → 1.018 → 1.000 over 8 frames). The dot-grid background brightens 2% and decays over 10 frames. Subtle: felt more than seen.
5. **Text:** masked line reveals starting on a beat (8–10 frames per line, lines 6 frames apart). Hold every key state for at least a full beat. Headlines stay readable for at least 1.5 s.
6. **Camera:** a constant slow drift (about 0.4% scale per bar) between hits, never random wobble.
7. **The money dot motif:** the dot always moves along clean arcs, arrives on a beat, and pulses on the beat while it waits.
8. **No motion-blurred carousels.** v1's security cards smeared sideways and looked broken mid-move.

## 5. Scene notes

**1. Map (bars 0–3), quiet intro**
- Balanced composition: Miami upper-left, around column 4; Buenos Aires lower-right, around column 9. One smooth arc that **touches both dots exactly** (v1's arc stopped short of the Buenos Aires dot).
- Labels sit on the outside of the arc, with consistent offsets.
- On the beat:
  - Bar 0, beat 1: Miami dot pops. Beat 3: its label reveals.
  - Bar 1: the arc draws over 2 beats.
  - Bar 2, beat 1: Buenos Aires dot pops, then its label.
  - Bar 3: the moss money dot appears at Miami and pulses on every beat.
- Keep v1's faint dot-grid; drop the arbitrary horizontal lines.
- Transition into scene 2: the camera pushes into Buenos Aires, and that dot opens into the left panel of scene 2 (match cut).

**2. Inflation (bars 4–7): the new "what your money buys" scene**
- Two equal panels split at x = 960, each a **4×3 grid of 12 grocery tiles**: bread, milk, eggs, rice, coffee, apples, cheese, pasta, beans, cooking oil, tomatoes, chicken.
  - Simple single-weight line icons in a consistent style, drawn as SVG.
  - Tiles on a rounded white card, evenly spaced.
- Panel titles: left **"Local currency"**, right **"Nest · US dollars"**. Don't use the word "peso" anywhere on screen.
- Top center: a month label that changes **on every beat**, Jan → Dec 2023.
- Under each panel: "$1,000 buys" and a value. On the left it ticks down each month; on the right it stays at $1,000.
- **Real data** (INDEC CPI, Argentina 2023, cumulative 211%). What $1,000 bought, and the tiles left of 12:

| Month | Buys | Tiles left |
|---|---|---|
| Jan | $943 | 11 |
| Feb | $885 | 11 |
| Mar | $822 | 10 |
| Apr | $758 | 9 |
| May | $703 | 8 |
| Jun | $663 | 8 |
| Jul | $624 | 7 |
| Aug | $555 | 7 |
| Sep | $493 | 6 |
| Oct | $455 | 5 |
| Nov | $403 | 5 |
| Dec | $321 | 4 |

- Timing in phrase 2 (16 beats from 8.146 s):
  - Beat 0: the match-cut lands.
  - Beats 1–2: titles and grids build in, staggered 8ths.
  - **Beats 3–14 (9.673–15.273 s): one month per beat.** When the count drops, a left tile **drops 10 px, desaturates and fades to an empty dashed outline** (the grid keeps its shape, so it stays even). Tiles go in a fixed, pleasing order: bottom-right first, reading backwards.
  - The right grid's tiles do a tiny synchronized bounce on each beat. Alive, and holding steady.
  - Beat 15 (15.782, the pickup): the left panel dims to 40%. The right panel's 12 tiles **collapse into the single moss money dot** at center.
- Footnote at the bottom center, 24 px ink-400: "What $1,000 bought each month, kept in local currency · Example: Argentina, 2023 inflation (INDEC)".

**3. Drop → Nest (bars 8–10)**
- **On the drop frame (391)** the dot bursts into the Nest mark: ring 1 on the drop, ring 2 one beat later, ring 3 one beat after that. Then the wordmark masks in on the next beat.
- The new b03 line ("Nest keeps our money in US dollars…", final words from Martha) starts on the drop.
- Under the lockup, the keyword "Held in US dollars" reveals on bar 9.
- Bar 10: the lockup flies to the chapter label position, with a push-through to the 24/7 scene finishing on the bar 11 downbeat.

**4. 24/7 (bars 11–12)**
- 2-up layout: the clock block centered in the left half, the phone centered in the right half.
- The phone's Home screen matches the app (see section 3).
- The day-to-night sweep runs across both bars. **The clock's minutes tick on each beat** (8:34 → 8:41 PM). The moon sits fully in frame on the grid, not clipped at the edge.
- "Open 24/7" chip under the clock, left-aligned with it.

**5. Send (bars 13–16)**
- Two identical panel structures: title, route, "Arrives in" / "Arrived in", big value. **The two panels must line up row for row**, with the same y for every element.
- Fill the empty space above the routes by moving the whole block to the vertical center.
- Old way:
  - Bar 13: the three bank nodes pop on beats 2, 3 and 4, each taking a slice of the coin (-$6, -$6, -$7) on its kick.
  - Bar 14, beat 1: $231 arrives with "3–5 days". **No overlapping "Day 3" / "3–5 days" text**: one value, one state.
- Nest:
  - Bar 14: the arc draws in 1 beat while the timer counts 0.0 → 0.9 s, landing on beat 3.
  - The coin arrives whole ($250), and the "$0 fee" chip punches in on the word "fee".
- Bar 16: push-through into the Arrived phone with "No fee." on the right half (2-up).

**6. Claim link (bars 17–19)**
- Mamá's chat on the phone. The link bubble drops in on a beat and morphs into "Mamá" (or the claim card) on the next downbeat.
- The claim screen shows **Ana's** avatar, the same one used everywhere.
- "No app needed." on the right half, centered in it.

**7. Offline (bars 20–23)**
- Phone left half, signal and tower right half. Both centered in their halves, with the same baseline.
- The SMS bubble hops phone → tower → away in 3 beats.
- Bar 22: the "Queued" chip appears **inside the phone UI**, not floating over the bezel edge as in v1.
- Bar 23, beat 1: bars return and it flips to "Sent".

**8. Scam message (bars 24–25), night**
- Dark background. Center everything on x = 960: the number header, the timestamp **and the message bubble**. v1 had the bubble left-aligned under a centered header.
- The bubble types in, then holds.

**9. Scam check (bars 26–28)**
- Amber wash in on the bar 26 downbeat.
- The phone and the "Scam check" list form a 2-up, centered.
- The three reasons reveal on beats 2, 3 and 4 of bar 26. Hold.

**10. Undo (bars 29–31)**
- Symmetric layout: the amber ring at center; "Your balance" node right, "New number" node left, at equal distances and the same y. The dot path is a clean arc between them.
- The ring drains through bars 29–30.
- Bar 31, beat 1: the Undo tap ripple. The dot flies back along the arc over beats 2–4 and **lands, the ring closes into a check, and the balance counts back up on the 65.165 downbeat**, as the music filter opens.

**11. Security (bars 32–35)**
- **Three cards only:** "Only you can approve" (fingerprint glyph; "fingerprint or PIN"), "Lock Nest", "Trusted contact". **No family safe word.**
- One even row of three equal cards, centered as a group, with identical gaps. No horizontal scroll.
- Card 1 lands on the bar 32 downbeat, card 2 on bar 33, card 3 on bar 34. Each card's inner animation (glyph check, toggle flip, card arriving on a second phone) fires on beat 3 of its bar.
- Bar 35: all three cards breathe on each beat, then pull back.

**12. Close (bars 36–39)**
- Pull back to the map. The dot sits in Buenos Aires; the arc glows.
- The meadow and birds wash in. "That's why we use Nest. Protect what matters." with the lockup.

**13. End card and loop (bars 40–41)**
- The end card: lockup, "Protect what matters.", the URL slot (hidden while empty), and the line about the Solana test network.
- On bar 41 everything eases back to **exactly frame 0's composition** (page color, faint dot-grid, the two city dots), so the film loops seamlessly.

## 6. Quality bar

- Typecheck.
- Render a still on **every bar downbeat and every bar's beat 3** (`scripts/film-stills.mjs`) and look at each one:
  - edges and centers line up with the grid
  - equal gaps
  - nothing clipped
  - no two states overlapping
  - text readable
  - the same phone size
- Fix, then do a second pass.
- Then render with `render-film.sh` and check sync: take the kick times from the grid json and confirm the frame where each primary hit lands is within 1 frame of a kick.
- Report: the final scene table, any line that didn't fit, and anything you couldn't do.
