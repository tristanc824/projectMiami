# Send with your voice

Nov 7, 2026. UI by Caleb's side (screens 17–21 in `app-design/nest-app-screens.html`; images in `app-design/pages/17-…21-…`). Backend by Tristan, using the Swarms API for the language part. This doc is the contract between the two halves, so they fit together. Final on-screen copy comes from Martha (see section 5).

## 1. What the user does

1. On **Home**, a small moss circle with the Nest mark sits above the tab bar, bottom right (screen 17). The first time, a one-line tip points to it.
2. Tap it. It grows into a small listening pop-up: the rings move with the voice, and the words appear live (screen 18). Tap ✕ to stop.
3. When she stops talking (about 1 s of silence, or she taps the orb), Nest works out the request.
4. Nest reads it back on a compact **confirm card**: who, how much, fee, arrival time, and whether undo applies (screen 19).
5. She approves with the **phone's unlock**: Face ID if it has it, otherwise fingerprint, otherwise PIN. The button says which.
6. Then it's a normal send: the same Arrived screen, the same activity row.

When something is missing or unclear:
- **Two people match a name:** ask "Which Daniela?" and list both with the last 4 digits of their phone and the last payment (screen 20). Never guess.
- **Missing amount or person:** ask for just that one thing, and keep listening.
- **Nothing understood:** "I didn't catch that." with an example and Try again (screen 21).

## 2. Safety rules (non-negotiable)

- **Voice alone never moves money.** Every voice send ends at the confirm card plus the phone's unlock.
- **A first payment to someone new** still goes through the **scam check** (screen 12) and the **24-hour undo hold** (screen 13), exactly like a typed send.
- **Lock Nest on** means the orb is disabled and greyed out, with "Nest is locked" on tap.
- **Read the amount back in digits and words on the card** ($250.00) so a misheard "fifteen / fifty" is caught.
- **Limits (proposal):**
  - Voice sends above $1,000, or above the user's daily voice limit, open the normal Amount screen instead of the card.
  - Max 3 voice attempts a minute.
- **The backend only returns a draft.** It never calls the payment endpoint itself.
- **Security screen:** a row with a toggle, "Send with your voice", on by default. Turning it off hides the orb.

## 3. The contract (app ⇄ backend)

**Speech to text** happens on the phone (iOS `SFSpeechRecognizer`, Android `SpeechRecognizer`), with on-device recognition where available. Benefits:
- The live words in screen 18 are instant.
- No audio leaves the phone.
- It works in English and Spanish ("Mandale 250 a mamá").

**The backend receives text, not audio.**

### `POST /voice/intent`

Request:
```json
{
  "transcript": "send two hundred fifty dollars to mama",
  "locale": "en-US",
  "user_id": "usr_123"
}
```

The server looks up the user's contacts itself; the app doesn't send the address book. Response:

```json
{
  "draft_id": "vd_8f2c",
  "intent": "send",
  "amount": { "value": "250.00", "currency": "USD" },
  "recipient": {
    "status": "matched",
    "contact_id": "ct_mama",
    "display_name": "Mamá",
    "is_new": false,
    "candidates": []
  },
  "readback": "Send $250 to Mamá?",
  "clarify": null,
  "confidence": 0.94,
  "expires_at": "2026-11-08T14:05:00Z"
}
```

Field rules:

| Field | Values | Notes |
|---|---|---|
| `intent` | `send` / `request` / `unknown` | Only `send` is built for now; `request` is a later feature. `unknown` → screen 21. |
| `amount.value` | string decimal, or `null` | `null` → clarify `missing_amount`. |
| `recipient.status` | `matched` / `ambiguous` / `not_found` | `ambiguous` → `candidates` (max 3: `contact_id`, `display_name`, `phone_last4`, `last_paid_at`) → screen 20. |
| `recipient.is_new` | bool | `true` → after the unlock, route to the scam check before sending. |
| `clarify` | `null` or `{ "type": "which_recipient" \| "missing_amount" \| "missing_recipient", "question": "Which Daniela?" }` | The app shows the question and keeps listening. Send the next transcript with `"draft_id"` so the server fills the gap. |
| `confidence` | 0–1 | Below 0.6 → treat as `unknown`. |
| `expires_at` | ISO time | The draft is only good for about 2 minutes. |

### `POST /voice/confirm`
```json
{ "draft_id": "vd_8f2c", "contact_id": "ct_mama", "amount": "250.00" }
```
The app sends this **only after** the phone's unlock succeeds. The server re-checks the draft (not expired, same amount and person, limits). It then creates the normal payment through the existing send path, which also runs the scam check and the undo hold, and returns the normal payment object. The app then shows Arrived.

### Swarms (Tristan)

One agent, or a small swarm, turns the transcript plus the user's contacts into the JSON above:
- Parse the amount (words or digits, any currency word → USD unless said otherwise).
- Fuzzy-match the name against contacts, including nicknames (Mamá, mom, mami).
- Detect the intent.
- Write the read-back sentence.

Ask it for **strict JSON** (schema above) and validate it on the server. If validation fails, return `intent: "unknown"`. Keep money logic (limits, is_new, payments) in our own server code, not in the model.

## 4. States to build

| State | Screen | Notes |
|---|---|---|
| Idle orb | 17 | 60 px circle, moss, white mark, right 20 / bottom 104 (above the tab bar). Tip once. |
| Listening | 18 | Scrim over Home. Pop-up card with live words, the big orb (88 px) whose 3 rings scale with the mic level, ✕ to cancel. |
| Thinking | (18 with a 3-dot loader in the card) | Under 1 s target. |
| Confirm | 19 | The card: avatar, the read-back, fee/arrival/undo rows, unlock button, "Change it" (opens the normal Amount screen pre-filled). |
| Which one | 20 | Up to 3 options. Tap one → confirm. |
| Missed | 21 | Try again restarts listening. |
| Mic permission | (system sheet, after our one-line reason) | Only on the first tap. |
| Locked | (orb greyed) | When Lock Nest is on. |

## 5. Copy

Martha is writing the final strings: the tip, listening and thinking lines, the confirm button for each unlock method, the clarify questions, the miss, mic permission, and the Security row. The screens use draft strings until then.
