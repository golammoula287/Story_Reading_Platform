# Serial-Fiction Platform — Project Plan

Prepared: 2026-09-24. Status: original planning baseline; Phase 1 local implementation and verification are now recorded in PROJECT_CONTEXT.md and docs/MILESTONE_1.md. External acceptance dependencies remain open.

Source: [WEBSITE DEVELOPMENT CONTRACT.pdf](WEBSITE%20DEVELOPMENT%20CONTRACT.pdf), all 14 pages, sections 1–40. This plan translates its delivery requirements into engineering work; it does not amend the agreement. The source has some Bengali PDF text-extraction artifacts, but the scope, milestone tables, and technical requirements are readable.

Architecture: [ARCHITECTURE.md](ARCHITECTURE.md). Continuing-work context: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## 1. Product and scope

Build a mobile-responsive serial-fiction reading website where the owner publishes stories and chapters, readers discover stories and maintain their reading library, and authenticated readers access free or permanently unlocked premium chapters. Monetization consists of in-chapter advertising and server-verified rewarded-ad unlocks.

The agreed stack is MERN: MongoDB, Express.js, React through Next.js, and Node.js. Next.js is explicitly required for public server-rendered story pages and chapter previews. Keep Express as the reusable business API for a future mobile application.

Roles: visitor, reader, and super admin. Author names are story metadata; a separate author/publisher portal is not part of the agreed scope.

### Included

- Admin story/prologue/chapter management, drafts, ordering, scheduled publishing, scheduled premium-to-free conversion, cover crop/resize, and editable taxonomy.
- User search, suspension/deletion, activity inspection, and comment moderation.
- Email/password authentication, Google Sign-In, discovery, search/filtering, dynamic trending, library, bookmarks, and reading progress.
- Four reading themes, font controls, account-saved preferences, and chapter comments.
- Free and locked chapters; account-persistent reward unlocks; advertising in free and unlocked chapter bodies.
- Configurable public previews, server-side full-content authorization, age/content gate, visible watermark, and layered anti-scraping/copy deterrents.
- Technical SEO, static/policy pages, contact form, responsive layouts, VPS/HTTPS deployment, basic backup, testing, documentation, and complete source delivery.

### Outside this MVP

Native mobile app implementation, subscription/coin systems, payment gateways, an author marketplace, identity-based age verification, invisible/forensic watermarking, and major redesigns or new business features. The agreement's possible future “Phase 2” for forensic watermarking is a later enhancement, not Phase 2 of this three-phase MVP plan.

## 2. Schedule and milestone rules

The contract target is **25 working days**. Proposed allocation: **9 + 9 + 7 days**. These are relative development days, not verified calendar deadlines. The actual advance-receipt/start date and working-week calendar are unknown; do not assume the tentative September 7/8 dates in the contract were met. This is a tight target, dependent on early decisions and provider access; re-estimate after subphase 1.1 using actual capacity and integration results.

| Main phase                                   | Proposed days | Contract milestone | Exit deliverable                                              |
| -------------------------------------------- | ------------- | ------------------ | ------------------------------------------------------------- |
| 1. Foundation, Admin, and Core Reader        | 1–9           | Milestone 1        | Usable content administration and core reader/discovery flows |
| 2. Reading Experience and Monetization       | 10–18         | Milestone 2        | Complete reader and verified rewarded-ad unlock flow          |
| 3. Protection, SEO, Deployment, and Handover | 19–25         | Milestone 3        | Tested production delivery and complete handover              |

At each milestone: demonstrate the work, deliver all source/configuration/documentation completed so far, provide a test guide, and record bugs and review outcomes. Source delivery is required at Milestone 1 even though there is no new payment trigger at that milestone.

Contract delivery terms to preserve (sections 20–26, 34–37):

- Total development fee: BDT 18,000. BDT 6,000 advance before work; BDT 6,000 after Milestone 2 delivery/testing/material-bug correction; BDT 6,000 after Milestone 3 final testing and acceptance. Payment by bank transfer, within the stated maximum three working days after the applicable trigger.
- Each milestone has up to seven working days of client review. Do not treat silence as automatic acceptance; next steps require mutual written agreement. Review waiting time is separate from this proposed development allocation; agree calendar effects explicitly.
- Up to two in-scope revision rounds per milestone; material bug fixes do not consume that limit. Correct material bugs before accepting the affected milestone.
- Final delivery alone does not trigger final acceptance/payment. Minor issues remain covered by maintenance.
- Three months of included maintenance begins on final acceptance, covering existing-feature defects and implementation-caused security/configuration issues.
- Client owns infrastructure accounts and pays recurring provider costs. Do not work directly in the client's GitHub account; deliver source packages at milestones.
- Project-specific ownership transfers upon final payment. Record third-party licenses and provide portable code/configuration.
- Client-dependency delays may adjust the timeline by mutual agreement. Developer delays are not client dependencies. Out-of-scope work requires a written scope/fee/timeline change.

