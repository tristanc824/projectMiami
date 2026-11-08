# Nest film: production bible

Nov 7, 2026. These are the rules for making every shot in the Nest film, based on two research passes: one on how premium launch films are made, one on the AI models that look most real right now. The story and beats are in the film breakdown (13 beats: a quiet story with a feature tour inside it, no voiceover). Every word on screen comes from Martha.

**The bar:** a stranger watching on a phone should never think "AI". If a shot can't pass that, it's cut or replaced. No shot is too good to cut.

---

## 1. Where each kind of shot comes from

| Kind of shot | Source | Why |
|---|---|---|
| App screens | **Our real screens** (`app-design/nest-app-screens.html`), captured at 3x and animated in Remotion | Apple, Linear and Mercury all use replaced screens and real UI. Never generate a screen. |
| The phone as an object | A 3D phone frame in Remotion with our screen inside (Rotato as a fallback) | Premium films render the device and composite the UI. |
| People and places (Ana in Miami, Rosa in Buenos Aires, the garage) | **AI, but only the shot types in section 3.** Licensed stock as the fallback. | The research found no AI people in premium launch films, and AI people are the biggest risk of looking cheap. We use AI only where it's hardest to detect. |
| Meadow and birds | The meadow photo from the website, plus AI-generated sky and bird motion (low risk) | Nature hides AI artifacts well. |
| Type and the mark | Remotion, Figtree, brand tokens | |
| Sound | ElevenLabs music (track A) plus a custom tap and confirm sound set and real ambient recordings | Silent or AI-generated sound gives a shot away. |

## 2. Models (all on Higgsfield)

