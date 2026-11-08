# Film v3: final fix round

Nov 7, 2026. This is the last round before judging. Input comes from:
- the independent design review (`out/design-review/`)
- the first-time-viewer review (`out/viewer-review/`)
- Martha's v3 narration
- Caleb's notes

Take care and re-check the stills.

## A. New narration

The new files are already in `public/film/vo/`; the old ones are in `vo/unused/v2/`.

**Durations (s):** b01 5.72 · b02 7.16 · b03 5.18 · b05 2.93 · b06 6.61 · b07 4.36 · b08 4.13 · b09 2.69 · b10 3.97 · b11 4.13 · b12 7.00 · b13 5.96

**Placement:**
- **b02** is long, so start it on the bar 4 downbeat (8.146 s), not on beat 2.
- **b03:** its leading silence is already trimmed. Place it exactly at 16.291.
- **b11** must end before 65.165.
- **b01** now fills scene 1. No dead air after the first line (Caleb flagged an awkward silence).

**Lines** (match on-screen keywords and visuals to these):

| Line | Text |
|---|---|
| b01 | My mom lives in Buenos Aires. I live in Miami, and every month I send her what I can. |
| b02 | In Argentina, prices tripled in a year. Money in local currency lost about two-thirds of its value. |
| b03 | Nest keeps our money in U.S. dollars, so it doesn't shrink with the local currency. |
| b05 | It works any time, day or night. |
| b06 | Banks took days and paid her in pesos. Now she gets dollars in about a second, no transfer fee. |
| b07 | She doesn't need the app. She taps the link and keeps it in dollars. |
| b08 | Without Wi-Fi, it goes by text, and Mamá still gets it. |
| b09 | Then one night, I got this. |
| b10 | Before I paid, Nest showed me why it might be a scam. |
| b11 | I sent it anyway, and I still had twenty-four hours to undo it. |
| b12 | Nothing leaves my account without my fingerprint or PIN. I can lock Nest, and Mamá is my trusted contact. |
| b13 | No bank holds or lends our money. That's why we use Nest. Protect what matters. |

## B. On-screen changes (Martha's copy)

1. **Inflation panels**
   - **Labels:** left "Kept in local currency", right "Kept in US dollars" (Nest mark as the icon).
   - **Values:** replace "$1,000 buys $X" with the label "Groceries it still buys" under both panels. Show percentages Jan→Dec, computed from the INDEC CPI: 94, 89, 82, 76, 70, 66, 62, 56, 49, 46, 40, 32%.
   - **Right panel:** show 97% at Dec (US 2023 CPI was about 3.4%) and keep all 12 tiles.
   - **Footnote:** at least 24 px and held on screen: "Share of what $1,000 bought in January · Argentina 2023 (INDEC)".
   - **Typo:** fix "$1.000" at about 9.0 s.
2. **Mechanism beat (16–22 s).** After the logo lands, show Mamá's phone or balance in dollars with the chip "Held in digital US dollars (USDC)", so viewers see how it works.
3. **Send scene**
   - "The old way" becomes "Bank wire".
   - Sub-label under $231: "Paid out in local currency". Under $250: "Arrives as US dollars".
   - The Send panels' combined midpoint must sit at x = 960.
4. **Offline scene** must match b08: the text bubble goes out and Mamá receives it right away, with the chip "Sent by text". Remove the queued/waiting state, the "No signal. It waits, then sends." caption, and "$80 to Tío Luis".
5. **Security**
   - Only 3 cards: card 1 "Only you approve payments" (subtitle "With your fingerprint or PIN."), "Lock Nest", "Trusted contact".
   - No family safe word.
6. **Claim screen:** remove "Yours to use in 24 hours…", which contradicts "about a second". Optional caption: "She keeps it in US dollars."
7. **Home screens:** remove the "≈ ARS 4.15M · example rate" chip from every Home screen in the film.

## C. Design review fixes

