# Token — Non-Technical Task Board

**Owner:** Founder (non-technical)
**Scope:** Everything required to publish, operate and commercialise Token that is not engineering
**Excludes:** Company incorporation basics (assumed handled)
**Prepared:** August 2026

---

## Notation

| Mark | Meaning |
|---|---|
| 🔴 | Blocks launch |
| ⏳ | Long lead time — start now regardless of sequence |
| ⚖️ | Requires a professional. Prepare and brief; do not self-execute |
| 🔁 | Recurring duty after launch |
| → | Depends on another task |

---

## Start-now items

Everything else can wait. These cannot.

| Task | Lead time | Subject |
|---|---|---|
| Google Play developer account + recruit 12 testers | 3–5 weeks minimum | 4 |
| Apple Developer Program enrolment | 1–3 weeks | 5 |
| Trademark search on the name | Decision needed in 4 weeks | 3 |
| Data inventory (RoPA) | Feeds both store privacy forms | 1 |
| Privacy policy + terms to counsel | 2–4 weeks turnaround | 1, 2 |
| SMS DLT registration — entity, header, OTP template | 1–3 weeks via SMS provider | 13 |

---

## 1 · Data protection under DPDP

### Build the inventory
- [ ] 🔴 List every personal data field Token collects — phone number, handle, device identifiers, message content, call metadata, IP logs, payment records
- [ ] For each field: purpose, legal basis, retention period, storage location, who can access it
- [ ] Identify which fields are processed by vendors rather than held by you
- [ ] Produce the **Record of Processing Activities** as a single table
- [ ] → Cross-check the RoPA against the actual database schema with the technical founder
- [ ] Mark which fields are encrypted at rest and which are end-to-end

### Consent and notice
- [ ] 🔴 Draft the consent notice shown at onboarding — plain language, itemised, no bundling
- [ ] Confirm consent is separable — a user can decline notifications without declining the service
- [ ] Write the notice in English and Hindi
- [ ] Define how consent withdrawal is handled and what breaks when it happens
- [ ] Record consent versioning — which policy version each user accepted, and when

### Rights handling
- [ ] 🔴 Write the procedure for access requests, with statutory timeline
- [ ] Write the procedure for correction requests
- [ ] Write the procedure for erasure requests → interacts with the 7-day deletion grace window
- [ ] Define the nomination mechanism (DPDP requires it)
- [ ] Build the data export format — what a user actually receives
- [ ] Test each procedure end to end on a dummy account

### Grievance officer
- [ ] 🔴 Appoint a named grievance officer — likely the co-founder
- [ ] Publish name, email and postal address in-app and on the website
- [ ] Write acknowledgement and resolution templates
- [ ] Define response timelines and where they are tracked
- [ ] 🔁 Log every grievance received, with outcome and date

### Retention and deletion
- [ ] Set a retention period for every data class in the RoPA
- [ ] Justify each period in writing — shorter is a selling point here
- [ ] Define what happens to message content when a token is revoked
- [ ] Define what happens to a circle when its owner deletes their account
- [ ] Specify backup retention and how deletion propagates to backups
- [ ] Write the data retention policy document

### Breach response
- [ ] 🔴 Write the incident response runbook — detection, assessment, containment, notification
- [ ] Confirm notification timelines to the Data Protection Board and to affected users
- [ ] Draft the user notification template
- [ ] Define severity tiers and who decides
- [ ] Run one tabletop exercise against a plausible scenario
- [ ] 🔁 Review the runbook quarterly

### Policy documents
- [ ] ⚖️ Brief counsel on the privacy policy, with the RoPA attached
- [ ] Verify the policy matches actual behaviour, not intended behaviour
- [ ] Publish at a stable public URL before store submission
- [ ] 🔁 Review after every feature that touches data

---

## 2 · Intermediary law and content liability

- [ ] Summarise Section 79 safe harbour obligations in your own words
- [ ] 🔴 Confirm which IT Rules 2021 duties apply at Token's current scale
- [ ] Note the significant-social-media-intermediary user threshold and set a monitoring trigger
- [ ] ⚖️ Brief counsel on terms of service
- [ ] 🔴 Include a zero-tolerance clause for objectionable content — Apple requires it explicitly
- [ ] Define acceptable use, prohibited conduct and termination rights
- [ ] Write the law enforcement request protocol — what is valid, who responds, timelines
- [ ] 🔴 **Document the recovery position in writing** — cryptographic recovery means there is genuinely nothing to hand over. Write this before it is tested
- [ ] Define what Token *can* produce on a valid request: account existence, token metadata, timestamps
- [ ] Define what Token cannot produce and why
- [ ] Establish a single point of contact for legal requests
- [ ] 🔁 Log every request received

