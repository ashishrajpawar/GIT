# HANDOFF — JS Learn Project

## 1. What we are building and why

A structured, self-contained HTML/JavaScript learning course for **Ashish** — a complete JavaScript beginner with basic HTML/CSS knowledge. The goal is to learn enough JavaScript and React Native to build and publish a **full WhatsApp clone mobile app** to both **Android (Play Store) and iOS (App Store)** within ~2 months.

The course lives entirely in this folder as plain HTML files — no server, no framework, no login. Open any lesson file in a browser to read it. Each lesson has a working quiz powered by `assets/quiz.js`.

---

## 2. Every decision made and reasoning

### Tech stack for the app being built
- **React Native + Expo** — chosen over bare RN for beginner friendliness; EAS Build handles native modules
- **Firebase** — auth (sign up/login), Firestore (real-time messages), Storage (images)
- **WebRTC via `react-native-webrtc`** — chosen over Agora/Twilio because Ashish explicitly wanted the same technology WhatsApp uses; no third-party SDK, free forever
- **Firebase Firestore as signaling server** — already in the stack, no extra service needed
- **Google STUN + self-hosted `coturn`** — free, open source TURN fallback
- **EAS Build** — required for `react-native-webrtc` (native C++/Obj-C code); plain Expo Go cannot run it
- **Both Android AND iOS** — Ashish explicitly requested both platforms (not just Android)

### iOS call specifics
- iOS incoming calls require **CallKit + VoIP push (APNs)** — mandatory for App Store approval
- Android incoming calls require **FCM push + foreground service**
- iOS publishing requires Apple Developer account ($99/year)
- EAS Build handles iOS builds without needing a Mac

### Course structure decision
- Organised into `modules/` folder (not the original flat `lessons/` folder)
- 6 modules total, matching the app-building journey end to end
- Lessons are built one module at a time, as Ashish progresses
- Each lesson has: explanation → code examples tied to WhatsApp → full runnable example → 5-question interactive quiz

### Folder reorganisation
- Original `lessons/` folder still exists (safe to delete once confirmed working)
- All lesson files were copied to `modules/01-javascript-fundamentals/`
- Links were updated: `../lessons/` → `./`, `../assets/` → `../../assets/`, `../reference/` → `../../reference/`
- `index.html` created at root as course home page
- Each module folder has a `README.html` as the module index

---

## 3. Files created or modified

### Root
- `index.html` — **CREATED** — course home page with all 6 modules in a table, links to everything
- `MISSION.md` — **MODIFIED** — updated to reflect both iOS+Android, WebRTC instead of Agora, EAS Build requirement
- `NOTES.md` — **MODIFIED** — added WebRTC stack details, iOS/Android call differences, publishing requirements
- `HANDOFF.md` — **CREATED** — this file

### Module 1 — JavaScript Fundamentals (`modules/01-javascript-fundamentals/`)
All 12 files copied from `lessons/` with links updated:
- `0001-what-is-javascript.html` through `0009-promises-and-async-await.html` — pre-existing, links updated
- `0010-arrays-and-objects.html` — **CREATED** — arrays, objects, arrays of objects, spread/copy
- `0011-modern-javascript-es6.html` — **CREATED** — arrow functions, destructuring, spread, template literals, optional chaining `?.`, nullish coalescing `??`, import/export
- `0012-error-handling.html` — **CREATED** — try/catch/finally, throwing errors, async error handling, Firebase error codes, input validation
- `README.html` — **CREATED** — module index with all 12 lessons linked

### Module 2 — React Native (`modules/02-react-native/`)
- `README.html` — **CREATED then UPDATED** — module index; updated as each lesson was built to add links
- `0001-expo-setup-and-eas-build.html` — **CREATED** — Node.js, Expo CLI, Expo Go, create-expo-app, QR scan, EAS Build setup, project structure
- `0002-core-components.html` — **CREATED** — View, Text, Image, ScrollView, Pressable, JSX, HTML→RN comparison, ChatRow example
- `0003-styling-and-flexbox.html` — **CREATED** — StyleSheet, CSS vs RN differences, flexDirection, justifyContent, alignItems, flex, margin/padding, position:absolute, WhatsApp message bubble layout, colour reference
- `0004-textinput-and-keyboard.html` — **CREATED** — TextInput props, keyboardType, secureTextEntry, multiline, useRef, KeyboardAvoidingView, Platform.OS, platform shadows, keyboardDismissMode, full chat input bar
- `0005-usestate.html` — **CREATED** — why plain variables fail, useState syntax, updating arrays/objects, functional updater, derived values, WhatsApp state patterns, full chat screen with ticks and unread count
- `0006-useeffect.html` — **CREATED** — side effects, three forms (no array/empty array/with values), async inner function pattern, cleanup/unsubscribe, Firebase listener pattern, 5 common patterns, chat list with search
- `0007-flatlist.html` — **CREATED** — ScrollView vs FlatList, required props, keyExtractor, ItemSeparatorComponent, ListEmptyComponent, pull-to-refresh, inverted for message threads, onEndReached pagination, performance tips, production chat list
- `0008-navigation.html` — **CREATED** — NavigationContainer, Stack Navigator, navigate/goBack/push/replace, route params, header customisation, headerShown:false, Bottom Tab Navigator, nested navigators, full WhatsApp navigation shell (4 tabs + stack)

