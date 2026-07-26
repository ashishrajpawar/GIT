# Token — Mobile App Screen Specification

**Version:** 1.0 · derived from the v7 prototype (`token-v7.html`)
**Audience:** React Native developer, or Claude Code building from this repo
**Companion documents:** `token-functional-spec.md` (features, business rules), `token-journey-map.html` (why each screen exists)

Every screen below carries a code (`A1`, `B2`, …). Where the screen exists in the v7 prototype, its DOM id is given. Screens marked **[GAP]** are not in the prototype but are required before launch — they are specified here so nobody invents them ad hoc.

---

## PART 0 — Conventions that apply to every screen

### 0.1 Navigation model

```
Launch
 ├─ not authenticated → A1 Onboarding → A2 Phone → A3 OTP → A4 Permissions → B1 Chats
 └─ authenticated     → A6 App Lock (if enabled) → B1 Chats

Tab bar (4 tabs, persistent on B-screens only)
 B1 Chats · B2 Tokens · B3 Circles · B4 Calls

Reached from any B-screen header
 avatar → E1 You    ·    bell → E2 Activity

Push-stack screens (tab bar hides, back arrow appears)
 C1 Thread · C2 Circle chat · D1 Token detail · D2 Circle detail
 E1 You · E2 Activity · E3 Plans · E4 Settings · E5 KYC
```

**Rule:** the tab bar is visible on exactly four screens. Everything else is a push with a back arrow at top-left. No nested tab bars, no hamburger menu.

### 0.2 Component vocabulary

| Term | Meaning | Dismissal |
|---|---|---|
| **Sheet** | Bottom sheet, rounded top corners, scrim behind | Swipe down, tap scrim, or explicit button |
| **Modal** | Centre-screen box, cannot be dismissed by scrim if a process is running | Explicit button only |
| **Banner** | Top-anchored transient notification, tappable to navigate | Auto-hides after 4.2s |
| **Toast** | Bottom pill, non-interactive confirmation | Auto-hides after 2.6s |
| **Pass card** | The dark holographic token card. The product's signature object. | — |

### 0.3 Design tokens

```
Ink        #0B1526   Slate     #5C6B84   Faint      #97A3B7
Background #F5F7FA   Surface   #FFFFFF   Line       #E5EAF1
Accent     #2050E0   Green     #0C9A6C   Amber      #C4700F   Red #DC3D43
Pass card  linear-gradient(150deg, #0F1A32, #1C2D54)
Holo edge  linear-gradient(90deg, #35D08F, #3E7BFF 45%, #8B5CF6)

Display    Fraunces 600         — screen titles, sheet titles
Body       Hanken Grotesk 500/700/800
Utility    JetBrains Mono 500/700 — token codes ONLY
```

**Single theme. No dark mode, no accent picker in v1.** A trust product wears one uniform.

### 0.4 Token status vocabulary (used identically everywhere)

| Status | Chip colour | Holder sees | Reversible |
|---|---|---|---|
| `active` | Green · "Live" | Full channel list | — |
| `expiring` | Amber · "Expiring soon" | Full list + expiry warning | — |
| `paused` | Amber · "Paused" | "Paused for now" page | **Yes** |
| `revoked` | Red · "Revoked" | "This token no longer exists" | **No — permanent** |
| `expired` | Grey · "Expired" | Dead page | No |

### 0.5 Universal states every screen must implement

Loading (skeleton, never a full-screen spinner) · Empty · Error · Offline · Content.
**Offline behaviour:** existing tokens and threads render from local cache; mint, pause and revoke are disabled with the banner *"You're offline — token changes need a connection."* Never let a revoke silently fail.

---

# PART A — First run

## A1 · Onboarding
`s-onboard` · full screen, no tab bar, no back

**Purpose:** replace the user's existing mental model ("second number app") with the correct one ("revocable permission") before he is asked for anything.

**Layout (top to bottom):** brand row · illustration panel 260pt, deep navy with holo bottom edge · title + body · progress dots · primary button · skip link.

**Three slides — exact copy:**

| # | Title | Body | Illustration |
|---|---|---|---|
| 1 | Sealed by default | No number to leak, no inbox to spam. Until you decide otherwise, there's simply no way to contact you. | Concentric dashed rings, padlock centre, three inbound dashes stopping short |
| 2 | Mint a token to open a door | A token is permission, not identity — like a hotel key card. Choose who, which channels, and for how long. | A pass card showing `TOKN-8GH2-LP4X` with a live dot |
| 3 | Revoke it, and it's gone | One tap and that path to you stops existing. No blocking, no drama — just silence, restored. | The same card, code struck through in red |

