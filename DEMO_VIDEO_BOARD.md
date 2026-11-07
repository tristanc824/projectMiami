# Nest demo video: director's board

Nov 7, 2026. Inspiration pulled from Caleb's Instagram saves (the three SaaS and product videos), studied frame by frame. The other saved posts (career tips, football, Tesla, prompt packs) are not about product video and were left out. Copy on screen and in voiceover will be written by Martha (see COPY_DECK.md voice rules), so the lines below are placeholders for intent only.

## 1. What the references do

### A. Jimmy (@thejimmy.vision), "Uplinq" launch, 40s ([post](https://www.instagram.com/p/DfaHvJiN5wf/))
Shown playing on a laptop in front of a green wall. Caption: a launch video should "make them understand why it matters and what makes it worth trying".
| Time | What's on screen |
|---|---|
| 0-3s | Abstract 3D glass object turning, out of focus |
| 3-6s | Typed line: "...used to be simple." |
| 6-9s | Brand reveal: "UPLINQ" wordmark on a soft green-black gradient |
| 10-14s | One line of white text over big flowing petal shapes |
| 15-19s | Real UI pieces (pills, toggles, a big button) floating in space, with a glowing ring |
| 20-29s | Product screens: a dark panel, then dashboard cards sliding in |
| 30-35s | A bold repeating circle pattern with a short benefit line |
| 36-40s | Wordmark again with a tagline under it |

### B. Nick Motion Studio, Uber Eats spec ad, 15s ([post](https://www.instagram.com/p/DeKx7yyI9vD/))
"Made entirely in After Effects. No AI." Shown on a wide monitor in a dim room.
| Time | What's on screen |
|---|---|
| 0-2s | Creator reacting, hand over mouth (the hook) |
| 2-5s | iMessage: "Brother I'm starving." Reply: "Try Uber Eats" |
| 5-8s | A search bar, cursor clicks in |
| 8-11s | System card: "Delivery requested" with a progress bar |
| 11-13s | Map with a notification: "Uber Eats, message from driver" |
| 13-15s | White screen, Uber Eats logo |

### C. Jimmy, "one video that explains your product", 33s ([post](https://www.instagram.com/p/DfDPbi4RiZU/))
OpenAI-style spec, on a laptop over a blue keyboard.
| Time | What's on screen |
|---|---|
| 0-4s | One word highlighted inside a sentence ("thoughts") |
| 5-9s | Node graph: lines branching out to labels |
| 10-13s | Logo on paper-white |
| 14-18s | Collage of cards spinning around a center |
| 19-22s | Code lines ticking green, one red |
| 23-26s | Scattered labels pulling into one word ("feedback") |
| 27-30s | Illustrated tree, branches labelled |
| 31-33s | Logo over a blue sky and a flowering meadow |

## 2. The rules they share
1. **Hook in the first 2 seconds**, before any logo: a face reacting (B), a typed line (A), one highlighted word (C).
2. **Tell the story with interface people already know.** B is entirely iMessage, a search bar, a system card and a map. No narrator explains anything.
3. **Logo early, then again at the end.** A and C show the brand by second 10 and close on it.
4. **One idea per shot, about 2-4 seconds each.** Nothing lingers; motion carries you to the next beat.
5. **Isolate real UI pieces.** Pull a button, toggle or card out of the app and float it large (A at 15s). It reads better than a full screen.
6. **Kinetic type for the one key line**, typed or highlighted word by word, never paragraphs.
7. **Few words overall.** B has under ten words on screen. Fits our "say more with less" rule.
8. **Premium motion over stock footage**: smooth easing, depth, soft gradients, one accent color.
9. **Real product pixels** where the product appears; abstraction only for mood and transitions.
10. **End on calm**: a logo on white, or on sky and flowers (C). That last frame is basically our hero.

## 3. Our direction
**Format:** 9:16 vertical for socials and the table loop, plus a 16:9 cut for the Devpost video. 45-60s. No narrator on the vertical version (captions only); a short voiceover on the 16:9 version.

**Story spine (B's method, Nest's story):** it all happens on a phone, in apps everyone knows, then Nest steps in.
1. **Hook (0-3s):** an iMessage arrives: "Mamá, it's me. New number. Send it here." (the real scam text, already in our app screens).
2. **Tension (3-7s):** her thumb hovers over a bank app; the old world (fees, "3-5 business days", "transfers are final").
3. **Turn (7-10s):** the Nest mark and the meadow, birds crossing (our hero, C's ending used as our opening breath).
4. **Product, isolated pieces (10-35s), A's method, our 14 screens:**
   - Home: one number, the dollars-vs-pesos line drawing itself.
   - Send to Mamá: "Slide to send", Face ID, "Mamá has your $250", Sunday 9:41 PM.
   - The scam: the new number in amber, "This might be a scam", hold to send anyway.
   - Undo: the 24h ring, one tap, "Undone · Money back" landing in the activity list.
5. **Proof line (35-45s):** kinetic type, one word at a time, over the meadow. Martha writes it.
6. **End (45-50s):** logo, "Protect what matters.", URL. Calm, like C.

**Look:** our earth palette (moss, sky, warm off-white), Figtree, the real app screens from `app-design/nest-app-screens.html` composited onto a phone; the meadow and birds from the website for mood shots. Soft depth of field, slow push-ins, no glow, no confetti.

**Sound:** one warm, unhurried track; a soft click on Slide to send, a low tone on the scam warning, a release on Undo.

**Honesty:** anything not live on devnet gets a small "Prototype" or "Simulated" caption (see PITCH_PLAYBOOK.md section 5).

## 4. Next steps
1. Martha writes the on-screen lines and the 16:9 voiceover for each beat above.
2. Build a storyboard of 10-12 frames as images (phone mockups from our screens, the iMessage, the meadow).
3. Decide the tool: After Effects (like A and B), or a code-based renderer (Remotion) using our real screens so edits stay in sync with the app.
