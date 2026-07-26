# Token — Customer Journey (v7)

Two people, two very different journeys. **Ashish (the owner)** installs the app.
**Rahul (the holder)** never installs anything — he only ever sees a web page.
Almost every design decision in Token comes from keeping those two paths separate.

---

## PART A — The Owner Journey

### Stage 0 · The trigger
**Before the app exists to him.**

He does not wake up wanting a "privacy app." He wakes up annoyed:

- He listed his Swift on OLX and now gets 14 calls a day, four months later
- He ordered from a marketplace and the delivery agent now WhatsApps him personally
- A property broker he spoke to once has passed his number to six other brokers
- He gave his number to a showroom for a test drive and now gets loan spam

**Mental state:** irritated, resigned. Believes this is just the cost of having a phone number.
**What must land:** *"You can hand out contact without handing out your number — and take it back."*
**Risk:** the category doesn't exist in his head. He isn't searching for this; it has to be shown to him.

---

### Stage 1 · First open — the three slides
**Screen:** `s-onboard`

1. Sealed by default — no number to leak, no inbox to spam
2. Mint a token to open a door — permission, not identity, like a hotel key card
3. Revoke it and it's gone — the path to you stops existing

**Mental state:** curious but sceptical. *"So it's a second number app?"*
**Job of this stage:** kill that comparison immediately. Doosra gives you a second number; Token gives you *revocable permissions*. The hotel key card metaphor is the whole pitch in one image.
**Friction:** three screens is already the ceiling. Skip link is present for a reason.
**Drop-off risk:** LOW.

---

### Stage 2 · Create the vault
**Screens:** `s-phone` → `s-otp`

Enters his real mobile number, receives an OTP, verifies.

**Mental state:** the first real hesitation. *"Wait — I'm giving my number to a privacy app?"*
**Mitigation on screen:** the number secures the account and routes bridged calls to him. It is never shown to anyone — that is the product. Plus the trust strip: no contact sync ever, encrypted at rest, AWS Mumbai, DPDP compliant.
**Friction:** one field, one OTP. No email, no password, no name, no profile photo.
**Drop-off risk:** MEDIUM. This is the single largest trust ask in the funnel and it arrives before any value has been demonstrated.

---

### Stage 3 · The seal — and the empty room
**Screen:** `s-chats`, empty state

Lands on Chats. Nothing there. Copy reads **"Perfectly silent."** Toast: *"Sealed. Nobody can reach you now."*

**Mental state:** a beat of satisfaction, then *"...now what?"* An empty inbox is simultaneously the promise delivered and an app with nothing in it.
**Design response:** exactly one instruction — mint a token with the button below — plus a demo-world escape hatch for the curious.
**Drop-off risk:** HIGH. This is the classic privacy-product trap: the product working perfectly looks identical to the product doing nothing. If he closes the app here, he may never return.
**Metric to watch:** % of accounts that mint a first token within 24 hours. This is the activation number.

---

### Stage 4 · The first mint — the aha
**Screen:** `sheet-mint`

Three taps: FAB → template (**Marketplace sale** is pre-selected) → **Mint & share**.
Rules arrive pre-set — Chat + Call + SMS, 7 days, 9am–7pm. Naming it is optional. Power users open *Adjust the rules*; nobody is forced to.

If the template includes Call and he isn't KYC-verified, an amber callout appears **inside** the sheet with an inline *Verify now* — it runs there and unlocks the Call chip without ejecting him from the flow.

**Mental state:** *"That was it?"* The pass card appearing — dark, holographic edge, monospace `TOKN-7Q2N-XK9F` — is the moment the abstract idea becomes an object he owns.
**Design principle:** the card must feel like a physical artifact. It is the product's one moment of delight.
**Drop-off risk:** LOW, by design. Every decision that could be deferred has been.

---

### Stage 5 · Sharing it
**Screen:** mint result view

Copy link · WhatsApp · QR code · NFC. He copies and pastes into the OLX chat with Rahul.

