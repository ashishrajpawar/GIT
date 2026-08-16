# Token — Resources

All open source or free to read. No paid SDKs, no commercial licences.

*Read by the `teach` skill to ground lessons in real sources rather than
recalled knowledge. Lessons cite from here. `CLAUDE.md` owns what is in
and out of scope — nothing Firebase, Agora, Twilio or Prisma belongs below.*

## JavaScript & TypeScript

- [The Modern JavaScript Tutorial (javascript.info)](https://javascript.info)
  The single best free resource for learning JS from scratch. Thorough, well
  organised, beginner-friendly. Use for: any JS concept lesson.

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
  Official, and readable. Use for: Module A2, and whenever a type error is opaque.

- [freeCodeCamp: JavaScript Algorithms and Data Structures](https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/)
  Free, interactive. Use for: extra practice and self-testing.

## Mobile client

- [React Native Docs](https://reactnative.dev/docs/getting-started)
  Primary source for components and APIs. Use for: every React Native lesson.

- [Expo Documentation](https://docs.expo.dev)
  Setup, EAS Build, camera, notifications, linking. Use for: Module 02 onward.

- [React Navigation](https://reactnavigation.org/docs/getting-started)
  Stacks, tabs, params. Use for: the Token navigation structure.

## Backend

- [PostgreSQL Documentation](https://www.postgresql.org/docs/current/)
  Dense but authoritative. Use for: Modules B1 and B2.

- [PostgreSQL Tutorial](https://www.postgresqltutorial.com)
  Gentler on-ramp than the official docs when a concept won't land.

- [node-postgres (`pg`) docs](https://node-postgres.com)
  The driver used throughout Track B. Use for: pooling, parameterised queries.

- [Express](https://expressjs.com/en/4x/api.html) · [Fastify](https://fastify.dev/docs/latest/)
  Whichever is chosen in B3. Use for: routing, middleware, error handling.

- [Zod](https://zod.dev)
  Runtime validation shared between client and server. Use for: B3 input validation.

## Real-time & calls

- [MDN: WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
  The reference for peer connections, ICE, and signalling concepts.

- [WebRTC for the Curious](https://webrtcforthecurious.com)
  Free book. Explains *why* WebRTC works the way it does — worth reading before B6.

- [react-native-webrtc](https://github.com/react-native-webrtc/react-native-webrtc)
  The mobile WebRTC binding. Requires EAS Build; will not run in Expo Go.

- [coturn](https://github.com/coturn/coturn)
  Self-hosted TURN server. Use for: relaying when direct connection fails.

- [ws](https://github.com/websockets/ws)
  The WebSocket server library for chat and signalling.

## Deployment & security

- [Coolify Docs](https://coolify.io/docs)
  Self-hosted PaaS on your own VPS. Use for: Module B9.

- [Docker Docs](https://docs.docker.com)
  Use for: containerising `api/` and `web/`.

- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org)
  Auth, session, and input-handling guidance. Use for: B4 and B10.

- [India's DPDP Act, 2023](https://www.meity.gov.in/data-protection-framework)
  Data protection obligations for the Indian market. Use for: B10.

## Communities

- [r/reactnative](https://www.reddit.com/r/reactnative/) — troubleshooting and architecture
- [Expo Discord](https://chat.expo.dev) — fast help from Expo maintainers
- [Stack Overflow: react-native](https://stackoverflow.com/questions/tagged/react-native)
- [Stack Overflow: postgresql](https://stackoverflow.com/questions/tagged/postgresql)

---

**Deliberately absent:** Firebase, Agora, Twilio, Exotel, Stream, Sendbird, Prisma.
All are ruled out by the architecture — see `CLAUDE.md`. If a search result
recommends one of them, it is answering a different project's question.
