# Token — Functional Specification

**Version:** v1.0 (derived from interactive prototype v3)
**Scope:** Product functionality and user flows only. Technical architecture, stack, and infrastructure are covered separately (see `token-architecture.html`).
**Status:** Full target scope, sequencing/MVP cut not yet decided.

---

## 1. Product Overview

**Token** is a deny-by-default communication app. By default, nobody can contact the user — no phone number, no email, no inbox is exposed to anyone. To let someone in, the user mints a **token**: a revocable, rule-bound permission that grants *contact*, never *identity*.

A token behaves like a hotel key card, not a phone number:
- It works only for what it was scoped to do (specific channels, specific time window, specific number of uses).
- It can be paused or killed at any moment, instantly and unilaterally, by the person who minted it.
- The holder never learns the owner's real phone number or email, regardless of which channels the token permits.

The product has two surfaces:
1. **The app** — where the owner (e.g. Ashish) mints tokens, manages them, and receives everything that comes through them.
2. **The redemption web page** (`tokn.app/t/CODE`) — what a token holder sees when they open a token link. No app install required to redeem a token.

---

## 2. Glossary

| Term | Meaning |
|---|---|
| **Token** | A revocable permission object with a unique code (e.g. `TOKN-8GH2-LP4X`), a label, allowed channels, and rules (expiry, usage limit, reachable hours, business-only gate). |
| **Owner** | The person who mints and controls tokens (the app user). |
| **Holder** | The person or business on the receiving end of a token — accesses it via the redemption web page. |
| **Redemption** | Any act of a holder using a token (sending a chat message, placing a call, requesting location, etc.). |
| **Bridge** | A relay mechanism (voice or SMS) that connects owner and holder without exposing either party's real number. |
| **Relay address** | A masked, token-specific email address that forwards to the owner's real inbox. |
| **Revoke** | Permanently kill a token. The redemption page goes dead immediately; no further contact is possible through it. |
| **Pause** | Temporarily freeze a token without destroying it. Can be resumed later. |
| **Verified-business-only** | A rule that requires the holder to pass a business-identity check before the token's channels unlock. |

---

## 3. User Roles

### 3.1 Owner
The primary app user. Has a sealed identity vault (real phone/email, never exposed). Mints, manages, and revokes tokens. Approves or denies inbound access requests. Receives all communication that flows through active tokens inside one inbox.

### 3.2 Holder (individual)
Anyone who receives a token link, QR code, or NFC tap. No account or app install required. Interacts entirely through the redemption web page. Can request access if they don't already hold a token.

### 3.3 Holder (verified business)
A holder acting on behalf of a business, redeeming a token that has the "verified businesses only" rule. Must pass a business-verification step before any channel unlocks.

---

## 4. Screen Inventory

### App (owner-facing)
| Screen | Purpose |
|---|---|
| Onboarding (3 slides) | Explains the deny-by-default concept before signup |
| Phone entry | Creates the vault; collects the real number (never shown to holders) |
| OTP verification | Confirms phone ownership |
| Vault sealed confirmation | Success state before entering the app |
| Home | Daily dashboard — stats, activity feed, pending access requests |
| Tokens (list) | All tokens, grouped by state (active / expiring / paused / revoked) |
| Token detail | Full rules, QR code, redemption timeline, pause/resume/revoke controls |
| Inbox (thread list) | All conversations, one per token that has an active chat |
| Chat thread | Messaging with a specific holder, scoped to one token |
| Notifications center | Full history of security/activity events |
| Contacts | Every holder, derived from tokens issued |
| Plans | Tier comparison and upgrade flow |
| Profile / Settings | Identity vault, KYC status, appearance, data export, account deletion |

### Overlays (app)
| Overlay | Purpose |
|---|---|
| Mint sheet | Create a new token (templates, channels, rules) |
| Mint result | Share options for a freshly minted token |
| Location-request approval sheet | Approve/deny a holder's live-location request |
| Access-request review sheet | Approve/deny an inbound "request access" submission |
| Delete-account confirmation sheet | Final confirmation before wiping the account |
| QR enlarge sheet | Full-size scannable QR for a token |
| Payment modal | Plan upgrade checkout |
| Incoming call screen | Simulates a bridged call arriving |
| Active call screen | In-call state with timer |