## 3. Phase 1 — Foundation, Admin, and Core Reader

**Goal:** establish the data/access boundaries and complete the first contract milestone.

| Subphase                                       | Days | Work                                                                                                                                                                                                                                                                                                     | Deliverable / completion check                                                                                                                                                                                                             |
| ---------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1 Requirements, UX, and provider feasibility | 1–2  | Confirm brand direction, content language, sample story, page map, data model, access matrix, and missing decisions. Validate a candidate rewarded-ad provider's browser support and authenticated server callback using documentation plus a test callback. Confirm client account/access dependencies. | Wireframes and decision log; provider feasibility result with evidence; architecture and day allocation reviewed. If no compatible provider is available, record the blocker and resolve it before committing to the premium integration.  |
| 1.2 MERN foundation and authentication         | 3–4  | Scaffold separate Next.js frontend and Express API; MongoDB models/indexes; configuration validation; versioned API; validation/error conventions; email/password and Google authentication; roles, session revocation, basic rate limiting, and secure admin creation.                                  | Visitor/reader/admin access checks pass; password and Google sign-in work with available credentials; secrets stay outside source.                                                                                                         |
| 1.3 Admin and publishing                       | 5–7  | Story/prologue editor; chapter drafts, ordering, publishing and scheduling; premium/free and automatic-free settings; cover upload/crop; editable genre/subgenre, trope/tag/descriptor facets; user search, suspend/delete and activity views.                                                           | Admin can create a complete sample story, schedule/reorder chapters, manage taxonomy without deployment, and suspend a user. Core publication scheduler survives restart. Activity screens can be populated as later reader features land. |
| 1.4 Core reader and Milestone 1 delivery       | 8–9  | Responsive public page shell; browse/new/genre sections; search and filters including author/subgenre/tag/trope; rolling trending foundation; library, bookmarks and progress storage. Public endpoints expose approved metadata/preview only from their first implementation.                           | Core reader journey demonstrated; first source bundle, setup guide, schema draft, and test notes delivered.                                                                                                                                |

Phase 1 acceptance:

- Admin can manage stories, covers, chapters and taxonomy; ordinary users cannot invoke admin APIs.
- Email/password and Google login, sign-out and suspended-account enforcement work end to end.
- Library and bookmarks persist across login sessions; basic resume position is stored.
- Discovery/search returns only published, allowed content; trending uses recorded activity rather than a static list.
- Unauthenticated APIs/HTML never return full chapter bodies, including during this early milestone.

## 4. Phase 2 — Reading Experience and Monetization

**Goal:** complete the reading product and demonstrate a real, server-verified unlock.

| Subphase                                  | Days  | Work                                                                                                                                                                                                                                                            | Deliverable / completion check                                                                                                                                                                      |
| ----------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 Reader interface and preferences      | 10–12 | Chapter reader with Day, Night, Grey and Off-White CSS themes; font size and at least serif/sans-serif options; account-persisted preferences; chapter navigation and resume; accessible loading/empty/error states.                                            | Preferences and reading position survive a second browser/device login; long chapters remain readable on mobile.                                                                                    |
| 2.2 Comments and in-chapter ads           | 13–14 | Chapter comments and admin moderation; provider ad slots inserted between narrative blocks on free and unlocked chapters; consent/no-fill/blocked-ad states.                                                                                                    | Moderated comments disappear correctly; ads do not cover text, and ordinary ad failure does not prevent reading authorized content.                                                                 |
| 2.3 Verified premium unlock               | 15–17 | Backend access policy, reward sessions, provider adapter, verified callback, deduplicated reward events, durable account/chapter unlocks and short-lived unlock tokens. Handle abandoned ads, delayed callbacks, duplicates, retries and unavailable inventory. | A valid provider callback grants exactly the intended entitlement; forged browser events and invalid/replayed callbacks cannot grant access. Login after cookie clearing restores existing unlocks. |
| 2.4 Milestone 2 verification and delivery | 18    | Integrate free/locked transitions and reading flow; run security/integration tests; demonstrate, package source and fix milestone-blocking defects.                                                                                                             | Test evidence and Milestone 2 source bundle delivered; material defects resolved before milestone acceptance and payment trigger.                                                                   |

