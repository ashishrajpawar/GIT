# Teacher Notes

- User is a complete beginner at JavaScript
- Goal: Build a WhatsApp clone (chat, audio/video calls, groups)
- Framework chosen: React Native (will use Expo for setup)
- Backend plan: Firebase (for auth, Firestore, storage)
- Calls: WebRTC via react-native-webrtc — no third-party SDK (same tech as WhatsApp/Signal)
- Signaling: Firebase Firestore (already in the stack)
- STUN: Google free servers; TURN: self-hosted coturn for reliability
- EAS Build required for WebRTC (not compatible with plain Expo Go)
- iOS needs CallKit + VoIP push (APNs) for incoming calls when app is closed
- Android needs foreground service + FCM push for background incoming calls
- Publishing target: both Android (Play Store) and iOS (App Store)
- Apple Developer account ($99/year) needed for iOS publishing
- Start with JS fundamentals — variables, functions, types — before touching React Native
- Keep lessons short and tied concretely to "how this will help you build your chat app"
- User is highly motivated by a specific real-world goal — lean on this for examples