**Mental state:** mild anxiety. *"Will he think this is weird? Will it even work?"*
**Mitigation:** *Preview what they see* — he can look at the holder's page before sending. This one button removes most of the social risk.
**Friction:** the real-world friction isn't in the UI, it's the explanation he has to give a stranger. The link needs to be self-explanatory on arrival.
**Drop-off risk:** MEDIUM — and it lives on the *other* side of the link, in Part B.

---

### Stage 6 · The first inbound contact
**Screens:** `s-chats` → `s-chat`, or `incoming` call screen

Rahul messages. A banner slides in, the tab badge lights up, the thread row shows a token chip — `8GH2 · live`. Ashish opens it: a normal chat, except a strip under the header carries the code, the expiry, and Pause / Revoke.

If Rahul calls, a bridged call rings. Both numbers stay hidden. Both ways.

**Mental state:** relief, then quiet delight. *"He's talking to me and he has no idea who I am."*
**This is the true aha** — not the mint, but the first time value passes through the wall without the wall coming down.
**Metric to watch:** % of minted tokens that get redeemed at least once. A minted-but-never-used token means the sharing step failed.

---

### Stage 7 · Living with it
**Screens:** `s-doors` (Tokens tab), `s-calls`

Over the following weeks:

- The Bluekart delivery token expires on its own after 24 hours — no action needed
- A token he's unsure about gets **Paused** — swipe/tap, reversible, no guilt
- The Calls tab logs bridged calls, missed calls, and greyed **bounced** rows: *No token · never rang*

**Mental state:** growing sense of control. The bounce rows are where invisible protection becomes visible — the CCTV clip of someone rattling a locked door.
**Caveat to resolve in the spec:** bounces are attempts on *dead or revoked links and retired relay numbers*, not magical detection of every stranger. The copy must not overclaim.
**Drop-off risk:** MEDIUM. If nothing happens for two weeks, the app goes quiet and slides off the home screen. Expiry nudges and the bounce log are the retention mechanics.

---

### Stage 8 · The revoke — the emotional payoff
**Screens:** `sheet-revoke` → web door state

The deal is done. The car is sold. Rahul is now just a stranger with a phone.

He taps **Revoke** from the chat strip. A confirmation sheet appears with the pass card, a permanence warning, and a **Pause instead** escape hatch. He confirms.

The thread seals. The token card goes grey with a struck-through code. And on Rahul's side, the page reads **"This token no longer exists."**

**Mental state:** clean, quiet power. No blocking, no awkward conversation, no drama. Just silence, restored.
**This is the product's climax.** Everything before it is setup.
**Design constraint:** irreversible actions never happen on a single unconfirmed tap.

---

### Stage 9 · Expansion — Circles
**Screens:** `s-circles`, `sheet-circle`

Family. D-204 Society. One shared token — same `TOKN-` grammar, marked **SHARED** — gets everyone into one private space, and nobody exchanges numbers, not even with each other.

**Mental state:** *"Could this replace the society WhatsApp group?"*
**Honest risk:** this is the hardest ask in the app. It requires other people to adopt, and it competes with WhatsApp groups on WhatsApp's home turf. The society use-case (where members genuinely don't want each other's numbers) is the strongest wedge.
**Drop-off risk:** HIGH for adoption, LOW for harm — an unused Circles tab costs nothing.

---

### Stage 10 · Hitting the wall — monetization
**Screens:** `s-plan` → Razorpay checkout

Free covers 5 live tokens, chat only, 2 circles. The paywall arrives naturally at the moment of *wanting more*, not at the door.

Triggers: a 6th token, a voice bridge, an email relay, or a location drop.

**Mental state:** he has already felt the value, so ₹99 reads as cheap insurance rather than a toll.
**Design principle:** never gate the core loop. Sealing, minting, chatting, and revoking must stay free forever — that is the promise. Charge for volume and channels.

---

### Stage 11 · Exit
**Screens:** `s-you` → export / `sheet-delete`

Export the archive, or delete everything: every token dies instantly, conversations and circles are erased, the vault is wiped. Nobody — including the company — can reach him or reconstruct it.