Phase 2 acceptance:

- Logged-out users cannot fetch even a free full chapter; logged-in users without an unlock cannot fetch locked full content.
- A successful verified reward produces one durable unlock, bound to the correct account/chapter. A browser event alone never grants a reward.
- Unlocked chapters continue displaying regular in-chapter ads. No-fill or a missed/failed reward does not silently unlock content.
- Suspended accounts, unpublished chapters and another user's unlock token are rejected.
- Provider production/test access is a dependency. A local simulator is useful for development, but does not establish acceptance of the real integration.

## 5. Phase 3 — Protection, SEO, Deployment, and Handover

**Goal:** finish contractual protection/presentation requirements and deliver an operable website.

| Subphase                                 | Days  | Work                                                                                                                                                                                                                                                          | Deliverable / completion check                                                                                                                             |
| ---------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 Preview configuration and protection | 19–20 | Finish admin percentage/word-count preview controls and immediate safe refresh; rate/bot controls, copy/selection/right-click deterrents, subtle visible watermark, Clean/Mature classification and stored age/content confirmation.                          | No body leakage through HTML, hydration/RSC, JSON, cache, metadata or previews; age checks enforced by API; configurable previews require no redeployment. |
| 3.2 SEO and final public experience      | 21–22 | Crawlable server-rendered public pages; slugs/titles/meta/canonical/headings/internal links/sitemap/robots/Open Graph/appropriate structured data; redirects/404; agreed static/policy pages and contact form; logo; responsive/browser/accessibility checks. | Public HTML contains only approved previews; policies and contact flow work; logo and responsive UI reviewed.                                              |
| 3.3 VPS deployment and operations        | 23    | Client-owned VPS, domain/TLS, reverse proxy, private database access, supervised web/API/worker processes, media persistence, secret configuration, basic firewall, logging, backups and restore drill.                                                       | HTTPS staging/production smoke test; backup restores to a separate test database; deployment and rollback instructions reproducible.                       |
| 3.4 Final acceptance and handover        | 24–25 | Full regression and leakage checks; fix material bugs; final demonstration; complete source package; schema/API/deployment/admin documentation; account inventory and maintenance log.                                                                        | Final source and test evidence delivered for client acceptance; record actual acceptance date before starting the three-month maintenance clock.           |

Phase 3 acceptance:

- Every requirement in the matrix below has evidence and a recorded result; material failures are fixed before acceptance.
- Anonymous source inspection and direct API attacks cannot retrieve full story text; one reader's response cannot leak through a shared cache to another reader.
- Scheduled publishing/free conversion recovers after process downtime, and manual edits do not produce duplicate or incorrectly published chapters.
- Mature content requires confirmation; technical SEO indexes only the content allowed by the chosen age/preview policy.
- Deployed website, backup/restore, contact delivery, real provider callbacks, final logo, and documentation are demonstrated.
- Client receives all frontend/backend/worker source, relevant configuration and deployment files, dependency lockfile/license notes, setup instructions, and a secure account/access inventory without embedding secrets in the archive.

## 6. Requirement-to-phase and test matrix

| Contract source                  | Requirement group                                                                       | Primary delivery                       | Evidence                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Sections 4, 12; pp. 2–3, 6–7     | Publishing, schedules, cover crop, editable taxonomy, user/activity management          | 1.3; activity completion 2.2           | Admin CRUD/schedule demo; permission and crop validation                   |
| Section 5.1; p. 3                | Browse, search/filter, dynamic trending                                                 | 1.4                                    | Combined-filter search and rolling-ranking fixtures                        |
| Section 5.2; p. 3                | Email/Google auth, library/bookmark/resume, comments                                    | 1.2/1.4/2.1/2.2                        | Cross-session reader journey; moderated-comment check                      |
| Sections 5.3–5.4; pp. 3–4        | Themes, fonts, preferences, responsive design, logo                                     | 2.1/3.2                                | Device/theme/font matrix and persisted preferences                         |
| Section 6; p. 4                  | Clean/Mature and self-attested gate                                                     | 3.1                                    | Gate bypass attempts and saved confirmation                                |
| Section 7; pp. 4–5               | In-chapter ads, verified rewards, permanent unlocks                                     | 2.2–2.4                                | Real callback evidence; forged/duplicate callback tests                    |
| Sections 8–9; p. 5               | Configurable SSR preview; no unauthorized full content                                  | Boundary from 1.2 onward; controls 3.1 | Source/RSC/API/cache inspection, preview edge cases                        |
| Section 10; p. 6                 | API rate/bot controls and browser deterrents                                            | Baseline 1.2; finish 3.1               | Excess-request tests; copy deterrent manual checks                         |
| Section 11; p. 6                 | Visible watermark; forensic watermark excluded                                          | 3.1                                    | Reader visual check and privacy-safe identifier                            |
| Sections 13–16; pp. 7–8          | MERN, Next SSR, REST versioning, schema and mobile reuse                                | 1.1–1.2/3.2/3.4                        | Architecture/schema/OpenAPI and public HTML review                         |
| Section 17; p. 8                 | Auth, HTTPS, hashing, validation, secret/admin/VPS security                             | All; deployed check 3.3                | Security regression and configuration review                               |
| Sections 18–20; pp. 8–9          | Client-owned accounts; operational email; source handovers                              | Every milestone                        | Account inventory and delivery receipts                                    |
| Sections 21–24; pp. 9–11         | Review, revision, milestone testing and acceptance                                      | Every milestone                        | Test reports, defects and acceptance record                                |
| Section 22 Milestone 3; p. 10    | Policy/static pages, contact, backup, deployment and docs                               | 3.2–3.4                                | Contact delivery, restore drill, handover checklist                        |
| Sections 25–30, 33–38; pp. 11–14 | Maintenance, ownership/licenses, confidentiality, access, timeline/scope and continuity | Delivery governance                    | Maintenance dates, license/access register, source archives and change log |