### Web (holder-facing, no login)
| Screen/state | Purpose |
|---|---|
| Active token — channel picker | Shows allowed channels; holder picks one |
| Chat (web side) | Holder's view of the same thread as the owner's Chat screen |
| Voice call (web side) | Holder's in-call state |
| SMS relay card | Displays a temporary relay number |
| Email relay card | Displays a masked relay address |
| Location request → waiting state | Shown after a holder requests a location drop |
| Business verification gate | Shown when a token is business-only and the holder hasn't verified |
| Revoked / dead state | Shown when a token has been killed |
| Paused state | Shown when a token is temporarily frozen |
| Request-access form | Lets a holder without a token ask the owner for one |
| Request-sent confirmation | Acknowledges a submitted access request |

---

## 5. Feature Specifications

### 5.1 Onboarding & Identity

**F-01 — Concept walkthrough**
Three-slide intro explaining: (1) sealed-by-default, (2) minting a token opens a door, (3) revoking kills the door instantly. Skippable at any point.

**F-02 — Phone-based signup**
- Owner enters a mobile number.
- OTP sent and verified (4-digit in prototype; real implementation should follow standard OTP length/expiry conventions).
- On success, the vault is created and marked "sealed" — no communication is possible until at least one token exists.

**F-03 — Identity vault**
- Stores the owner's real phone number and real email.
- Both fields are masked by default in Settings (`+91 ••••• ••842`) with a reveal/peek toggle.
- Neither value is ever transmitted to a holder through any channel, regardless of token rules.

**F-04 — KYC verification**
- Optional, one-time identity verification (in prototype: simulated DigiLocker check, ~2 seconds).
- **Gates the Call/voice-bridge channel** — a token cannot include the Call channel until the owner has completed KYC. This is enforced at mint time (channel chip is disabled/blocked with an explanatory message).
- Status surfaced as a chip in Profile: Unverified → Verifying → Verified.

---

### 5.2 Token Lifecycle

**F-05 — Mint a token**
Inputs collected:
- **Label** — free text, describes who/what the token is for.
- **Template** (optional, see F-06) — prefills the rest of the form.
- **Channels** — multi-select from: Chat, Call, SMS, Email, Location. At least one required. Call is disabled unless KYC is complete.
- **Expiry** — 24 hours / 7 days / 30 days / Never.
- **Usage** — Single-use / Multi-use.
- **Reachable hours** — All day / 9:00–19:00 / Weekdays only.
- **Verified-businesses-only** toggle.

On mint: a unique code is generated (format `PREFIX-XXXX-XXXX`), the token is added to the owner's list in **active** state, and a share step is presented.

**F-06 — Mint templates**
One-tap presets that prefill the mint form:

| Template | Prefilled channels | Expiry | Usage | Window | Business-only |
|---|---|---|---|---|---|
| Custom | Chat | 7 days | Multi-use | All day | No |
| Delivery | Chat, Location | 24 hours | Single-use | All day | Yes |
| Marketplace sale | Chat, Call, SMS | 7 days | Multi-use | 9:00–19:00 | No |
| Contractor | Chat, Call | 30 days | Multi-use | Weekdays | No |
| Dating / new match | Chat | 7 days | Multi-use | All day | No |

All fields remain editable after a template is applied.

**F-07 — Share a minted token**
Four distribution methods, all deep-linking to the same redemption page:
- Copy link (`tokn.app/t/CODE`)
- WhatsApp share
- QR code (scannable, generated per token)
- NFC tap

**F-08 — Preview**
From the mint-result screen or from token detail, the owner can preview exactly what a holder sees when they open the token — i.e. jump straight to the redemption web view for that code.

**F-09 — Pause / Resume**
- Pause freezes a token without deleting it or its history. While paused, the redemption page shows a "paused" state and no channel is usable.
- Resume returns it to active immediately.
- Distinct from revoke — reversible, and does not appear as a security event to the holder beyond "check back later."

**F-10 — Revoke**
- Permanent, irreversible. The redemption page immediately shows a "revoked" dead state.
- Any open chat thread is marked with a "token revoked" system line; no further messages can be sent by the holder.
- Triggers a notification and a timeline entry ("Revoked — line went dead").
- Available from: token detail, token list (swipe/action — not built in prototype but implied), and directly from an open chat thread.