| Job | First choice | Fallback | Notes |
|---|---|---|---|
| Still keyframes of people | **GPT Image 2.6** (#1 on Artificial Analysis), quality `max`, 2k | Seedream 5.0 Pro (best skin and hair strands) | Make the perfect still first, then animate it. |
| Keeping faces the same | **Soul ID** (Soul 2.0), one for Ana and one for Rosa | Reuse the same keyframe as the reference | Build a character sheet before any shot. |
| Image to video | **Seedance 2.5** (#1 on Artificial Analysis image-to-video), 1080p, high bitrate | **Kling 4.0** at 1080p | Seedance needs Higgsfield's Plus plan and sometimes blocks very photoreal faces. Kling 4.0 is the fallback. |
| Upscale | **Topaz Starlight** (keeps faces true) | Bytedance upscale `pro` with the `aigc` preset | Never use the "creative" upscalers on faces. |
| Not used | Veo 3.1 (#23, faces too "polished"), Sora (shut down Sep 2026) | | |

## 3. Shots AI may and may not make

**Allowed:** wide or medium shots. Backlit or side-lit, with the face partly turned or soft. Slow, simple action like turning, looking, smiling or breathing. One camera move. Clips of 2–3 seconds, using the cleanest part.

**Never:**
- a readable phone screen (show it from behind, face-down or as glow only)
- typing or fine finger work
- money, cards or signatures
- text or signs
- crowds, or two people touching
- talking to the camera
- mirrors
- fast action
- tight close-ups of faces or hands

## 4. Prompt templates

Follow each model's official guide:
- **GPT Image:** scene, then subject, then details, then constraints. Ask for real texture and say "no retouching."
- **Seedance:** label the shot, then camera move, then action, then setting change, then sound in angle brackets, then constraints. One camera move only.
- 40–120 words. Use no empty words like "beautiful" or "cinematic."

**Ana keyframe (GPT Image 2.6):**
> Photorealistic candid photograph, Brickell Bay Drive, Miami, golden hour. A woman in her early 30s, light-brown skin, natural curly hair tied loosely, linen shirt, leaning on a waterfront railing and looking down at a phone held low, screen angled away from camera. Shot like a 35mm film photograph, 50mm lens, eye level, shallow depth of field, warm low sun as backlight, palms and bay softly out of focus. Real skin texture, fine flyaway hairs. Honest and unposed. No glamorization, no heavy retouching, no readable text or logos.

**Ana motion (Seedance 2.5):**
> @Image 1 is the first frame and the woman's identity. Shot 1: Locked-off medium shot with a slow push-in. She glances down at her phone, a small exhale, then lifts her eyes to the water as a breeze moves her hair. Warm backlight flickers through palm fronds. Naturalistic documentary style, 35mm film texture. &lt;soft bay water, distant traffic, palm rustle&gt; No subtitles, no on-screen text, no logos, phone screen never visible.

**Rosa keyframe (GPT Image 2.6):**
> Photorealistic candid photograph, a Palermo apartment in Buenos Aires, morning. A woman in her mid-60s, silver hair in a low bun, reading glasses on a chain, cardigan, sitting by tall French balcony doors with iron railings. A phone rests face-down on a wooden table beside a mate gourd. 35mm lens, soft window light, worn parquet floor, plants on the balcony. Real wrinkles and age spots. No retouching, no readable text.

**Rosa motion (Seedance 2.5):**
> @Image 1 is the first frame and the mother's identity. Shot 1: Fixed medium shot, slight handheld drift. The phone buzzes on the table; she turns it over, reads, and a warm smile spreads. Curtains stir in window light. Naturalistic documentary style, subtle film grain. &lt;phone vibration on wood, faint street sounds through the balcony&gt; No subtitles, no logos, no on-screen text, phone screen faces away from camera.

Write the garage, clock, call and split-screen shots the same way. Each gets 4–8 takes. Keep the best take. Log every prompt and seed in `video/shots/LOG.md`.

## 5. App motion rules (Remotion)

1. One motion at a time. Every key state (a balance, an arrival, the undo) holds still for at least 1 second.
2. App elements: ease-out or a zero-bounce spring, 200–300 ms. Camera moves: 600–900 ms on an emphasized-decelerate curve, `cubic-bezier(0.05, 0.7, 0.1, 1)`. Never linear drift.
3. The camera does every transition. Screens bleed off the frame and don't float as cards.
4. Taps are a soft 44pt ripple in moss. No animated hands on app shots.
5. The phone gets a slight depth blur at its edges, a faint moving reflection, and a touch of lens distortion and color fringing. The app itself stays pixel-sharp.
6. Every moving shot uses `CameraMotionBlur` with a 180° shutter and 5–8 samples.
7. Type: Figtree, 2–4 words per card, no faster than about 2 words a second. The hold starts once the type stops moving. On vertical, keep text out of the top 14% and bottom 35%.
8. No Face ID anywhere. Payments are approved with "fingerprint or PIN," because most of our users are on Android.

## 6. Finishing

- **Frame rate: 24 fps for the whole film,** since the AI clips are 24 fps natively and converting them would judder. The build agent's 30 fps timeline moves to 24.
- **Order:** generate, then upscale (Topaz Starlight), then one shared grade across every shot (DaVinci Resolve, saturation down 10–15%, warm highlights, lifted blacks to match the page color), then grain last as one layer at about 15%. Grain also stops banding on the off-white and sky.
- Never interpolate to 60 fps. If a clip shows artifacts, slow it to 0.75x or punch in 10–20%.
- **Sound:** throw away all AI-generated audio. Use the music plus real ambient sound plus our tap set. Mix to −14 LUFS with a −1 dBTP peak. The film has to make sense on mute.
- **Export:** H.264, BT.709, CRF 16–18.
  - YouTube: 1080p at about 16 Mbps, or 4K.
  - Reels: 1080×1920 at about 10 Mbps.
  - X: 1080p at about 10 Mbps.

## 7. Honesty

- The end card says the demo runs on Solana devnet with test USDC.
- The end card also says: "Ana and Rosa are an illustrative story. People shown are AI-generated."
- Since June 2026, New York requires a disclosure when an ad uses AI-generated performers, so this line keeps us safe if the film is ever used as an ad.
- The Prototype and Example rate labels follow VIDEO_SCRIPT.md section 4.

## 8. Quality check for every shot

A shot is cut if any answer is yes:
- Do the hands, teeth, eyes or hair change from frame to frame?
- Does the background change between cuts?
- Is any text or sign readable?
- Does the skin look waxy, or the grass and skin oversaturated?
- Does the camera float with no small shake?
- Does anyone have a fixed stare?
- Would a friend who hasn't seen it say "AI" within 3 seconds?

Before final, three people who haven't seen the film watch it on a phone with no context, and we note where they flinch.

## Sources

The research behind this file: Artificial Analysis video and image leaderboards; OpenAI's GPT Image prompting cookbook; Google's Veo 3.1 prompting guide; Runway's Seedance guide; Kling's motion prompt guide; the Mercury and Robinhood motion job and case-study pages; Linear-style Remotion pipeline (getlago.com); Emil Kowalski on UI animation; Apple's WWDC23 springs talk and App Preview rules; Remotion's motion-blur and encoding docs; YouTube's upload encoding specs; Google ABCD ad research; McDonald's NL and Coca-Cola AI ad backlash coverage; New York's synthetic performer law (Cooley, Jan 2026).