---

## 3 · IP and brand

- [ ] ⏳ Conduct a trademark search in classes 9, 38 and 42
- [ ] Assess registrability — "Token" is generic in this product class
- [ ] ⚖️ Get a trademark attorney's view on the risk of building on an unregisterable mark
- [ ] **Make the naming decision by week 4**, before brand equity accumulates
- [ ] Note: one documented comprehension failure has already occurred with the current name
- [ ] Secure the domain, and defensive variants
- [ ] Secure social handles across platforms
- [ ] Reserve the app name on both stores — this is first-come
- [ ] Confirm IP assignment from both founders to the company
- [ ] Confirm the licence position on every third-party asset — fonts, icons, libraries
- [ ] Register copyright on brand assets if worthwhile

---

## 4 · Google Play

### Account and access
- [ ] 🔴 ⏳ Create the Play Console developer account
- [ ] Complete identity verification — organisation, not individual, if the company exists
- [ ] 🔴 ⏳ **Recruit 12 testers now.** New personal accounts require 12 testers opted in for 14 continuous days before production access
- [ ] Set up the closed testing track and tester email list
- [ ] Confirm testers will actually remain opted in — dropouts reset the clock

### Compliance forms
- [ ] 🔴 → Complete the Data Safety form directly from the RoPA
- [ ] Declare data collection, sharing, encryption in transit, deletion mechanism
- [ ] Cross-check every answer against real app behaviour
- [ ] 🔴 Complete the IARC content rating questionnaire — answer honestly about open chat between strangers
- [ ] Confirm the target API level meets the current requirement
- [ ] Complete the app access instructions for reviewers — how to test a token flow without a real second party
- [ ] Declare ads status: none

### Policy requirements
- [ ] 🔴 Verify UGC compliance: content filtering, in-app reporting, blocking abusive users, published contact
- [ ] 🔴 Publish the **web-accessible** account deletion page — in-app deletion alone is insufficient
- [ ] Confirm the deletion page states what is deleted and what is retained
- [ ] Review the permissions declaration — justify every permission requested
- [ ] Confirm no restricted permissions are used unnecessarily

### Listing
- [ ] Write the app title within the character limit
- [ ] Write the short description — this is the positioning line
- [ ] Write the full description
- [ ] Produce the app icon at required sizes
- [ ] Produce the feature graphic
- [ ] Produce phone screenshots — minimum count, correct dimensions
- [ ] Produce tablet screenshots if declaring tablet support
- [ ] Select category and tags
- [ ] Add the privacy policy URL
- [ ] Set countries and pricing

### Release
- [ ] Run the closed test for the full 14 days
- [ ] Collect and act on tester feedback
- [ ] Apply for production access
- [ ] Prepare the rejection playbook — common reasons for privacy and communication apps
- [ ] 🔁 Monitor policy change announcements

---

## 5 · Apple App Store

- [ ] 🔴 ⏳ Enrol in the Apple Developer Program as an organisation — requires a D-U-N-S number
- [ ] Set up App Store Connect and TestFlight
- [ ] 🔴 → Complete privacy nutrition labels from the RoPA
- [ ] Ensure nutrition labels and Play Data Safety tell the same story
- [ ] 🔴 Verify Guideline 1.2 UGC compliance — the same four requirements as Play
- [ ] Confirm the 24-hour report response SLA is genuinely staffed
- [ ] Review Guideline 5.1.1 on data collection and storage
- [ ] Confirm account deletion is reachable in-app
- [ ] Prepare reviewer notes explaining the token flow — reviewers will not have a second device
- [ ] Provide a demo token or test account for review
- [ ] Produce screenshots for every required device class
- [ ] Write the App Store description and keyword field
- [ ] Set age rating
- [ ] Submit for review
- [ ] 🔁 Monitor guideline updates

---

## 6 · Trust and safety operations

### Threat model
- [ ] Catalogue abuse specific to Token: forwarded links, second-device access, code enumeration, harassment inside a legitimate token, listing tokens as an attack surface
- [ ] Identify which are mitigated in v11 and which are open
- [ ] Define the abuse signals worth monitoring

