# Teacher Notes

## The student
- Ashish. **4 lessons of 95 as of 2026-08-15** — `01/0001` through `01/0004`,
  next is `01/0005-loops`. This file claimed Modules 01 and 02 were complete
  until 2026-08-15; they are written, not studied. Ask, don't infer
- Not an experienced programmer — but wants **deep understanding, not vibe coding**.
  Explain why, not just what
- Strongly motivated by the end goal — tie every concept to Token concretely
- Short lessons that end with something working beat thorough theory

## How the course runs
- **Exercise before solution.** State what to build, let the attempt happen, then
  reveal the worked solution. Never hand over complete code up front
- **One module at a time.** Do not generate ahead. The student confirms it runs
  before the next module is written
- **The repo is the output; the lessons are scaffolding.** Every lesson's code
  belongs in the Token repo, committed — not left standalone in a lesson file
- No gamification — no badges, streaks, XP, points, or mascots

## Stack decisions (settled)
- Mobile: React Native + Expo, EAS Build, TypeScript, SQLite for local cache
- Redemption page: Vite + React — a plain web app, NOT React Native Web
- Backend: Node + TypeScript, PostgreSQL, raw SQL via the `pg` driver, Drizzle later
- Chat: WebSocket on our own server
- Voice/video: WebRTC (`react-native-webrtc` on mobile, native APIs in browser)
- Signalling: our own WebSocket server. STUN: Google (free). TURN: self-hosted coturn
- Push: FCM + APNs via Expo Notifications — the only third-party dependency
- Deploy: Coolify on a VPS, `api/` and `web/` as containers, automatic TLS

## Do not suggest
Firebase (any part), Agora/Twilio/Exotel/Stream or any comms SDK, Prisma,
PSTN voice, email relay, payment gateways.

## Platform differences — always cover both
- `KeyboardAvoidingView`: `'padding'` on iOS, `'height'` on Android
- Shadows: `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` on iOS,
  `elevation` on Android
- Incoming calls: CallKit + VoIP push on iOS, FCM + foreground service on Android
- iOS publishing needs an Apple Developer account ($99/year)

## The product rule worth repeating
A token must **never** travel over a channel that already identifies the user.
Valid paths: request-a-token reverse flow, QR code, typed into a form field,
spoken or printed. The app should warn when sharing via an identifying channel.

## Gotcha that has bitten twice
Never write a literal `</script>` inside a quiz string — escape it as `<\/script>`.
The HTML parser ends the `<script>` element there regardless of JS string context,
so the quiz silently renders as nothing. Both incidents were XSS-safety lessons,
where the sequence appears naturally in prose.

---

*Superseded by `CLAUDE.md` where the two disagree — that file is the operative
orientation. This one is background.*
