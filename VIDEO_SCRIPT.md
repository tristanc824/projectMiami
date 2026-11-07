# Nest demo video: script

Written by Martha, 2026-11-07. Follows the story spine in DEMO_VIDEO_BOARD.md section 3 and reuses the approved app and site lines in COPY_DECK.md, so the video says exactly what the product says. App strings below are copied from `app-design/nest-app-screens.html` (copy deck version).

**Stage:** cold (judges, Devpost viewers, social). **The one ask:** none spoken. The end card carries the tagline and the URL. **Numbers in the vertical captions:** two (24 hours, and the $250 the app already shows).

## Read before you shoot: 3 decisions for the team

1. **Who the scam text is pretending to be.** "Mamá, it's me. New number." is how the real "Hi Mum" scam reads, and it's sent *to a mother* (PITCH_RESEARCH: the ACCC found 2/3 of reports came from women over 55). Our phone belongs to Ana, the daughter, and the scam number in the app is Argentine (+54 9 11 5555 0142). So on Ana's phone the text only makes sense if the scammer is posing as Mamá. The script below uses the line as briefed. My recommendation is to change only the opening words to **"Ana, it's Mamá. New number. Send it here."** (hook B). Then the +54 number, the send to Mamá and the scam all tell one story. Your call.
2. **"New number" vs "New phone."** The scam check screen (A12.3) quotes "Mamá, it's me. New phone." The viewer sees the text at 0:00 and the quote at about 0:28, so they have to match word for word. Whichever hook you pick, update the screen string to the same words before recording.
3. **The undo window.** The mockup and this script say 24 hours. NEST_FEATURES.md planned 10 minutes on devnet (PITCH_PLAYBOOK section 0, item 5, still open). If the program records with a shorter window, the 24-hour ring is the design, not the build, and it gets the "Prototype" label (section 4).

---

## 1. Vertical cut (9:16, 53 s, captions only, no narrator)

All text sits inside the 9:16 safe zone (top 14%, bottom 35% and 6% each side kept clear). Figtree, sentence case. App text is the real app pixel, isolated and floated large (board rule 5), never retyped in a new style. One warm, unhurried track under everything.

| # | Time | On screen (shot) | On-screen text (exact) | Sound |
|---|---|---|---|---|
| 1 | 0:00-0:03 | Close on a phone in a hand, Miami at night, room lamp only. A message slides in from an unknown number, +54 9 11 5555 0142. Frame 0 is the phone already lit. | Mamá, it's me. New number. Send it here. | Message alert, then room tone. No music yet. |
| 2 | 0:03-0:07 | Her thumb moves to a plain, unbranded bank app (no real bank name or logo). Slow push-in on two lines of its transfer screen. The thumb hovers and doesn't press. | Arrives in a few business days / Transfers are final. | A low, flat hum. The track hasn't started. |
| 3 | 0:07-0:10 | Cut to the meadow from the website. Birds cross. The three-ring Nest mark draws itself in moss, small, upper third. | Nest | The track opens, warm and slow. |
| 4 | 0:10-0:15 | Home screen on the phone. The dollars-vs-pesos line draws itself left to right. The "Held in US dollars" chip lifts off the card and floats large. | Held in US dollars | A soft tick as the line finishes. |
| 5 | 0:15-0:24 | Three quick shots, one each: (a) Send to: a thumb taps Mamá's face, the Amount screen shows $250 with the "No fee" and "Arrives in a second" chips floated. (b) Confirm: the thumb drags "Slide to send", the Face ID glyph spins. (c) Arrived: Rosa's photo with the check, then the "When · Sunday, 9:41 PM" row floats up. | (a) No fee · Arrives in a second (b) Slide to send (c) Mamá has your $250. / Sunday, 9:41 PM | (b) A soft click on release, the Face ID tick. (c) The track lifts. Faint birds. |
| 6 | 0:24-0:27 | Back to the message thread for half a second, then the Send to screen. The +54 row glows in its amber chip and floats forward. | New · 24 hours to undo | The track thins out. |
| 7 | 0:27-0:31 | Scam check screen. The headline settles first, then the three reasons fade in one by one. "Don't send" is the dark button. | This might be a scam. | A low tone, held. |
| 8 | 0:31-0:34 | Her thumb skips "Don't send", presses "Hold to send anyway" and holds. The button fills. | Hold to send anyway | The low tone rises with the hold and cuts out on release. |
| 9 | 0:34-0:39 | Undo screen. The countdown ring turns, 23:59:12 ticking down. Slow push-in on the ring. | You have 24 hours to undo this. | Near silence. One soft pulse per second. |
| 10 | 0:39-0:43 | The thumb taps "Undo and get $500 back". Cut to Home: the "New number" row lands in Activity. Rest on it for a full second. | Undone · Money back | The release: the track comes back in full. |
| 11 | 0:43-0:48 | The meadow again, wider, birds crossing. The line types in word by word, centered. | Every dollar you send gets there. | The track carries it. No effects. |
| 12 | 0:48-0:53 | Nest mark and wordmark on the meadow sky, the tagline under it, the URL small. Held 3 s. | Protect what matters. / [TEAM: URL] | The track resolves and fades. |

