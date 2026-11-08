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
- **Nothing understood:** "Sorry, we didn't catch that." with an example and "Say it again" (screen 21).

## 2. Safety rules (non-negotiable)

- **Voice alone never moves money.** Every voice send ends at the confirm card plus the phone's unlock.
- **A first payment to someone new** still goes through the **scam check** (screen 12) and the **24-hour undo hold** (screen 13), exactly like a typed send.
- **Lock Nest on** means the orb is disabled and greyed out, with "Nest is locked" on tap.
- **Read the amount back in digits and words on the card** ($250.00) so a misheard "fifteen / fifty" is caught.
- **Limits (proposal):**
  - Voice sends above $1,000, or above the user's daily voice limit, open the normal Amount screen instead of the card.
  - Max 3 voice attempts a minute.
- **The backend only returns a draft.** It never calls the payment endpoint itself.
- **Security screen:** a row with a toggle, "Send by voice", on by default. Turning it off hides the orb.

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
| `clarify` | `null` or `{ "type": "which_recipient" \| "missing_amount" \| "missing_recipient" \| "currency", "question": "Which Daniela?" }` | The app shows the question and keeps listening. Send the next transcript with `"draft_id"` so the server fills the gap. |
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

## 5. Copy (final, by Martha)

| ID | Where | String |
|---|---|---|
| V1.1 | Orb, screen reader label | Send money by voice |
| V1.2 | Orb, screen reader hint | Starts listening. |
| V1.3 | First-time tip | Tap to send money by voice |
| V2.1 | Listening status | Listening |
| V2.2 | Listening hint (live words replace it) | Say something like “Send $250 to Mamá” |
| V3.1 | Thinking | One moment |
| V4.1 | Confirm title (always with cents) | Send $250.00 to Mamá |
| V4.2–4 | Approve button | Send with Face ID / Send with your fingerprint / Send with your PIN |
| V4.5 | Change | Change it |
| V4.6 | Cancel | Cancel |
| V4.7 | Reassurance | Nothing is sent until you approve it. |
| V5.1 | Two matches | Which Daniela? (if the names differ, e.g. Daniel and Daniela: “Who did you mean?”) |
| V5.2 | Row, paid before | Daniela / Last paid $40 · In October |
| V5.3 | Row, never paid | Daniela / Phone ending in 3381 · New (“New” in amber) |
| V6.1 | Missing amount | How much do you want to send to Mamá? |
| V7.1 | Didn't catch it | Sorry, we didn't catch that. |
| V7.2 | Retry button | Say it again |
| V8.1 | Sent (only once the money has arrived) | Mamá has your $250. |
| V9.1 | Mic permission, title | Let Nest use your microphone |
| V9.2 | Mic permission, reason (also the iOS purpose string) | Nest only listens after you tap the circle, to hear who you want to pay. |
| V9.3 | Mic permission, button | Continue |
| V10.1 | Security row | Send by voice |
| V10.2–4 | Security sub-line | Every send still needs Face ID / your fingerprint / your PIN |

Notes:
- **Sends to someone new** end on the Undo screen ("You have 24 hours to undo this."), not V8.1, because the money is on hold. **Sends by text message** end on "Your $250 is on its way to Mamá."
- **Unlock names on Android:** use "face unlock", "fingerprint" or "screen lock" (which covers PIN, pattern and password). On iPhone the PIN is the "passcode".
- **Languages: English and Spanish** (decided Nov 7). See section 6.

## 6. English and Spanish

- **Speech to text:** run the phone's recognizer in the language the user sets in Nest (default: phone language). If it's English or Spanish, also allow the other one: iOS `SFSpeechRecognizer` takes one locale per request, so start with the user's language and, on a low-confidence result, retry with the other. Android `SpeechRecognizer` accepts `EXTRA_LANGUAGE` plus `EXTRA_LANGUAGE_PREFERENCE`. Supported: `en-US`, `es-419` (Latin American), `es-AR`.
- **`POST /voice/intent`** gets `"locale"` (e.g. `"es-AR"`). The Swarms agent must handle both languages and return `readback` and `clarify.question` **in the same language the user spoke**.
- **Spanish phrasings to parse** (Martha is writing the full test list): "mandale 250 a mamá", "pasale 250 dólares a mamá", "transferile 250 a mamá", "enviá 250 a mamá", "envía 250 dólares a mi mamá". Nicknames: mamá, mami, mamita, ma, vieja.
- **Currency:** Nest sends US dollars. If the user says pesos or another local currency, don't convert silently: return `clarify.type = "currency"` with a question like "¿En dólares?" / "In dollars?".
- **Numbers:** handle "doscientos cincuenta", "250", "dos cincuenta" (ask if ambiguous), and "mil" / "un palo" slang → treat slang amounts as ambiguous and ask.
- **UI strings:** every voice string gets a Spanish version (table coming from Martha). The confirm title stays in the user's language: "Enviar $250.00 a Mamá".

