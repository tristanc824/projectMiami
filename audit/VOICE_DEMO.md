# Voice demo — November 8, 2026

Implemented native/browser speech recognition, spoken draft readback, editable transcripts, unique saved-contact matching, typed fallback and links from Home/Send. Voice prepares a payment draft and retains the existing payment review, PIN/biometric approval and unfamiliar-recipient safety check. It does not authorize or broadcast a payment itself. Original spoken context reaches the safety review, including urgency or instructions not to verify a recipient.

Use English: “Send one dollar to [a unique saved contact name]”, or “Send one dollar” then enter the phone number. Review the visible amount and recipient before approving. Turn off iPhone silent mode for readback. No new API key is required.

Checks: 43 mobile unit tests, TypeScript and lint passed. All five final browser tests passed: recognition events, cancellation, ambiguous amounts, recipient mismatch and denied recognition with typed fallback. The fixed review footer was visually checked at phone size. The event test simulates the browser recognizer; it is not proof of an acoustic test through a physical microphone.

The iOS simulator build succeeded with both native speech pods, the app launched, and the iOS JavaScript export passed. The production website build passed. The connected-iPhone Debug build also succeeded using the existing Apple development team; the app installed successfully on the connected iPhone 15 Pro and launched against the existing LAN Metro server on port 8081. Existing app data was retained; no uninstall was performed. A refreshed binary is required for native speech recognition. Safe Hold deployment and a real devnet refund are now verified; contact-only recovery is still unavailable.

## Spanish and Expo connection follow-up

English and Spanish are now selectable before recording, with matching recognition/readback locales (`en-US`, `es-MX`), Spanish dollar words and decimal commas, accented contact matching, and cancellation checks. All 45 unit tests and six browser voice tests passed; lint/typecheck and production website build passed. No additional native rebuild was required. The disconnected Expo listener was restarted in normal live mode at the same LAN address and the connected phone was relaunched. Keep the phone and laptop on the same Wi-Fi and the Expo/API processes running for this development build.