**Interactions:** primary button advances (label becomes "Get started" on slide 3, then routes to A2) · dots are indicators, not controls · "Skip intro" jumps straight to A2 · horizontal swipe should also advance (add in RN; the prototype uses the button only).

**Rules:** shown once ever. Never re-shown after successful auth, including after reinstall if the account is restored.

**Analytics:** `onboarding_slide_viewed {index}`, `onboarding_skipped {at_index}`, `onboarding_completed`.

---

## A2 · Phone entry
`s-phone`

**Purpose:** collect the number that secures the account — and neutralise the obvious objection in the same breath.

**Layout:** title "Create your vault" · subtitle *"Your number secures the account and routes bridged calls to you. It's never shown to anyone — that's the product."* · country prefix `+91` (fixed in v1) + number field · trust card · primary button "Send OTP".

**Trust card copy (verbatim):** *No contact sync — ever. Encrypted at rest · AWS Mumbai · DPDP compliant.*

**Validation:** numeric only, exactly 10 digits after stripping non-digits. Inline error under the field: *"Enter a 10-digit mobile number."* Button disabled until valid.

**Edge cases:** paste with `+91` or spaces → strip silently · number already registered → this is a **login**, not an error; proceed to A3 and route to the app on success · rate-limit 5 OTP requests per number per hour, message *"Too many attempts. Try again in an hour."*

**Data:** `POST /auth/otp/request { phone }` → `{ requestId, expiresIn }`.

**Analytics:** `auth_phone_submitted`, `auth_otp_requested`.

---

## A3 · OTP verification
`s-otp`

**Layout:** title "Enter the code" · subtitle showing the number with an inline **Edit** link back to A2 · four separate boxes, 58×64pt, mono · resend row · primary button "Verify & seal".

**Interactions:** auto-advance on entry, backspace moves back · SMS autofill (`autoComplete="sms-otp"` / iOS `oneTimeCode`) is mandatory — do not ship without it · resend disabled for 30s, then *"Resend code"* with a countdown · button enabled only when all four filled.

**Errors:** wrong code → shake the row, clear it, message *"That code didn't match. Check and try again."* · expired (>5 min) → *"Code expired. Request a new one."* · 5 wrong attempts → lock the request, force a return to A2.

**Success:** issue tokens, route to A4. Toast on landing at B1: *"Sealed. Nobody can reach you now."*

**Data:** `POST /auth/otp/verify { requestId, code }` → `{ accessToken, refreshToken, user }`.

---

## A4 · Permission priming **[GAP]**

**Purpose:** ask for notifications *after* explaining why, never with a cold OS prompt. Missing from v7 and easy to get wrong.

**Layout:** centred illustration · title **"Should we tell you when someone knocks?"** · body *"Token only notifies you when a token you minted is actually used — a message, a call, a delivery. There is nothing else to notify you about."* · primary "Turn on notifications" (triggers the OS prompt) · secondary "Not now".

**Rules:** if denied, never nag; surface a single re-enable row inside E4 Settings. Because Token's entire value is inbound events, a denied permission should raise a one-time inline card on B1 after the first token is minted: *"Notifications are off — you may miss when someone uses your token."*

**Analytics:** `perm_notifications_prompted`, `perm_notifications_result {granted}`.

---

## A5 · First-run coach on Chats
`s-chats` empty state

**Purpose:** the highest drop-off point in the funnel. One job, one button.

**Copy (verbatim):**
> **Perfectly silent**
> Nobody can start a conversation with you.
> When you're ready — a sale, a delivery, a person — mint a token with the button below.

Plus a subdued tertiary link: *"Or explore a demo world →"* (demo only — **remove or replace before production**; see §Open items).

**Rules:** shown whenever `threads.length === 0`, not only on first run. Seal strip still renders above it, reading *"Sealed · your line is invisible."*

---

## A6 · App lock **[GAP]**

**Purpose:** a privacy app that opens straight into readable conversations when a phone is handed to someone is not a privacy app.

**Layout:** dark full-bleed lock screen, logo, biometric prompt on mount, "Use PIN instead" fallback.