### Pipeline
- [ ] 🔴 Specify the report flow end to end: report → server record with context → triage queue → action → notify reporter
- [ ] Confirm the report captures enough context to act on — the audit found it sent nothing anywhere
- [ ] Select triage tooling — a shared inbox is acceptable at launch, a spreadsheet is not
- [ ] 🔴 Define the 24-hour SLA in practice: coverage, weekends, escalation, holidays
- [ ] Write the triage decision matrix: warn, block person, remove content, ban account, escalate
- [ ] Add worked examples to the matrix so decisions stay consistent
- [ ] 🔴 Verify blocking targets the **person** across all future tokens, not just the current one
- [ ] Write a test script proving that behaviour

### Crisis handling
- [ ] Write the protocol for threats of violence
- [ ] Write the protocol for self-harm disclosure, with resources
- [ ] Write the protocol for child safety concerns — including immediate escalation paths
- [ ] Compile authority contact details before they are needed
- [ ] Define who can make an emergency disclosure decision

### Reporting
- [ ] Design the transparency report — categories, cadence, what is published
- [ ] 🔁 Publish half-yearly
- [ ] 🔁 Review the threat catalogue quarterly

---

## 7 · Positioning and go-to-market

### The comprehension problem
- [ ] Read the third-party review that concluded Token was a queue-management app
- [ ] Diagnose why — the name, the first screen, the absence of a stated premise
- [ ] Propose three fixes and test them
- [ ] Rewrite the Home screen brief so the premise lands in two seconds
- [ ] Rewrite onboarding copy against the same standard

### Positioning
- [ ] Write the positioning statement in one sentence
- [ ] Define who it is for, what it replaces, and what it is not
- [ ] Test on ten strangers — can they explain it back?
- [ ] Write the 80-character store line
- [ ] Write the one-paragraph version
- [ ] Write the elevator version for press

### Strategy
- [ ] 🔴 **Resolve replacement versus supplement** with the technical founder — it changes retention strategy, pricing and how hard the recipient side must be optimised
- [ ] Rank the use-case segments: marketplace selling, property, home services, public-facing professions
- [ ] Document why family circles are the weakest segment
- [ ] Write the objection-handling sheet, including the honest limits
- [ ] **Never claim retroactive protection** — if someone already has your number, Token does nothing

### Launch
- [ ] Define launch gates: closed test → open test → production
- [ ] Set the criteria that would stop progression at each gate
- [ ] Define what must be learned at each stage
- [ ] Plan the launch sequence and timing

### Metrics
- [ ] Define activation as **first token redeemed**, not install
- [ ] Define retention meaningfully for a low-frequency product
- [ ] Choose five metrics worth tracking and reject the rest
- [ ] Set up analytics that do not compromise the privacy claim
- [ ] 🔁 Weekly metrics review

### Outreach
- [ ] Build the list of journalists covering privacy and consumer tech in India
- [ ] Write the pitch
- [ ] Identify relevant communities without spamming them
- [ ] Prepare the founder story
- [ ] Prepare responses to the hardest questions: how is this different from a burner number, what stops abuse, what if you get subpoenaed

---

## 8 · Support and help content

*Restored — a published support contact is a store requirement on both Play and Apple.*

- [ ] Select support tooling and set up the inbox
- [ ] 🔴 Publish a support contact — required by both stores' UGC policies
- [ ] Provide a contact path for **holders without accounts** — recipients are users of the service too
- [ ] Define SLA by tier — 24 hours standard
- [ ] Write response templates for the twenty most likely questions
- [ ] Define what support must **never** ask a user for — recovery phrase, payment details
- [ ] Write help articles for the unusual rules:
  - [ ] Why revoke cannot be undone
  - [ ] Why nobody at Token can restore an account
  - [ ] Difference between pause and revoke
  - [ ] What the other person sees, and why they need no app
  - [ ] What happens when a token expires
  - [ ] How to hand over a token in person
  - [ ] What the dead-link count actually measures
- [ ] Write incident communication templates: service down, bug caused harm, data breach
- [ ] 🔁 Review help content after every release

---

## 9 · Vendors and infrastructure governance

*Restored — data processing agreements with vendors are a DPDP legal requirement.*

