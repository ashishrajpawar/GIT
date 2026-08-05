# JS Learn — Claude Orientation

## What this project is
A self-contained HTML course teaching JavaScript and React Native to one student
(Ashish) with the goal of building and publishing a WhatsApp clone to both
Android and iOS. No server, no framework — lessons are plain HTML files opened
in a browser.

## Running / viewing lessons
No build step. Open any `.html` file directly in a browser.
The quiz widget is loaded via `<script src="../../assets/quiz.js"></script>`.
All lessons in `modules/` share `assets/styles.css` and `assets/quiz.js`.

## Project structure
```
index.html                          ← course home page
modules/
  01-javascript-fundamentals/       ← 12 lessons, all complete
  02-react-native/                  ← 14 lessons, all complete
  03-firebase-backend/              ← 5 lessons, all complete
  04-whatsapp-features/             ← 6 lessons, all complete
  05-audio-video-calls/             ← 8 lessons, all complete
  06-polish-and-publish/            ← 6 lessons, all complete
  07-store-compliance-and-safety/   ← 6 lessons planned, README only
  08-production-at-scale/           ← 8 lessons, all complete
  09-advanced-features/             ← 6 lessons, all complete
assets/
  styles.css                        ← shared stylesheet
  quiz.js                           ← createQuiz() widget
reference/
  js-basics-cheatsheet.html
lessons/                            ← legacy folder, superseded by modules/
HANDOFF.md                          ← full session context for resumption
```

## Link paths inside module lessons
From `modules/02-react-native/` (and all module subfolders):
- Stylesheet:  `../../assets/styles.css`
- Quiz script: `../../assets/quiz.js`
- Cheatsheet:  `../../reference/js-basics-cheatsheet.html`
- Same module: `./0002-core-components.html` (no prefix)
- Module home: `./README.html`

## Lesson format — invariants
Every lesson file must have ALL of the following:

1. **"Why this matters" callout** at the top — always tied concretely to the
   WhatsApp clone. Ashish is motivated by the end goal, not abstract concepts.

2. **Code examples** — every concept shown in code, every code block uses
   WhatsApp-relevant names (Priya, chatId, messages, senderId, etc).

3. **Full runnable App.js example** — a complete replacement for the student's
   `App.js` they can paste and run on their phone. No partial snippets as the
   final example.

4. **Exactly 5 quiz questions** using `createQuiz(containerId, [...])`.
   Container ID format: `rn-lesson-000N-quiz` for RN lessons,
   `lesson-000N-quiz` for JS lessons.

5. **Lesson nav** at the bottom with prev/next links using the planned filename
   even if the next lesson doesn't exist yet.

## App being built — tech stack (fixed decisions, do not revisit)
- **React Native + Expo** with EAS Build (not bare workflow)
- **Firebase** — Auth, Firestore (real-time), Storage
- **WebRTC via `react-native-webrtc`** — NO third-party SDK (Agora/Twilio
  explicitly rejected). Same tech as WhatsApp/Signal.
- **Firebase Firestore** as WebRTC signaling server
- **Google STUN** (free) + **coturn** (self-hosted) for TURN
- **Both Android AND iOS** — never suggest Android-only shortcuts
- **EAS Build required for Module 5+** (WebRTC has native C++/Obj-C code;
  plain Expo Go cannot run it)

## Platform differences — always cover both
When behaviour differs between platforms, always show both:
- `KeyboardAvoidingView` behavior: `'padding'` iOS, `'height'` Android
- Shadows: `shadowColor/shadowOffset/shadowOpacity/shadowRadius` iOS,
  `elevation` Android
- `multiline` TextInput needs `paddingTop` on iOS to centre text
- Incoming calls: CallKit + VoIP push (iOS), FCM + foreground service (Android)
- iOS publishing needs Apple Developer account ($99/year)

## State management conventions
- Plain `useState` only — no Redux, Context API, or Zustand in Modules 1–2
- Never mutate state arrays/objects directly — always spread into new ones
- Derived values (unread counts, filtered lists) are computed inline, not stored
  in separate state
- Functional updater form (`prev => ...`) for rapid appends (incoming messages)

## Navigation structure (established in Module 2 Lesson 8)
```
RootStack (headerShown: false)
  ├── Login
  ├── Register
  └── Main → RootTabs (headerShown: false)
        ├── Chats → ChatsStack
        │     ├── ChatList
        │     └── MessageThread
        ├── Calls
        ├── Status
        └── Settings
```
- Auth screens (Login/Register) are in the ROOT stack — no tab bar
- After login use `navigation.replace('Main')` so back doesn't return to Login
- Custom green headers are built inside screen components, not via RN header
- `headerShown: false` on ChatsStack screenOptions

## WhatsApp colours (use consistently)
```
darkGreen:   '#075E54'   header background
lightGreen:  '#25D366'   send button, online dot
bubbleGreen: '#DCF8C6'   sent message bubble
chatBg:      '#ECE5DD'   message thread background
white:       '#FFFFFF'   received message bubble
```

## Student profile
Complete JavaScript beginner, basic HTML/CSS. Tie every concept to the
WhatsApp app. No jargon without explanation. Short lessons with working
phone examples beat thorough theoretical coverage.
