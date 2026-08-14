# Mission: Build Token

## Why
Build and ship **Token** — a privacy-first mobile app for the Indian market where
users issue revocable capability tokens instead of sharing phone numbers or emails.
Deny-by-default: nobody contacts the user unless the user issued them a token.

A holder redeems a token at `tokn.app/t/CODE` and communicates through that page.
They never learn the user's phone number, email, or identity. The user can set
rules, pause, or revoke at any time.

## Success looks like
- A running backend: Postgres schema, Node API, auth, WebSocket chat
- A React Native app that issues, lists, revokes and pauses tokens
- A redemption web page a stranger can open and message through
- Voice and video over WebRTC with self-hosted signalling
- Deployed on a Coolify VPS with automatic TLS
- Published to both the Play Store and the App Store
- Real users

## Constraints
- Learning solo, at own pace, from a beginner starting point
- **Everything must be open source.** Rented hardware is fine; paid SDKs are not
- Both iOS and Android — never Android-only shortcuts
- Mobile: React Native + Expo, EAS Build (required for WebRTC native modules)
- Backend: Node + TypeScript + PostgreSQL, raw SQL first so the query layer stays visible
- Redemption page: Vite + React, a plain web app — NOT React Native Web

## Out of scope
- **Firebase**, in all its forms — Auth, Firestore, Storage, Functions
- **Third-party comms SDKs** — no Agora, no Twilio, no Exotel, no Stream
- **Prisma** — it hides the SQL, and learning SQL is a goal here
- **PSTN voice** — needs a DoT telecom licence
- **Email** and **payment gateways** — deferred
- Advanced algorithms or computer science theory

---

*This project began as a WhatsApp clone on Firebase and pivoted to Token with a
self-hosted backend. See `TOKEN-BRIEF.md` for the product brief, `TOKEN-TRACK.md`
for the lesson plan, and `CLAUDE.md` for the architecture decisions that are
settled and not to be revisited.*