- [ ] Inventory every vendor touching user data — LiveKit, AWS, SMS provider, analytics, crash reporting, email
- [ ] 🔴 ⚖️ Obtain a **data processing agreement** from each — a DPDP obligation, not optional
- [ ] Confirm data residency for each — AWS Mumbai for primary storage
- [ ] Review each contract for liability caps, SLA, termination and data return
- [ ] Confirm sub-processor disclosure obligations
- [ ] Set renewal reminders
- [ ] Define what happens if a vendor fails — particularly LiveKit Cloud
- [ ] 🔁 Annual vendor review

---

## 10 · Release and QA

- [ ] Learn to write a bug report a developer can act on without follow-up
- [ ] Build the manual QA checklist covering every flow in the prototype
- [ ] Define the pre-release smoke test
- [ ] Test on low-end Android devices, not just flagships
- [ ] Test on a slow connection and offline
- [ ] Test the holder web page on old browsers
- [ ] Verify Hindi rendering everywhere
- [ ] Verify accessibility: touch targets, contrast, screen reader on key flows
- [ ] Verify every destructive confirmation behaves as specified
- [ ] Verify revoke is genuinely irreversible in the built app
- [ ] Define the release approval gate — who signs off
- [ ] Set up crash reporting review
- [ ] Define the force-upgrade policy for critical fixes
- [ ] 🔁 Post-release monitoring for the first 48 hours

---

## 11 · Compliance calendar

Build one calendar with owners and dates.

| Duty | Frequency |
|---|---|
| Abuse report triage | Daily |
| Grievance responses | Within statutory timelines |
| Metrics review | Weekly |
| Compliance calendar review | Monthly |
| Financial reporting to CA | Monthly |
| Policy review — privacy, terms, retention | Quarterly |
| Threat catalogue review | Quarterly |
| Incident runbook drill | Quarterly |
| Transparency report | Half-yearly |
| Vendor and contract review | Annual |
| Trademark renewals | Per registry |
| Store policy monitoring | Continuous |
| Phishing / clone monitoring | Continuous |
| Regulatory watch — DPDP Rules, TRAI OTT, CERT-In | Continuous |

---

## 12 · Registrations and statutory reporting *(new)*

### SMS DLT — login OTPs depend on this
- [ ] 🔴 ⏳ Register as a **principal entity** on a DLT platform via your SMS provider
- [ ] Register the sender header (the 6-character SMS ID users will see)
- [ ] Register and get approval for the OTP message template — exact wording, variable placeholders
- [ ] Test delivery on all major Indian operators
- [ ] Note: the VoIP pivot removed calling KYC; it did **not** remove SMS DLT. Login does not work without this
- [ ] Evaluate the fallback if SMS fails — voice OTP and WhatsApp OTP have their own approval paths

### CERT-In directions
- [ ] 🔴 Read the CERT-In directions as they apply to a service provider
- [ ] Build the **6-hour incident reporting** workflow — what qualifies, who reports, to which address, in what format
- [ ] Confirm 180-day log retention with the technical founder — which logs, where
- [ ] Confirm system clocks sync to NIC/NPL sources
- [ ] Keep this **separate from** the DPDP breach runbook — different recipients, different timelines, different thresholds
- [ ] 🔁 Review when CERT-In updates its directions

### Regulatory watch
- [ ] 🔁 Track finalisation of the DPDP Rules — obligations firm up when they do
- [ ] 🔁 Track TRAI's OTT consultation — Token is exactly the category under discussion
- [ ] Note the Significant Data Fiduciary trigger — additional duties if designated
- [ ] Note the significant-social-media-intermediary user threshold from section 2

---

## 13 · Age, consumers and fair dealing *(new)*

### Children under DPDP
- [ ] 🔴 Decide the minimum age — realistically 18, since under-18 requires verifiable parental consent
- [ ] State the age requirement at signup and in the terms
- [ ] Confirm no behavioural tracking that could touch children — prohibited outright
- [ ] Align the store age ratings with the declared minimum age
- [ ] Write the policy for discovering an underage account

### Consumer protection
- [ ] Publish a refund and cancellation policy at a stable URL *(required once the paid tier ships)*
- [ ] Ensure auto-renewal is disclosed clearly before purchase, with renewal reminders
- [ ] Make cancellation as easy as signup — no retention maze
- [ ] Consolidate the officer roles — DPDP grievance officer, IT Rules grievance officer and consumer grievance contact can be one person with one published address
- [ ] Acknowledge the Grievance Appellate Committee route — users can appeal your grievance decisions to the GAC