## 7. Spanish copy (by Martha)

Neutral Latin American Spanish (tú) by default. Rioplatense (vos) only where the words change: use it when the locale is `es-AR` or `es-UY`.

| ID | Spanish (neutral) | Rioplatense (vos) |
|---|---|---|
| V1.1 | Enviar dinero con la voz | |
| V1.2 | Empieza a escuchar. | |
| V1.3 | Toca para enviar dinero con la voz | Tocá para enviar dinero con la voz |
| V2.1 | Escuchando | |
| V2.2 | Di algo como “Envíale $250 a Mamá” | Decí algo como “Mandale $250 a Mamá” |
| V3.1 | Un momento | |
| V4.1 | Enviar $250.00 a Mamá | |
| V4.2 | Enviar con Face ID | |
| V4.3 | Enviar con tu huella | |
| V4.4 | Enviar con tu código (Android: Enviar con tu PIN) | |
| V4.5 | Cambiarlo | |
| V4.6 | Cancelar | |
| V4.7 | No se envía nada hasta que lo apruebes. | |
| V5.1 | ¿Cuál Daniela? | |
| V5.1b | ¿A quién te refieres? | ¿A quién te referís? |
| V5.2 | Daniela / Último pago $40 · En octubre | |
| V5.3 | Daniela / Teléfono terminado en 3381 · Nuevo contacto | |
| V6.1 | ¿Cuánto le quieres enviar a Mamá? | ¿Cuánto le querés enviar a Mamá? |
| V6.2 (missing person) | ¿A quién le quieres enviar $250? | ¿A quién le querés enviar $250? |
| V6.3 (said pesos) | Nest envía dólares. ¿Cuántos dólares le quieres enviar a Mamá? (short: ¿En dólares?) | Nest envía dólares. ¿Cuántos dólares le querés enviar a Mamá? |
| V7.1 | Perdón, no entendimos bien. | |
| V7.2 | Dilo de nuevo | Decilo de nuevo |
| V8.1 | Mamá ya tiene tus $250. | |
| V9.1 | Permite que Nest use tu micrófono | Permití que Nest use tu micrófono |
| V9.2 | Nest solo escucha después de que tocas el círculo, para saber a quién le quieres pagar. | Nest solo escucha después de que tocás el círculo, para saber a quién le querés pagar. |
| V9.3 | Continuar | |
| V10.1 | Enviar con la voz | |
| V10.2–4 | Cada envío sigue pidiendo Face ID / tu huella / tu código | |
| readback | ¿Enviar $250 a Mamá? | |
| Undo end | Tienes 24 horas para deshacer esto. | Tenés 24 horas para deshacer esto. |
| Text end | Tus $250 van en camino a Mamá. | |
| Locked | Nest está bloqueado | |

English for the missing-person question (new): "Who do you want to send $250 to?"

**Parser test phrases:**
- Mandale 250 a mamá
- Pasale 250 dólares a mamá
- Transferile doscientos cincuenta a mamá
- Envíale doscientos cincuenta dólares a mi mamá
- Quiero mandarle 250 a mami
- Mándale 250 a mi mamá
- Hazle una transferencia de 250 a mamá
- Mandale 250 a mi vieja (→ Mamá)
- Mandale 250 verdes a mamá (verdes = dollars)
- Mandale dos lucas a mamá (→ the pesos question)

**Parser rules:**
- Speech-to-text drops accents: treat mandale = mándale and pasale = pásale.
- Strip "mi" before names: "a mi mamá" → Mamá.
- pesos / mangos / lucas / palos → the pesos question (V6.3).
- dólares / verdes / USD → dollars.

**Open decision (Caleb): "$" or "US$" in Spanish.** In Argentina, Mexico, Colombia, Chile and Uruguay, "$" means pesos. Martha recommends **US$250.00** in every Spanish money string, at least on the confirm card and the readback, because that card is where a misheard amount gets caught. Locale number formats differ too (AR: 250,00; MX: 250.00). An Argentine speaker should proofread the vos column.
