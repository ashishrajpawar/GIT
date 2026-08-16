# Mission: Build Token

*Why this is being learned. The `teach` skill grounds its lessons in this file —
so it holds the motivation and the finish line, and deliberately not the
product spec, the stack, or the out-of-scope list. `CLAUDE.md` owns those.*

## Why

Build and ship **Token** — a privacy-first mobile app for the Indian market
where users issue revocable capability tokens instead of sharing phone numbers
or emails. Deny-by-default: nobody contacts the user unless the user issued
them a token.

A holder redeems a token at `tokn.app/t/CODE` and communicates through that
page. They never learn the user's phone number, email, or identity. The user
can set rules, pause, or revoke at any time.

The point of learning any of this is the product at the end of it. **Tie every
concept to Token concretely** — an explanation that could be about anything is
an explanation that will not stick.

## Success looks like

- A running backend: Postgres schema, Node API, auth, WebSocket chat
- A React Native app that issues, lists, revokes and pauses tokens
- A redemption web page a stranger can open and message through
- Voice and video over WebRTC with self-hosted signalling
- Deployed on a Coolify VPS with automatic TLS
- Published to both the Play Store and the App Store
- **Real users**

## Constraints on the learning itself

- Solo, at own pace, from a beginner starting point — not a working programmer
- Wants **deep understanding, not vibe coding**. Explain why, not just what
- Short lessons that end with something working beat thorough theory
- **Everything must be open source.** Rented hardware is fine; paid SDKs are not

---

*This project began as a WhatsApp clone on Firebase and pivoted to Token with a
self-hosted backend. `CLAUDE.md` has the architecture decisions that are settled
and not to be revisited, and the technologies that are out of scope.
`TOKEN-TRACK.md` has the lesson plan.*