**F-11 — Token detail / redemption timeline**
Every token has a full activity log: minted, first redeemed, each message/call/relay-issue event, pause/resume, revoke. Displayed newest-first as a vertical timeline.

**F-12 — QR code per token**
Every token has a generated QR code, viewable at small size in the token detail screen and full-size in a dedicated enlarge sheet.

---

### 5.3 Redemption (Web / Holder Side)

**F-13 — Channel picker**
The core redemption page. Shows:
- Owner's display context (avatar-style initial, not real name unless the owner chose to label it that way).
- Token verification banner (verified, expiry, usage type, reachable-hours if restricted, business-verified badge if applicable).
- One row per channel the token allows; disallowed channels are shown greyed-out with a lock icon rather than hidden, so the holder understands the boundary.
- A privacy note reiterating that no phone number/email is ever exposed and that access can be revoked at any time.

**F-14 — Dead / paused states**
- **Revoked:** clear messaging that the door was closed, with no alternate path except submitting a fresh access request.
- **Paused:** softer messaging ("check back later"), also with an access-request fallback.

**F-15 — Business verification gate**
If a token is marked verified-businesses-only, the channel picker is replaced with a single "Verify as a business" action. On completion (simulated business-registry check), the page reloads into the normal channel picker with a "redeemed as [Business Name] ✓" badge.

---

### 5.4 Communication Channels

**F-16 — Chat**
- Two-way, real-time-style messaging scoped to one token.
- Owner side: read receipts (delivered/read ticks), typing indicator when a reply is being composed, attach button (stubbed).
- Holder side: same conversation, mirrored, no attachments in prototype.
- A message sent from either side must appear in the other side's view/inbox without a page reload (prototype uses shared in-memory state; real implementation needs real-time delivery, e.g. push + sockets).

**F-17 — Voice call (bridge)**
- Requires KYC (see F-04) and the Call channel to be enabled on the token.
- Holder taps "Voice call" → sees an outbound-call UI ("Calling [Owner]…") with a live timer once connected.
- Owner sees a native-style incoming-call screen with Accept/Decline.
- Both parties' real numbers stay hidden throughout — this is a relay/bridge, not a direct connection.
- Ending the call from either side ends it for both; the event is logged to the token's timeline.
- A declined or unanswered call produces a missed-call notification for the owner.

**F-18 — SMS bridge**
- Holder taps "SMS" → is issued a temporary relay number, explicitly time-boxed (15 minutes in prototype).
- Texts sent to that number route through the token to the owner; the relay number stops working after expiry.
- Logged to the token's timeline as "SMS relay number issued."

**F-19 — Email relay**
- Holder taps "Email" → is shown a masked relay address unique to that token (e.g. `t-tokncode@relay.tokn.app`).
- Mail sent there forwards to the owner's real inbox; replies stay masked.

**F-20 — Location drop**
- Holder taps "Location" → a request is sent to the owner; the holder's page shows a waiting state.
- Owner receives a notification/banner and an approval sheet with a duration selector (15 minutes / 1 hour / until delivered).
- On approval: a live pin is shared for the chosen duration; explicitly **never** a saved/home address — only current position.
- On denial: the holder's waiting card is silently removed; no explanation is given (consistent with the deny-by-default philosophy).

---

### 5.5 Inbox, Notifications & Activity

**F-21 — Inbox**
List of all threads, one per token with chat activity. Shows holder name, token code, last message preview, timestamp, unread count. Empty state explains that conversations only appear when someone redeems a token.

**F-22 — Notification center**
Chronological log of all account events: security bounces (contact attempts without a valid token), messages received, tokens nearing expiry, revocations, KYC completion, access requests. Unread items are visually flagged; opening the center marks them read.

**F-23 — In-app banner (toast-style)**
A dismissible top banner surfaces real-time events while the owner is active in the app (new message, missed call, location request, access request). Tapping it deep-links to the relevant screen (thread, request sheet, etc.). If an event fires while the owner is on the web-preview side, the banner is deferred and shown when they switch back to the app.

**F-24 — Home dashboard**
At-a-glance stats: live token count, redemptions in last 7 days, bounced (unauthorized) contact attempts in last 7 days, days fully sealed. Plus a recent-activity feed and, if present, pending access-request cards requiring action.

---

### 5.6 Trust & Safety