**Why this matters:** a frictionless exit is a trust signal, not a leak. For a privacy product, the delete button is a *feature*, and DPDP compliance makes it mandatory anyway.

---

## PART B — The Holder Journey (no app, ever)

This is the journey most privacy products get wrong. If Rahul has to install something, the product is dead.

### H1 · The link arrives
In an OLX chat or WhatsApp message: `tokn.app/t/TOKN-8GH2-LP4X`

**Mental state:** suspicion. *"What is this? Is this a scam link? Why won't he just give me his number?"*
**This is the single most fragile moment in the entire product.**

### H2 · The page loads
**Screen:** `webRoot` — grant card

A dark header, an avatar, **"A door to Ashish"**, the token code, and a green verification strip: *Valid token · expires in 22 days · reachable 9:00–19:00*.

Then the channel list: Secure chat, Voice call, SMS bridge — each with a plain-English description. Anything the token doesn't allow is visibly greyed with a lock: *Not allowed by this token*.

**Mental state:** shifts from suspicion to comprehension in about four seconds. Showing the *locked* channels alongside the open ones is what makes it legible — he can see the shape of the permission he's been given.
**Requirement:** loads in under two seconds on 4G, no install, no signup, no cookie wall.

### H3 · He uses it
Taps **Voice call** — it connects through a bridge. Or **Secure chat** — he types, and Ashish's phone lights up.

**Mental state:** *"Oh. It just works."*
**Reciprocity note:** his number stays hidden too. This is worth saying out loud on the page, because it converts the holder from a reluctant participant into someone who benefits.

### H4 · Business verification (when required)
For `bizOnly` tokens, the delivery company verifies a business identity once before the channels unlock. Individuals cannot redeem.

### H5 · The door closes
Later, he opens the link again. **"This token no longer exists."**
Or: **"Paused for now."**

**Mental state:** mild rejection, but no confusion and no target. There's no number to try, no inbox to find, no *"request access"* button to badger — that was deliberately removed. The footer closes it: *Ashish is sealed by default. No number to find, no inbox to reach, no way to request one.*

**Design principle:** silence must be a complete answer. Any appeal mechanism re-imports the social pressure the product exists to eliminate.

---

## The three moments that decide whether Token lives

| # | Moment | Why it's fragile | Current mitigation |
|---|---|---|---|
| 1 | **The empty room** (Stage 3) | Perfect protection is indistinguishable from a dead app | One instruction, one button, demo world |
| 2 | **The stranger opening the link** (H1–H2) | A weird link from a stranger reads as phishing | Preview-before-send, plain-English page, visible locked channels |
| 3 | **Week three silence** (Stage 7) | Nothing happens, app slides off the home screen | Bounce log, expiry nudges, Circles |

---

## Journey metrics worth instrumenting

| Stage | Metric | Meaning |
|---|---|---|
| 2 | OTP completion rate | Trust at the number ask |
| 3→4 | First token within 24h | **Activation** |
| 5→6 | Redemption rate per token | Whether holders trust the link |
| 6 | Contacts per active token | Real usage, not novelty |
| 8 | Revokes per user | Whether the core promise gets exercised |
| 7 | D30 retention | Whether protection stays felt |
| 10 | Free → paid conversion | Whether the wall is placed correctly |

---

## Open questions this journey surfaces

1. **Does Rahul need reassurance before he clicks?** A short human line pasted alongside the link — *"Use this to reach me, it's my contact link"* — may matter more than any UI. Should the app auto-generate that line with the share?
2. **What happens on week three with zero activity?** A weekly *"you stayed sealed; 3 attempts bounced"* digest is the obvious retention loop — but it risks becoming the vanity stat the teardown killed. Needs care.
3. **Is Circles a v1 feature or a v2 wedge?** Retained by decision; the society use-case is real but adoption depends on other people installing.
4. **Should the first-run flow offer a guided mint** (a fake buyer that redeems and messages back) so Stage 3 → 6 happens in ninety seconds instead of days?