**Rules:** off by default, enabled from E4 Settings, with a choice of immediately / after 1 minute / after 15 minutes. When enabled, obscure the app in the OS task switcher. Failure to authenticate leaves the app locked; there is no "skip".

---

# PART B — The four tabs

## B1 · Chats (landing)
`s-chats`

**Purpose:** the app's home. Where he goes to read a message — the single most frequent job.

**Layout:**
1. **Header** — wordmark "Token" · bell icon with unread-activity badge · avatar (opens E1)
2. **Seal strip** — full-width dark capsule with holo bottom edge, green pulse dot, *"Sealed · 2 tokens live"*, trailing "Manage →". Tapping routes to **B2**. Occupies the position WhatsApp uses for its encryption banner.
3. **Thread list**
4. **FAB** — labelled pill, bottom-right, *"Mint token"*

**Thread row anatomy:** 44pt rounded-square avatar (first letter, deterministic gradient) · name · last-message preview, single line, ellipsised · right column: timestamp, **token chip**, unread count.

**Token chip logic** — the detail that makes this screen Token rather than WhatsApp:

| Token status | Chip | Row treatment |
|---|---|---|
| active | green · `8GH2 · live` | normal |
| expiring | amber · `4WQ7 · 18h` | normal |
| paused | amber · `PAUSED` | normal |
| revoked | red · `REVOKED` | 60% opacity |

**Sort:** most recent message first; revoked threads sink below all live ones regardless of recency.

**Swipe actions [GAP — v7 has none]:** swipe left → **Pause** (amber) · swipe right → **Mute**. Revoke is deliberately *not* a swipe action; it is irreversible and must never be reachable by muscle memory.

**Empty state:** A5. **Loading:** three skeleton rows. **Search [GAP]:** pull-down search over thread names and message bodies, local-first.

**Data:** `GET /threads` → `[{ id, tokenCode, tokenStatus, peerLabel, lastMessage, unreadCount, updatedAt }]`.

**Analytics:** `chats_viewed`, `thread_opened {tokenStatus}`, `seal_strip_tapped`.

---

## B2 · Tokens
`s-doors`

**Purpose:** the control room. Every door, and its state.

**Layout:** header (title "Tokens", bell, avatar) · **segmented filter: Live / Paused / Dead** · scrolling list of pass cards · FAB "Mint token".

**Filter mapping:** Live = `active` + `expiring` · Paused = `paused` · Dead = `revoked` + `expired`.

**Pass card anatomy:**
```
┌────────────────────────────────┐  ← holo edge, 3pt, top
│ Rahul — car sale        ● Live │
│ TOKN-8GH2-LP4X                 │  ← JetBrains Mono, 18.5pt, tracked
│ [Expires in 22 days] [Chat ·   │
│  Call · SMS] [9 uses] [9–19]   │  ← pill row, wraps
└────────────────────────────────┘
```
Card background varies by status: navy (live) · olive-brown (paused) · burnt amber (expiring) · flat grey with struck-through code (revoked).

**Interactions:** tap → D1 · long-press → context menu: Copy link, Preview, Pause, Revoke… **[GAP in v7]**.

**Empty states:** Live → *"No live tokens / Mint one — it takes two taps."* · Paused / Dead → *"Nothing here / Tokens land here as their state changes."*

**Data:** `GET /tokens?status=live|paused|dead`.

---

## B3 · Circles
`s-circles`

**Purpose:** group spaces where one shared token admits everyone and nobody exchanges numbers.

**Layout:** header · circle list · FAB **"New circle"** (the FAB is context-aware — this is the only tab where it is not "Mint token").

**Circle row:** emoji tile · name · `Author: last message` preview · timestamp · chip `4 · SHARED` · unread badge.

**Key rule:** circle codes use the **same `TOKN-` grammar** as one-to-one tokens, marked `SHARED`. Two code formats would mean two mental models — this was a specific teardown fix.

**Empty state:** *"No circles yet / One shared token, one private space — family, society, friends. No numbers exchanged."*

**Data:** `GET /circles` → `[{ id, name, emoji, code, memberCount, lastMessage, unreadCount }]`.

---

## B4 · Calls
`s-calls`

**Purpose:** the call log — and the one place where invisible protection becomes visible.

**Row types:**