**F-25 — Report & Block**
From an open chat thread, the owner can report and block the holder. This immediately revokes the underlying token (no separate confirmation step in prototype — consider adding one for the real build) and marks the thread as blocked; no further messages can be sent by that holder.

**F-26 — Unauthorized-contact bouncing**
Any attempt to reach the owner without a valid, active token is rejected at the door and logged as a security event ("Contact attempt without a token — bounced") rather than silently dropped, so the owner has visibility into pressure/harassment attempts.

---

### 5.7 Contacts

**F-27 — Token holders directory**
Derived view (not a separately managed list) showing every entity that has ever held a token, their channel permissions, and current token status (active/paused/revoked). Tapping an entry opens that token's detail screen.

---

### 5.8 Reverse Flow — Requesting Access

**F-28 — Request access (holder-initiated)**
A holder without any token can submit a request from the redemption domain: name/business, and a reason. This does **not** create a token — it creates a pending request visible only to the owner.

**F-29 — Review & respond (owner-side)**
Pending requests appear as an actionable card on Home. Opening one shows the requester's name and stated reason, plus a duration selector for the token that would be minted on approval.
- **Approve:** mints a new token on the spot (in prototype: Chat + Call, multi-use, chosen duration) and notifies the owner that access was granted. The requester's page updates accordingly the next time they check.
- **Deny:** the request is marked denied; the requester receives no notification or explanation — silence is the product's designed response to a denial.

---

### 5.9 Plans & Billing

**F-30 — Tiered plans**

| Plan | Price | Included |
|---|---|---|
| Free | ₹0 | 5 live tokens, Chat channel only, 7-day inbox history |
| Plus | ₹99/mo | 25 live tokens, Voice + SMS bridges, Email relay, QR + NFC sharing |
| Pro | ₹249/mo | Unlimited tokens, Location drops, Templates & advanced rules, priority support |
| Business | ₹999/mo | Token API & webhooks, verified-sender badge, team seats/roles, redemption analytics |

**F-31 — Upgrade/downgrade flow**
Selecting a paid plan opens a checkout modal (UPI / Card / Netbanking options) with a processing state and a success confirmation. Downgrading to Free applies at the end of the current billing cycle (no proration logic defined yet — open question, see §10).

*Note: the exact feature-to-plan mapping (e.g. which channels require which tier) is illustrative from the prototype and should be revisited against real cost-to-serve for SMS/voice bridging before finalizing.*

---

### 5.10 Account & Data

**F-32 — Appearance / theme**
Full light/dark theme toggle, available from both the header and Settings. Applies instantly across app and web-redemption surfaces.

**F-33 — Data export**
One-tap request to export all account data (tokens, threads, timeline, vault) into an archive. In the real build this should satisfy DPDP data-portability expectations — define delivery mechanism (email link, in-app download, etc.) before build.

**F-34 — Delete account**
- Requires explicit confirmation via a dedicated sheet that states the consequence plainly: every token dies instantly, all conversations are erased, vault is wiped, and no reconstruction is possible afterward — including by the operator.
- On completion, the owner is returned to the onboarding start state.

---

## 6. Key End-to-End User Flows

### 6.1 First-time setup
1. Onboarding slides (skippable)
2. Enter phone number
3. Verify OTP
4. See "vault sealed" confirmation
5. Enter the app → Home (empty/default state)

### 6.2 Mint → share → get redeemed → converse
1. Owner taps Mint (tab bar center action)
2. Picks a template or goes custom; adjusts channels/rules
3. Mints → sees share options → copies link (or shows QR / sends via WhatsApp / NFC)
4. Holder opens the link → sees the channel picker
5. Holder sends a chat message
6. Owner receives a notification/banner and the message appears in Inbox
7. Owner replies from the Chat screen; holder sees the reply on the web side without needing to refresh in a meaningful way

### 6.3 Voice call
1. Owner has completed KYC and minted a token with the Call channel
2. Holder taps "Voice call" on the redemption page
3. Owner's app shows an incoming-call screen; Accept or Decline
4. If accepted: both sides see a live timer; either side can end the call
5. Event logged to token timeline; if declined/missed, owner gets a notification

### 6.4 Location request
1. Holder taps "Location" on a token that allows it
2. Holder's page enters a waiting state
3. Owner gets a notification/banner → opens the approval sheet → picks a duration → approves or denies
4. Holder's page updates to reflect the shared pin (with duration) or the request quietly disappearing on denial