Sections 1–3 identify the parties, service relationship and product purpose. Sections 31–32 and 39–40 contain liability, jurisdiction and signature provisions; they remain in the source agreement rather than becoming application features. Do not copy identity, address, bank or card details into project documentation.

## 7. Dependencies and unresolved decisions

These questions do not prevent planning. Resolve each before its dependent implementation; record answers in PROJECT_CONTEXT.md.

| Decision/dependency                                                | Proposed planning assumption                                                                                                        | Owner / needed by                                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Actual start date, working days and current progress               | No completed implementation evidenced in this folder                                                                                | User / before calendar scheduling                                                                  |
| Site name/domain, palette and logo                                 | Calm, eye-friendly responsive UI; provisional branding until supplied                                                               | Client / palette in Phase 1; logo per contract within 25 days of project start and before handover |
| Content/UI language and sample material                            | Unicode content; test Bengali and English rendering/word boundaries                                                                 | Client / 1.1                                                                                       |
| Rewarded-ad provider                                               | No provider selected; browser support plus authenticated S2S completion callback required                                           | Client account + developer proof / 1.1, before 2.3                                                 |
| Ad eligibility, content restrictions, consent and no-fill behavior | Check provider compatibility with the actual Clean/Mature catalogue; fail closed for rewards                                        | Client + developer / 1.1–2.2                                                                       |
| Preview policy                                                     | Support both percentage and word count; propose global default plus per-chapter override; cap below full body                       | Client / before preview UI finalization                                                            |
| Mature public preview and age threshold                            | Proposed: gate mature narrative previews as well as full text; public metadata only before confirmation; threshold/text unconfirmed | Client / before content access policy implementation                                               |
| Cover ratio, upload limits, reader fonts and ad placement          | Configurable implementation values, selected with sample content                                                                    | Client + developer / 1.1–1.3                                                                       |
| Trending formula                                                   | Proposed rolling 7-day score: unique daily chapter readers + 3 × new library additions, deduplicated and abuse-filtered             | Client / 1.4                                                                                       |
| Hosting/database/media/email and Google credentials                | Client-owned accounts with delegated access; provider/budget unselected                                                             | Client / development access early, production before 3.3                                           |
| Static/policy page list and contact destination                    | Proposed About, Contact, Privacy, Terms and Content Policy; client supplies/approves wording                                        | Client / before 3.2                                                                                |
| Deletion/retention and initial content volume/traffic              | Define account anonymization, event retention and realistic load-test target                                                        | Client + developer / schema review                                                                 |

Primary risks: a browser ad provider without S2S rewards, account approval delays, missing content/branding, and insufficient contingency within 25 days. Resolve provider feasibility early; review status at each milestone; record impacts openly rather than remove agreed functionality.

## 8. How work continues

Phase 1 implementation and local verification are complete for the tested workflows; see PROJECT_CONTEXT.md and docs/MILESTONE_1.md for evidence and pending live integration/client review tasks. Keep the context current after each work session, including the exact subphase, completed work, tests, blockers and next action. The initial planning task created no application code. Subsequent authorized work implemented Phase 1 locally; production deployment remains Phase 3.