| Type | Avatar | Chip | Treatment |
|---|---|---|---|
| `bridged` | gradient, initial | green · "Bridged · 3m 12s" | normal |
| `missed` | gradient, initial | red · "Missed" | normal |
| `bounced` | grey `?` | grey · "No token · never rang" | 62% opacity |

**Bounced rows are the point of this screen.** Copy must stay accurate: a bounce is an attempt against a **dead or revoked link, or a retired relay number** — not detection of every stranger alive. Do not write copy implying omniscience.

**Empty state:** *"No calls — and no spam either / Bridged calls appear here. So do bounced attempts — calls that never rang because no token existed."*

**Data:** `GET /calls` → `[{ id, type, peerLabel, tokenCode|null, at, durationSec|null }]`.

---

# PART C — Conversation screens

## C1 · Thread (1:1)
`s-chat` · push, tab bar hidden

**Layout:**
1. **Header:** back · name + subtitle *"number hidden · bridged"* · shield icon (Report)
2. **Token strip** — the screen's defining element. Grey band directly beneath the header: mono code · *"· expires in 22d"* · **Pause** button (amber pill) · **Revoke** button (red pill)
3. **Message list** — them (white, left, tail bottom-left) · me (accent, right, tail bottom-right) · double-tick on sent
4. **Composer** — pill input, placeholder *"Message — they never see your number"*, circular send button

**Interactions:**
- **Pause** toggles instantly and relabels to **Resume**; toast *"Paused — nothing gets through for now."*
- **Revoke** never acts directly — it always opens **F1 Revoke confirmation**.
- **Report** also routes to F1 with `origin: report`, since reporting without killing the token would be theatre.

**Blocked composer states:**
- token `revoked` → composer disabled, footer line *"— token revoked · thread sealed —"*, attempt shows *"This token is revoked — thread is sealed."*
- token `paused` → *"Token is paused — resume it to reply."*