Producer notes:
- Beat 2 is a made-up bank, so it can't show any real bank's name, logo or colors. "A few business days" stays vague on purpose (the board said 3-5, PITCH_RESEARCH said 1-5, and neither is sourced). [UNVERIFIED: "Transfers are final" is a general claim with no source in the repo. Keep it only if the team is comfortable that it's true of ordinary bank transfers.]
- Beat 5c: the Arrived screen's second line reads "It got there in 0.9 seconds." Show it only if 0.9 was that recording's real time (COPY_DECK flag 7). Otherwise crop to the headline and the Sunday row.
- The message app should look like a generic messages app, with no Apple logo or brand marks.

## 2. 16:9 cut with voiceover (about 68 s)

Same beats and shots, held a little longer. Human read, calm and warm, unhurried (no synthetic voice). Captions burn in the full voiceover at the bottom, so the app text above stays the hero. 138 spoken words.

| # | Time | On-screen text | Voiceover |
|---|---|---|---|
| 1 | 0:00-0:05 | Mamá, it's me. New number. Send it here. | A message says it's family, and they need money sent right away. |
| 2 | 0:05-0:10 | Arrives in a few business days / Transfers are final. | A bank can take days, and once the money is sent, it's gone. [UNVERIFIED: same as beat 2 above] |
| 3 | 0:10-0:14 | Nest | Nest is a US dollar account on your phone. |
| 4 | 0:14-0:21 | Held in US dollars, then a 2 s cut to the Save bars: In Nest $1,000 / In pesos $321 | Her savings stay in US dollars. In Argentina, $1,000 kept in pesos in 2023 was worth about $321 a year later. |
| 5 | 0:21-0:32 | No fee · Arrives in a second / Slide to send / Mamá has your $250. / Sunday, 9:41 PM | Ana sends her mom $250 with no fee. It lands in about a second, even on a Sunday night. |
| 6 | 0:32-0:36 | New · 24 hours to undo | Then she goes to pay the number from that text. |
| 7 | 0:36-0:41 | This might be a scam. | Before any money moves, Nest tells her this might be a scam, and why. |
| 8 | 0:41-0:45 | Hold to send anyway | Say she's worried and sends it anyway. |
| 9 | 0:45-0:51 | You have 24 hours to undo this. | The first payment to someone new waits 24 hours, and she can cancel it until then. |
| 10 | 0:51-0:56 | Undone · Money back | She taps Undo, and her money comes back. |
| 11 | 0:56-1:02 | Every dollar you send gets there. | Every dollar you send gets there. |
| 12 | 1:02-1:08 | Protect what matters. / [TEAM: URL] / Built on Solana at SharkByte 2026 | Protect what matters. |

Sources for every spoken fact: about a second, no fee, 24 hours to undo for the first payment to someone new (APP_HANDOFF.md features and honest limits). $1,000 vs $321, Argentina 2023 (APP_HANDOFF.md, INDEC 211.4% via ECONOMIC_PROBLEMS.md). "US dollar account on your phone" (COPY_DECK W2).

## 3. The hook: 3 options for the first 3 seconds

| | Pattern | Frame 0 to 0:03 | Text |
|---|---|---|---|
| **A (as briefed, in the script)** | The real scam text | Lit phone in a hand at night, the message slides in from the +54 number. | Mamá, it's me. New number. Send it here. |
| **B (my pick if you accept decision 1)** | The real scam text, told from Ana's side | Same shot. The contact name is just the number, so the viewer reads "Mamá" and believes it for a second, the way Ana would. | Ana, it's Mamá. New number. Send it here. |
| **C** | The answer first | Open on the undo ring already turning, 23:59:12. Hold 2 s, then a fast rewind blur back to the message arriving, and the story plays from beat 1. | You have 24 hours to undo this. |

**Chosen: A** for this cut, because the brief asks for it. If the team agrees with decision 1, swap in B. The shot, timing and sound stay the same, and only the first three words change. Keep C for a second social cut and compare stop rate (3-second plays) on the two.

## 4. Honesty captions

One small pill that reads **Prototype** (or **Simulated** or **Example rate**). Figtree 500, ink-400 on light screens and white at 70% on dark ones.
- **9:16:** top right, just under the top 14% line, inset 6% from the edge. It stays on screen for the whole run of app shots so it never flashes.
- **16:9:** bottom right corner, above the voiceover captions.

[TEAM] Fill in what's live from the PITCH_PLAYBOOK section 5 table first, then drop every label that the build makes true.

| Beat | What's shown | Label unless it's live on devnet |
|---|---|---|
| 4 | Home balance, the pesos line and the ≈ ARS 4.15M chip | **Example rate** on the peso values. Pyth has no ARS feed, so it stays even if everything else is live. |
| 4 (16:9) | Save bars, $1,000 vs $321 | None. It's a sourced 2023 comparison. Keep the "(INDEC)" note on screen readable for 1 s. |
| 5a | Amount, ≈ ARS 242,500, "No fee" | **Example rate** on the ARS line. **Prototype** if the sponsored-fee send isn't live. |
| 5b | Slide to send, Face ID | **Prototype** unless passkey sign-in is live (Auth0 or Privy, only the one actually used). |
| 5c | Arrived, "0.9 seconds", Sunday 9:41 PM | **Prototype** if the screen is static. Show "0.9" only if it was measured on that send. |
| 6-8 | Amber new-number row, scam check, hold to send | **Prototype** unless the scam check runs (Gemini or rules) on the real send. |
| 9-10 | Undo ring, Undo, "Undone · Money back" | **Prototype** unless the escrow cancel is live, **and** whenever the recorded window isn't 24 hours (decision 3). |
| 12 (16:9) | End card | One line under the logo: "Demo runs on Solana devnet with test USDC. Ana and Rosa are an illustrative story." |
| any | Cash-out to pesos, Add money | Not shown in this cut. If you add either, label it **Simulated**. |

Beats 1, 2, 3 and 11 need no label. Beat 1 is a re-creation of a known scam pattern, and beat 2 is a made-up bank (no real branding).

---

## Quality gate (run on the final text)

- **Voice rules (COPY_DECK):** none of the new lines uses an "X. Y." fragment pair, an "isn't X, it's Y", a pun, a cute reversal, an em or en dash, a semicolon, an exclamation mark or ALL CAPS. The two fragment-shaped strings are diegetic: the scammer's message (beat 1) and the app's status rows ("New · 24 hours to undo", "Undone · Money back"), which are approved app copy. "Protect what matters." is unchanged.
- **Reused, not new:** every vertical caption except beat 2's bank strings is an approved app or site line (A4.2, A9.2-3, A10 slide, A11.1, A11.3, A8.6, A12.1, A12.6, A13.1, A4.10, M4, H1). Beat 11's proof line is M4.
- **Length:** vertical 53 s, 12 beats, every caption 7 words or fewer except the diegetic scam text (8). 16:9 runs 68 s with 138 voiceover words (counted), about 2 words per second, so it can breathe. Every spoken sentence is under 20 words.
- **Facts:** each one traces to APP_HANDOFF.md, COPY_DECK.md or ECONOMIC_PROBLEMS.md. Two lines are marked [UNVERIFIED] (bank transfers being final, in both cuts), and the URL is left as [TEAM]. "0.9 seconds" and the 24-hour window are conditional on the build (decision 3, beat 5c note).
- **Video rules (VIDEO-SCRIPTS.md):** the real problem is on screen at frame 0 (V1, V2). The product shows from 0:10 and the logo stays small, appearing early and again at the end (V12). The picture changes every 3-5 s (V9). The relief moment is the undo (V9). Captions carry the vertical on mute (V4). No invented people or results presented as real, and the end card says the story is illustrative (V17). Human voiceover only (V6).
- **Honest limits kept:** undo covers the first payment to someone new, said in the voiceover. No interest, no "inflation-proof", no "unfreezable", no claim that the payment is reversed.