### Dark patterns
- [ ] Read the CCPA Dark Patterns Guidelines
- [ ] Audit onboarding, consent, paywall and cancellation flows against them — no confirm-shaming, no forced action, no sneaking
- [ ] Keep "Pause instead" prominent — it is the opposite of a dark pattern and evidence of good faith
- [ ] Re-audit after any pricing or flow change

---

## 14 · Holder-side legal surface *(new)*

*Recipients use Token without accounts. The web page is a service to them and needs its own legal footing.*

- [ ] Write a short **holder privacy notice** — what is collected on the page (messages, IP, device basics), retention, and their rights
- [ ] Link it from the token page footer without cluttering the page
- [ ] Add the cookie/storage line if the page sets anything
- [ ] Decide whether holders accept lightweight terms by using the page, and state it
- [ ] Give holders a contact path that does not require an account
- [ ] Translate the notice into Hindi alongside the page itself

---

## 15 · Operational security and brand defence *(new)*

### Founder account security
- [ ] 🔴 Enable 2FA on Play Console, App Store Connect, AWS, domain registrar, DNS, email, gateway
- [ ] Set up a shared credential vault for the two founders
- [ ] Add recovery contacts and backup codes for every critical account — losing the Play account is losing the app
- [ ] Document the bus factor: what happens if one founder is unreachable
- [ ] Lock the domain against transfer; enable registry lock if available
- [ ] Set up SPF, DKIM and DMARC so the domain cannot be spoofed in phishing mail

### Phishing and impersonation
- [ ] Register the obvious lookalike domains defensively
- [ ] 🔁 Monitor for cloned holder pages — **the** predictable attack on this product
- [ ] Write the takedown process: registrar abuse contact, host abuse contact, Google Safe Browsing report
- [ ] Watch app stores for impersonating apps
- [ ] Tell users, in help content, how to verify a genuine token link

### Responsible disclosure
- [ ] Publish a vulnerability disclosure policy — how researchers report, what is in scope, response commitment
- [ ] Publish security.txt on the domain
- [ ] Define who triages security reports and how fast
- [ ] Decide on acknowledgements or rewards — even a hall-of-fame page is credibility for a privacy brand

### Beta testers
- [ ] Light tester agreement for the twelve — confidentiality, feedback licence, no screenshots publicly
- [ ] Collect consents before distributing builds

---

## 16 · Payments and tax *(parked, not deleted)*

*Excluded from current scope per decision — unit economics waits for final architecture. These return **before the paid tier ships**; KYB and GST have lead times.*

- [ ] Payment gateway selection and KYB
- [ ] RBI e-mandate rules for recurring subscriptions
- [ ] Store billing versus external payment decision
- [ ] Refund policy and process — also a consumer-protection requirement, see section 13
- [ ] ⚖️ GST registration position, treatment of subscriptions, place-of-supply
- [ ] Compliant invoicing

---

## Dependency chain

The order that matters. Everything else is flexible.

```
Data inventory (RoPA)
   ├─→ Privacy policy
   ├─→ Play Data Safety form
   ├─→ Apple privacy labels
   └─→ Retention policy
           └─→ Deletion mechanism
                   └─→ Web-accessible deletion page (Play requirement)

Trust & safety pipeline
   └─→ UGC compliance evidence
           ├─→ Play submission
           └─→ Apple submission

Play developer account
   └─→ 12 testers × 14 days
           └─→ Production access


Positioning statement
   ├─→ Store listing copy
   ├─→ Onboarding copy
   └─→ Press materials

SMS DLT registration
   └─→ OTP login works
           └─→ Closed test can begin
                   └─→ 12 testers × 14 days

RoPA
   └─→ Vendor DPA list
           └─→ Holder privacy notice
```

---

## The six that would actually stop launch

If nothing else gets done, these do.

1. **Play's 12 testers for 14 days** — pure calendar time, cannot be compressed
2. **Data inventory** — both stores' privacy forms depend on it, and mismatches cause rejection
3. **UGC compliance evidence** — filtering, reporting, blocking, published contact. Missing any one is an automatic rejection on both stores
4. **Web-accessible account deletion** — Play requires a URL, not just an in-app path
5. **Named grievance officer, published** — statutory requirement, not optional
6. **SMS DLT registration** — login OTPs do not deliver without it, which blocks the closed test itself

---

*Task board · Token project · August 2026*