### Modules 3–6 (placeholders only)
- `modules/03-firebase-backend/README.html` — **CREATED** — planned lessons listed
- `modules/04-whatsapp-features/README.html` — **CREATED** — planned lessons listed
- `modules/05-audio-video-calls/README.html` — **CREATED** — full WebRTC stack details, Android vs iOS table, 8 planned lessons
- `modules/06-polish-and-publish/README.html` — **CREATED** — Android + iOS publishing details, 6 planned lessons

### Memory files (outside project)
- `C:\Users\aspawar\.claude\memory\user-profile.md` — **CREATED** — global user profile: JS beginner, HTML/CSS basics, wants both Android+iOS
- `C:\Users\aspawar\.claude\memory\MEMORY.md` — **CREATED** — global memory index
- `C:\Users\aspawar\.claude\projects\C--Users-aspawar-Desktop-Digital-Ashish-App-JS-Learn\memory\project-context.md` — **CREATED** — full project context: tech stack, WebRTC details, module status, file structure
- `C:\Users\aspawar\.claude\projects\C--Users-aspawar-Desktop-Digital-Ashish-App-JS-Learn\memory\MEMORY.md` — **CREATED** — project memory index

### Legacy (not deleted, safe to remove)
- `lessons/` folder — original flat lesson files, now superseded by `modules/01-javascript-fundamentals/`

---

## 4. What is done

### Module 1 — JavaScript Fundamentals ✅ COMPLETE
All 12 lessons written and linked:
1. What is JavaScript
2. Data Types
3. Functions
4. Conditionals
5. Loops
6. Scope & Closures
7. DOM & Browser APIs
8. Events
9. Promises & Async/Await
10. Arrays & Objects
11. Modern JavaScript (ES6+)
12. Error Handling

### Module 2 — React Native ✅ COMPLETE (14/14 done)
1. Expo Setup & EAS Build ✅
2. Core Components (View, Text, Image, ScrollView, Pressable) ✅
3. Styling & Flexbox ✅
4. TextInput & Keyboard ✅
5. useState ✅
6. useEffect ✅
7. FlatList ✅
8. React Navigation (Stack + Bottom Tabs) ✅
9. Passing Data Between Screens ✅
10. Forms — Login & Register screens ✅
11. Images & ImagePicker ✅
12. Loading states & error states ✅
13. Build the chat list screen (capstone) ✅
14. Build the message thread screen (capstone) ✅

### Module 3 — Firebase Backend ✅ COMPLETE (5/5 done)
1. Firebase Project Setup & Connecting to Expo ✅
2. Authentication — Sign Up, Log In, Log Out ✅
3. Firestore — Real-Time Chat List ✅
4. Firestore — Real-Time Messages ✅
5. Firebase Storage — Image Sending ✅

### Module 4 — WhatsApp Features ✅ COMPLETE (6/6 done)
1. User Profiles & Contacts ✅
2. Group Chats ✅
3. Message Features (reply, delete, reactions) ✅
4. Voice Messages ✅
5. Status (Stories) ✅
6. Push Notifications ✅

### Module 5 — Audio & Video Calls ✅ COMPLETE (8/8 done)
1. How WebRTC Works ✅
2. EAS Build Setup ✅
3. react-native-webrtc Setup ✅
4. Signaling with Firebase ✅
5. 1:1 Voice Call ✅
6. 1:1 Video Call ✅
7. Incoming Calls on Android ✅
8. Incoming Calls on iOS ✅

### Module 6 — Polish & Publish ✅ COMPLETE (6/6 done)
1. UI Polish ✅
2. App Icon & Splash Screen ✅
3. Performance ✅
4. Privacy Policy & Permissions ✅
5. Build & Publish to Android ✅
6. Build & Publish to iOS ✅

### Module 7 — Store Compliance & Safety ✅ COMPLETE (6/6 done)
1. Block & Report Users ✅
2. Content Moderation System ✅
3. Forgot Password & Account Security ✅
4. Age Gate & Consent Flows ✅
5. Data Export & Terms of Service ✅
6. Pre-Submission Checklist & Demo Accounts ✅

### Module 8 — Production at Scale ✅ COMPLETE (8/8 done)
1. Firestore Security Rules ✅
2. Pagination & Data Limits ✅
3. Offline Support & Network Handling ✅
4. Cloud Functions — Server-Side Logic ✅
5. Error Recovery & Retry Logic ✅
6. Monitoring & Crash Reporting ✅
7. Testing Your App ✅
8. Media Compression & Storage Optimization ✅