**Rules:** no attachments in v1 · no read receipts to the holder (they never learn whether he's ignoring them; silence must stay free) · typing indicator inbound only.

**Data:** `GET /threads/{id}/messages`, `POST /threads/{id}/messages`, WebSocket `thread.message`, `token.status_changed`.

**Analytics:** `thread_message_sent`, `token_paused {origin: chat}`, `revoke_intent {origin: chat}`.

---

## C2 · Circle chat
`s-cchat`

Same skeleton as C1, with differences: header subtitle shows `4 members · TOKN-FAM4-92KX` · info icon routes to D2 · inbound bubbles carry a small accent-coloured author name · **no token strip** (a circle token is managed from D2, not mid-conversation).

**Empty state:** *"A private space on one shared token. Say something."*

---

# PART D — Object detail screens

## D1 · Token detail
`s-detail` · push from B2

**Purpose:** everything about one door, and every control over it.

**Sections, in order:**
1. **Pass card** — non-interactive, full status
2. **Rules grid** — 2×2 cards: Expiry · Reachable hours · Channels · Audience (*"Anyone with the link"* or *"Verified businesses"*)
3. **QR block** — 108pt QR, *"Scan to redeem"*, caption *"Anyone who scans lands on this token's page — never on you."*, Enlarge link → F5
4. **Timeline** — reverse chronological, vertical rail with dots: minted → redeemed → each call/message class → paused → revoked. This is the audit trail; it is also, per the teardown, one of the product's genuinely differentiated moments.
5. **Actions** — row 1: Copy link · Preview (opens the holder page) · row 2: Pause/Resume · **Revoke…** (the ellipsis signals a confirmation follows)

**Dead-token variant:** actions collapse to a single "Remove from list", which deletes the record locally only. **A revoked token is never resurrectable — there is no un-revoke, anywhere in the product.**

**[GAP] Open question Q1 from the functional spec:** can a live token's rules be edited (extend expiry, add a channel), or must the owner revoke and re-mint? Recommendation: allow *narrowing* (remove a channel, shorten expiry) freely, and allow *extending* expiry, but never allow adding a channel — that should mint a new token, so the holder's page never gains capability without a fresh grant. **Decide before build.**

**Data:** `GET /tokens/{code}`, `PATCH /tokens/{code} { status }`, `DELETE /tokens/{code}`.

---

## D2 · Circle detail
`s-circle`

**Sections:** shared pass card (`Never expires · Members only · No numbers exchanged`) · Open chat / Invite buttons · member list — each row showing name and role line (*"Owner · full control"* or *"Holds the shared token only"*), with Remove on non-owners · destructive footer "Disband circle".

**Rules:** removing a member must invalidate their access immediately, not at next app open. Disbanding requires a confirmation sheet identical in structure to F1.

---

## E1 · You
`s-you`

**Sections:**
1. **Identity header** — avatar, name, verification chip (amber "Unverified" / green "Verified")
2. **Identity vault** — Real number (masked `+91 ••••• ••842`) · Real email (masked) · KYC row. Each masked value has an eye button that **must** route through F4 biometric confirmation. Tapping the eye a second time re-masks without re-authenticating.
3. **Account** — Plan (→ E3) · Export my data · Delete account (→ F6)
4. **[GAP] Settings row** → E4

**Rule:** the vault is the highest-value target in the app. Reveal is never a bare tap, values never appear in screenshots-by-default (set `FLAG_SECURE` on Android for this screen), and no vault value is ever copied to the clipboard without an explicit long-press action.

---

## E2 · Activity
`s-activity` · reached from the bell on any B-screen

**Purpose:** the ledger of every knock, bounce and lifecycle event.

**Row:** tinted icon tile · title · relative time · unread dot; unread rows carry an accent border.

**Event types and their copy:**

| Icon | Tint | Example |
|---|---|---|
| shield | red | Contact attempt without a token — bounced |
| chat | blue | Rahul messaged via TOKN-8GH2-LP4X |
| clock | amber | Bluekart token expires in 18 hours |
| lock | green | Token for Rahul — car sale revoked — line dead |
| pin | red/green | Bluekart requested your live location / You shared a live pin · 1 hour |
| shield | green | KYC complete — voice tokens unlocked |

**Rules:** opening the screen marks all read (badge clears after ~400ms so the transition is visible) · retention 90 days on paid, 7 days on free · **no aggregate counters anywhere on this screen** — the teardown killed vanity stats; individual events only.

**Empty state:** *"All quiet / Every knock and bounce lands here the moment it happens."*

---

## E3 · Plans
`s-plan`

Four cards — Free ₹0 · Plus ₹99 · Pro ₹249 (badged "MOST SEALED") · Business ₹999, each listing four features, with the current plan outlined green and its button disabled.

**Rules:** the core loop — seal, mint, chat, revoke — is free forever. Paid tiers sell **volume and channels**, never safety. Downgrade takes effect at cycle end, not immediately; if the new tier allows fewer live tokens than currently exist, prompt the user to choose which to keep rather than auto-revoking. **This is spec open question Q4 and must be resolved before billing goes live.**

---

## E4 · Settings **[GAP]**

Rows: Notifications (per-type toggles: messages, calls, bounces, expiry warnings) · App lock (off / immediate / 1 min / 15 min) · Blocked holders · Language · Linked devices · Help & support · Privacy policy · Terms · About and version.

---

## E5 · KYC verification **[GAP — v7 simulates this in 1.8s]**

Real flow, via Digio/Signzy/Karza: intro screen explaining *why* (voice bridging requires a verified owner under Indian telecom norms) → document choice (Aadhaar/DigiLocker, PAN, Passport) → capture/redirect → selfie liveness → processing → result.

**States:** processing (may take minutes — must be backgroundable, with a push notification on completion) · verified · **rejected**, with a reason and one retry path. The prototype's happy-path-only treatment is the single largest gap between it and a shippable app.

**On success:** unlock the Call channel everywhere, update the E1 chip, and post an Activity event.

---

# PART F — Sheets, modals and interrupts

## F1 · Mint token
`sheet-mint` · the most important surface in the product

**Design mandate: two taps to a usable token.** Everything else is optional.

**Form view, top to bottom:**
1. Title "Mint a token"; subtitle *"Pick what it's for — sensible rules come pre-set. Two taps and it's live."*
2. **Template grid, 2×2** — each card carries emoji, name, and its pre-set rules as a caption:

| Template | Channels | Expiry | Hours | Business-only |
|---|---|---|---|---|
| 🏷️ Marketplace sale *(default)* | Chat, Call, SMS | 7 days | 9:00–19:00 | no |
| 📦 Delivery | Chat, Location | 24 hours | All day | **yes** |
| 🔧 Contractor | Chat, Call | 30 days | Weekdays | no |
| ✦ Custom | Chat | 7 days | All day | no |

3. **Name it (optional)** — pre-filled from the template, freely editable
4. **KYC callout** — appears only when the selected template includes Call and the user is unverified. Dashed amber card: *"Voice calls need a one-time identity check."* + inline **Verify now** that completes without leaving the sheet
5. **"Adjust the rules"** — a collapsed disclosure, opened by default only for Custom. Contains channels (multi-select chips), expiry (24h / 7d / 30d / Never), reachable hours (All day / 9–7 / Weekdays), and a "Verified businesses only" switch
6. Primary **Mint & share**

**Removed deliberately:** the single-use vs multi-use choice and any "usage limit" field. Usage semantics are derived internally from the template; the jargon tested as incomprehensible and was cut in the teardown.

**Result view (replaces the form in place):** title "Token minted" · the new pass card · line *"Anyone holding this can reach you on the channels you allowed — nothing more, only until you say stop."* · share grid **Copy link · WhatsApp · QR code · NFC** · secondary **Preview what they see** · tertiary **Done**.

**Validation:** at least one channel; tapping Call while unverified reveals the KYC callout rather than silently failing.

**[GAP] Recommended addition:** auto-generate the sentence that accompanies the link — *"Use this to reach me — it's my contact link, it works without installing anything."* Open question Q1 in the journey map; likely worth more to redemption rate than any UI change.

**Data:** `POST /tokens { template, label, channels[], expiry, window, bizOnly }` → `{ code, url, qr }`.

**Analytics:** `mint_opened {tab}`, `mint_template_selected`, `mint_rules_adjusted`, `mint_completed {template, channels, expiry}`, `mint_shared {method}`.

---

## F2 · New circle
`sheet-circle`

Name field · emoji picker (5 options) · explainer card: *"One shared token gets everyone in — same TOKN code, marked shared. Nobody exchanges numbers, not even with each other."* · primary **Create circle & copy invite**.

---

## F3 · Revoke confirmation
`sheet-revoke` · **mandatory before any revoke, from every entry point**

**Contents:** title "Revoke this token?" · the pass card being killed (so he is certain which one) · red-bordered warning card:

> **This is permanent.** The thread seals, calls stop connecting, and their link goes dead. If you just need a break, Pause instead.

· primary destructive **Yes, revoke forever** · secondary **Pause instead** (hidden when the token is already paused) · tertiary **Cancel**.

**Entry points and post-actions:** `chat` → return to thread, seal it · `report` → same, plus a red Activity entry *"Reported & blocked — token killed"* · `detail` → refresh D1.

**Rule:** this sheet exists because v4 allowed an irreversible action on a single unconfirmed header tap, one icon away from Report. Never regress this.

---

## F4 · Biometric confirmation
`modal-bio`

Fingerprint glyph (pulses while scanning) · title "Confirm it's you" · body *"Revealing vault contents needs biometric confirmation."* · **Touch sensor** · Cancel.

**Production behaviour:** call the real biometric API (`expo-local-authentication` / `react-native-biometrics`), fall back to device PIN, and on repeated failure simply close without revealing. Required for: vault reveals, and (recommended) any revoke when App Lock is enabled.

---

## F5 · QR display
`sheet-qr` · large QR, the redemption URL beneath, Done. Raise screen brightness while open.

## F6 · Delete account
`sheet-delete` · *"Every token dies instantly, all conversations and circles are erased, and your vault is wiped. Nobody — including us — can reach you or reconstruct your data afterwards."* · destructive **Delete everything** · **Keep my vault**.
**[GAP]** production must add a typed confirmation (the word DELETE) and a 7-day grace window with an email/SMS recovery link, per DPDP erasure norms.

## F7 · Location request
`sheet-locreq` · *"**Bluekart delivery** is asking for a live pin via TOKN-4WQ7-BD2K. They'll see where you are now — never your saved addresses."* · duration segment (15 min / 1 hour / Until delivered) · **Share live pin** / **Not now**.
**Rule:** denial is silent to the requester — they see no "denied" message, only that nothing arrived.

## F8 · Payment
`modal-pay` · Razorpay checkout: plan + amount header, UPI / Card / Netbanking, processing spinner, success state. Never dismissible mid-transaction.

---

# PART G — Full-screen interrupts

## G1 · Incoming call
`incoming` · full-bleed navy, pulsing avatar ring, caller label, and — the detail that matters — the line **`via TOKN-8GH2-LP4X · secure bridge`** plus *"Their real number stays hidden. So does yours."* Decline / Accept.

**Rules:** must render over the lock screen (CallKit on iOS, ConnectionService on Android). Decline logs a `missed` row in B4 and an Activity entry; the caller simply hears the line end.

## G2 · Active call
`activeCall` · avatar, name, running timer, *"Bridged · both numbers hidden"*, end button. **[GAP]** production needs mute, speaker and keypad controls.

## G3 · Banner
Top-anchored, tappable, holo-edged token glyph tile, title + preview. Routes to the relevant thread, circle, or Activity. Auto-hides at 4.2s.

## G4 · Toast
Dark pill above the tab bar. Confirmations only — never errors that require action, and never anything the user must read to proceed.

---

# PART H — What the holder sees (web, no install)

Not part of the mobile build, but the mobile app links directly to it and *Preview what they see* renders it, so it is specified here for completeness.

| State | Page |
|---|---|
| **Valid** | Grant card: avatar, *"A door to Ashish"*, code, green strip (*valid · expires in 22 days · reachable 9:00–19:00*), channel list with allowed rows tappable and disallowed rows visibly locked (*"Not allowed by this token"*), privacy note, footer |
| **Business-gated** | *"This token opens for verified businesses only"* + a one-time verification step |
| **Paused** | *"Paused for now — the owner has temporarily paused this token. It may return — that's their call alone."* |
| **Revoked / expired** | *"This token no longer exists."* Red X, code shown struck, no further action |
| **Unknown code** | Same dead treatment — never reveal whether a code ever existed |

**Universal footer, every state:**
> **Ashish is sealed by default.** No number to find, no inbox to reach, no way to request one. A token like this is the only way in — and only while it lives.

**Rule:** there is no "request access" control anywhere on this page, in any state. That was removed deliberately — an appeal mechanism re-imports the social pressure the product exists to eliminate.

---

# PART I — Build order and inventory

## Screen inventory

| Code | Screen | v7 id | Status |
|---|---|---|---|
| A1 | Onboarding | `s-onboard` | built |
| A2 | Phone entry | `s-phone` | built |
| A3 | OTP | `s-otp` | built |
| A4 | Permission priming | — | **gap** |
| A5 | First-run empty Chats | `s-chats` | built |
| A6 | App lock | — | **gap** |
| B1 | Chats | `s-chats` | built (swipe actions + search are gaps) |
| B2 | Tokens | `s-doors` | built (long-press menu is a gap) |
| B3 | Circles | `s-circles` | built |
| B4 | Calls | `s-calls` | built |
| C1 | Thread | `s-chat` | built |
| C2 | Circle chat | `s-cchat` | built |
| D1 | Token detail | `s-detail` | built (edit-live-token undecided) |
| D2 | Circle detail | `s-circle` | built |
| E1 | You | `s-you` | built |
| E2 | Activity | `s-activity` | built |
| E3 | Plans | `s-plan` | built |
| E4 | Settings | — | **gap** |
| E5 | KYC flow | simulated | **gap** |
| F1–F8 | Sheets & modals | all present | F6 needs grace window |
| G1–G4 | Interrupts | present | call controls are a gap |
| H | Holder web | `webRoot` | built |

## Suggested build sequence

1. **Auth + shell** — A1–A3, tab bar, navigation, empty states. Nothing works yet; the skeleton is right.
2. **The core loop** — F1 mint → B2 → D1 → F3 revoke, against a real backend. This is the product; everything else is support.
3. **Messaging** — C1 + the holder web page + WebSocket, with the token gate enforced **server-side** so a revoke actually severs the socket.
4. **Calls** — B4, G1, G2 and the Exotel bridge. Requires KYC (E5) and TRAI DLT registration first.
5. **Circles** — B3, C2, D2.
6. **Hardening** — A4, A6, E4, offline, F6 grace window, `FLAG_SECURE`, analytics.

## Decisions still open before build

1. Can live tokens be edited, or only narrowed? *(D1 — recommendation: narrowing and expiry extension yes; adding channels no.)*
2. Downgrade behaviour when live tokens exceed the new tier's limit. *(E3)*
3. Does the mint flow auto-write the accompanying message? *(F1)*
4. What replaces the demo-world link in A5 for production — a guided mint, or nothing?
5. Retention mechanic for a quiet week, without reintroducing vanity stats. *(E2)*