- **H1 two-up centering:** the pair must read as centered on the frame. If 480/1440 collides with the chapter label, move the label.
- **H2 Security row:**
  - 3 equal cards with equal 24 px gaps, inside the 120 px margins.
  - The group stays centered as the cards arrive.
  - No camera drift past the margins.
- **H3 make the drop land:**
  - Rings full size and centered, with a scale punch and a subtle flash on frame 391.
  - Raise the music 4–6 dB on bars 8–9, before the b03 duck.
- **H4 no half-masked states at settled frames:** reveals finish on the beat, and the pill background fades with its text.
- **M2:** 24/7 gets a dusk tint instead of full black, and no diagonal wipe across the phone.
- **M3:** fade out leftover dots (the meadow sky, the Offline headline).
- **M4:** the undo headline sits below the chapter-label band, and the balance count-up lands on the downbeat. Also fix the $3,816.21 flash at 59.5 s.
- **M5:** one consistent story clock (send at 8:41 PM, scam at 9:38 PM), and no "Mamá – Arrived" row before the send.
- **M6:** the status bar shows signal when the phone is online.
- **M7:** the claim link reads like `nest.app/c/…`.
- **M8:** the chapter label flips on the downbeat.
- **M9:** the scam reasons land on bar 26, beats 2–4.

## D. Music (Caleb's picks)

1. **Pitch:** Caleb chose **+1 semitone**. Before anything else in the chain, apply `rubberband=pitch=2^(1/12):transients=crisp`. Make it an env var `MUSIC_PITCH` (semitones, default **1**). Verify the duration is unchanged, so the beat grid stays exact. Reference: `out/music-test/D-plus1-semitone.mp3`.
2. **Soften the low "boom":**
   - Split with `acrossover=split=150:order=4th`.
   - Low band: `acompressor` threshold 0.08, ratio 4, attack 5, release 120, then −3 dB.
   - High band: high-shelf +1.5 dB at 8 kHz.
   - Recombine with `amix normalize=0`.
   - Env var `MUSIC_SOFTEN=B|C`, default B. C is: threshold 0.06, ratio 6, attack 3, release 100, −5 dB, +2 dB shelf.
3. **Check:** after these changes, re-check the voice-vs-music LU targets.
4. **Possible second song (pending Caleb's pick).**
   - Build support for `MUSIC2=<file>`: a second track that takes over at the undo release.
   - **The switch:** Santa María stays low-passed through the scam section, and track 2 starts exactly on the 65.165 downbeat, together with the undo check.
   - **Track 2 timing:**
     - Time-stretch it with rubberband to the grid tempo of 117.855 BPM, and offset it so its first downbeat lands on 65.165.
     - Expose a `MUSIC2_OFFSET` (seconds into track 2) and a `MUSIC2_BPM` (its native tempo).
   - **Mix:** a short crossfade or a hard switch on the hit, with the same duck, voice targets and end fade.
   - **If `MUSIC2` is unset:** Santa María continues as now.

## E. The ending (Caleb: "you could do way better than that weird logo animation")

- **Redesign scenes 12–13 so the brand moment is earned.** The logo forms from the film's own story elements. For example:
  - The money dot travels the Miami→Buenos Aires arc one last time.
  - Then that arc and two more sweep into the three interlocking rings of the Nest mark on the bar 40 downbeat (81.456), with a satisfying spring.
  - The wordmark masks in on the next beat.
  - On bar 41: "Protect what matters." with the positioning line "US dollars, in your own account."
- **The meadow:** drop the photographic meadow if it fights the flat style (the reviewer flagged the teal photo), or keep it only as a subtle wash.
- **End card:** a readable disclaimer (at least 24 px, held at least 3 s, on a calm background) and a URL slot that stays hidden while empty.
- **Loop:** the last frame must still match frame 0.

## Process

1. Typecheck.
2. Render stills on every downbeat and every beat 3, and look at each one.
3. Fix what's wrong, then do a second pass.
4. Do a full render.
5. Run the sync check and produce the mix report.
6. Report what changed, any line that didn't fit, and anything you couldn't do.