### Module 9 — Advanced Features ✅ COMPLETE (6/6 done)
1. End-to-End Encryption ✅
2. CI/CD Pipeline ✅
3. Deep Linking & OTA Updates ✅
4. Internationalization (i18n) ✅
5. Accessibility ✅
6. Feature Flags & Staged Rollout ✅

---

## 5. What is next, in order

### Immediate — Module 7: Store Compliance & Safety
Build lessons for Module 7, one per session when Ashish says "proceed with next lesson":

**Lesson 1 — Block & Report Users**
- Block user (hide messages, prevent contact initiation)
- Report user/message (flag to Firestore `reports` collection)
- Block list UI in Settings, unblock flow
- Required by Apple Guideline 1.2 and Google UGC policy

**Lesson 2 — Content Moderation System**
- Firestore `reports` collection schema and admin review workflow
- Auto-hide content after N reports
- Policy document for store reviewers

**Lesson 3 — Forgot Password & Account Security**
- Firebase `sendPasswordResetEmail()`, reset flow UI
- Login attempt limiting (lock after 5 failures)
- Re-authentication before sensitive actions

**Lesson 4 — Age Gate & Consent Flows**
- Date-of-birth at signup, block under-13
- iOS ATT prompt (`expo-tracking-transparency`)
- GDPR consent toggle, conditional analytics init

**Lesson 5 — Data Export & Terms of Service**
- "Download My Data" (Firestore → JSON → share sheet)
- Minimal Terms of Service, hosting, store linking

**Lesson 6 — Pre-Submission Checklist & Demo Accounts**
- Two demo accounts with chat history
- Apple reviewer notes
- IPv6 STUN/TURN verification
- Final walkthrough

### After Module 7 — Module 8 (Production at Scale)
1. Firestore Security Rules (complete field validation + rate limits)
2. Pagination & Data Limits
3. Offline Support & Network Handling
4. Cloud Functions — Server-Side Logic
5. Error Recovery & Retry Logic
6. Monitoring & Crash Reporting
7. Testing Your App
8. Media Compression & Storage Optimization

### After Module 8 — Module 9 (Advanced Features, optional)
1. End-to-End Encryption
2. CI/CD Pipeline
3. Deep Linking & OTA Updates
4. Internationalization (i18n)
5. Accessibility
6. Feature Flags & Staged Rollout

---

## 6. Gotchas, failed approaches, and things not to retry

### Lesson format
- Every lesson MUST have a `callout` div explaining "Why this matters for your WhatsApp clone" at the top — Ashish is motivated by the end goal, not abstract concepts
- Every lesson MUST have a full working `App.js` replacement example the student can run on their phone
- Every lesson MUST have exactly 5 quiz questions using `createQuiz()` — the quiz widget ID must be unique (e.g. `rn-lesson-0001-quiz`)
- All lesson nav links must point to the NEXT lesson file that will be created — use the planned filename even before it exists

### Link paths in modules/02-react-native/
- CSS: `../../assets/styles.css`
- Quiz JS: `../../assets/quiz.js`
- Reference cheatsheet: `../../reference/js-basics-cheatsheet.html`
- Back to module: `./README.html`
- Between lessons: `./0002-core-components.html` etc (same folder, no path prefix)

### WebRTC / Agora
- Ashish explicitly rejected Agora and any third-party SDK — do NOT suggest them again
- Use `react-native-webrtc` only
- Always mention EAS Build is required (not Expo Go) when discussing calls

### Platform differences to always cover in lessons
- iOS vs Android keyboard behaviour (KeyboardAvoidingView behavior prop)
- iOS vs Android shadows (shadowColor vs elevation)
- iOS multiline TextInput padding quirk (paddingTop needed)
- Always show `Platform.OS === 'ios' ? ... : ...` pattern when behaviour differs

### Navigation shell
- The full nav shell was built in Lesson 8 — future lessons slot INTO this structure
- The shell uses `headerShown: false` on the ChatsStack — custom green headers are built in the screen components themselves
- Login/Register screens go in a ROOT stack OUTSIDE the tab navigator (no tab bar on auth screens)
- `navigation.replace('Main')` is used after login so the user can't press back to the login screen

### State management
- No Redux, no Context API, no Zustand — plain useState only for now
- This is intentional — keep it simple for a beginner; introduce Context only if needed for auth state in Module 3
- Derived values pattern is important — unread counts, filtered lists are computed from state, not stored separately

### Memory system
- Project memory is at `C:\Users\aspawar\.claude\projects\C--Users-aspawar-Desktop-Digital-Ashish-App-JS-Learn\memory\`
- Global user memory is at `C:\Users\aspawar\.claude\memory\`
- Both MEMORY.md index files exist and are loaded automatically
- Update project-context.md as modules progress (update "Current state" section)

### The old lessons/ folder
- `lessons/` still exists with the original 9 lessons (pre-session)
- It is safe to delete — everything is in `modules/01-javascript-fundamentals/`
- Do NOT delete it without Ashish's confirmation — he may have bookmarks to it