### 6.5 Revoke
1. From token detail (or an open chat thread), owner taps Revoke
2. Token status flips to revoked; timeline entry added; notification generated
3. Holder's redemption page (and any open chat) immediately reflects the dead state

### 6.6 Reverse request-access flow
1. A non-holder visits the base redemption domain (or a shared "ask for access" link) and submits name + reason
2. Owner sees a pending request card on Home
3. Owner approves (mints a token, holder gains access) or denies (silence)

### 6.7 KYC-gated voice unlock
1. Owner attempts to enable Call while minting a token, without prior KYC
2. Channel is blocked with an explanatory prompt
3. Owner goes to Profile → Verify now → completes the (simulated) check
4. Call channel becomes available for future (and, per product decision needed — see §10, possibly existing) tokens

### 6.8 Account deletion
1. Owner goes to Profile → Delete account
2. Confirmation sheet states consequences explicitly
3. On confirm: all tokens revoked, all data wiped, owner returned to onboarding start

---

## 7. Business Rules & Logic

- **Channel availability is gated per-token at mint time**, not globally — a token's channel set is fixed at creation (editability of an existing token's channels after minting is an open question, see §10).
- **Call channel requires owner KYC** to be selectable during minting. This is the only cross-cutting gate between account state and token capability in the current spec.
- **Revoke is irreversible; Pause is reversible.** These must remain distinct states in any data model — do not conflate them.
- **No real contact detail (phone/email) is ever exposed to a holder**, regardless of which channels a token permits. Voice is bridged, SMS/email use relays.
- **Denial (of a location request or an access request) produces no signal to the requester.** This is an intentional design principle, not a gap — silence-as-denial should be preserved in the real build.
- **Unauthorized contact attempts are logged, not just blocked**, so the owner retains visibility into pressure attempts against their vault.
- **Business-only tokens gate the entire channel picker**, not individual channels — verification is all-or-nothing per token.

---

## 8. Token State Reference

| State | Redemption page shows | Channels usable | Reversible? |
|---|---|---|---|
| **Active** | Full channel picker | Yes, per token rules | — |
| **Expiring** (nearing expiry) | Full channel picker + expiry warning | Yes | Becomes Expired automatically |
| **Paused** | "Paused, check back later" | No | Yes → Active |
| **Revoked** | "Revoked" dead state | No | No |
| **Expired** *(implied, not fully modeled in prototype)* | Should behave like Revoked from the holder's side | No | No — needs explicit decision, see §10 |

---

## 9. Explicitly Out of Scope for This Document

- Backend architecture, service boundaries, database schema, and infrastructure — see the separate architecture document.
- Third-party vendor selection (telephony, KYC provider, payments) — covered in prior build-guidance discussion, not restated here.
- Visual design system specifics (color tokens, typography) — reference the prototype file directly as the source of truth.
- Pricing/monetization strategy validation — the tier table in §5.9 reflects the prototype's illustrative pricing, not a costed model.

---

## 10. Open Questions / Decisions Needed

1. **Editing a live token:** Can an owner change a token's channels/rules after it's been shared, or must they revoke and re-mint? The prototype only supports the latter.
2. **Expired vs. Revoked:** Should an expired token's redemption page look identical to a revoked one, or carry different messaging (e.g. "this expired, want to request a new one?")? Not yet decided.
3. **Multi-device / multi-owner:** Is Token single-owner-single-device only, or does the real product need session management across devices?
4. **Downgrade proration:** What happens to tokens beyond the new tier's limit when downgrading (e.g. Pro → Free with 12 active tokens)? Auto-pause the oldest? Block downgrade until manually reduced?
5. **Report & Block confirmation:** Should this require a confirmation step before it revokes the token, given it's currently a single tap?
6. **Data export delivery:** Email link, in-app file, or both? Retention period for the export itself?
7. **KYC re-verification:** Does KYC ever expire or need periodic re-confirmation, or is it one-time for the life of the account?
8. **Rate limiting / abuse:** What stops someone from spamming "request access" submissions? Not addressed anywhere in the current spec.

---

*This document reflects the functionality demonstrated in `token-v3.html`. Where the prototype simplified or simulated behavior (OTP, KYC check, payment processing, QR generation), that is noted inline so the real build can define the actual mechanism.*
