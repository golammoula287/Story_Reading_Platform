# Project Context

Last updated: 2026-09-24.

## Purpose and current instruction

Build a serial-fiction reading platform based on the local 14-page WEBSITE DEVELOPMENT CONTRACT.pdf. The user requested: read the entire document, plan carefully using MERN, organize delivery into three main phases with subphases, then establish a context file before further implementation.

Current status: **Phase 1 local build and tested workflows pass; live external checks and client acceptance remain pending.** Root: `D:/Naeem_Project/Story reading platform`. Backend: `apps/api`; frontend: `apps/web`; shared contracts: `packages/contracts`.

The user has resumed work and authorized completing the remaining checks one by one. On 2026-09-24, `npm run build`, `npm run typecheck`, and all 15 MongoDB integration tests passed from the relocated root. The built website/API run locally through `npm start`; the database runs through `npm run db:local`. Desktop/mobile discovery and the reader browser journey passed. The admin journey passed after changing its test locator to the accessible status combobox; no app fix was required. All three browser journeys now have passing evidence across the initial run and focused rerun.

See [Milestone 1 report](docs/MILESTONE_1.md) for exact coverage and limits. Source handover is generated in `releases/` by `npm run package:milestone`, with archive/file checksums. Temporary browser-test accounts are removed; a permanent administrator account was provisioned for the user. Atlas connectivity has been verified. Production-domain Google Sign-In and rewarded-ad callback proof remain pending. Do not describe the whole milestone as contractually accepted.

## Read order and authority

1. This file for current status and next actions.
2. [PROJECT_PLAN.md](PROJECT_PLAN.md) for phase/subphase tasks, timing, scope mapping, dependencies and acceptance.
3. [ARCHITECTURE.md](ARCHITECTURE.md) for system, database, access/API and operational design.
4. [WEBSITE DEVELOPMENT CONTRACT.pdf](WEBSITE%20DEVELOPMENT%20CONTRACT.pdf) for exact agreed requirements and contractual terms.

The full source was read, including all technical, milestone, delivery and maintenance sections. Some Bengali extraction characters are imperfect. Do not invent missing information. Product requirements in the agreement are distinct from proposed engineering defaults in these documents. Clarify conflicts and record decisions rather than silently changing scope.

## Product baseline

- Admin publishes serialized stories, prologues and ordered chapters with editable taxonomy and cover uploads.
- Readers discover/search/filter stories, maintain a library/bookmarks/progress, comment, and customize reading preferences.
- Day, Night, Grey and Off-White themes; font size and serif/sans-serif choices; account persistence.
- Full chapters always require login. Premium chapters also require a verified, durable account unlock.
- Both free and unlocked chapters contain in-chapter advertising. Reward unlocks require authenticated provider server-to-server verification.
- Public story pages and approved chapter previews use Next.js SSR for SEO.
- Clean/Mature classification, stored self-attestation, visible watermark and layered anti-copy/scraping controls are in scope.
- Static/policy pages, contact form, logo integration, responsive UI, VPS/HTTPS, backup, tests and source/documentation handover are required.

## Architecture baseline

Contractually required: **MongoDB + Express.js + React via Next.js + Node.js**, versioned REST API, VPS, HTTPS and modular separation supporting a future native client.

Proposed defaults:

- TypeScript monorepo with `apps/web`, `apps/api`, `packages/contracts`, `tests`, `infra` and `docs`.
- Modular Express API owns all business rules and database access. Next.js handles rendering/UI and consumes safe API DTOs.
- One backend worker handles scheduled publication, premium-to-free conversion and trending; jobs are durable/idempotent.
- Same-origin browser/API routing through the VPS reverse proxy; private database network access.
- Secure opaque browser sessions, backend roles/ownership checks, revocation and CSRF protection. Future mobile authentication is an adapter to the same API services.
- Separate protected chapter bodies from public metadata/derived previews. No protected body in public HTML, RSC/hydration, metadata, public JSON or caches.
- Durable `unlocks` have a unique user/chapter pair; provider events have unique provider/transaction pairs. Short-lived unlock tokens never replace persistent entitlement checks.
- MongoDB transactions for reward event/unlock/session consistency imply replica-set support; confirm hosting before implementing.
- Dependency versions are pinned in package manifests and the lockfile. Ad provider and production vendors remain unselected. Actual Phase 1 model/index refinements are documented in docs/DATABASE.md and docs/DECISIONS.md.

## Three-phase tracker

Proposed relative schedule: 25 working days, subject to verified project start, actual capacity, dependencies and agreed review/calendar treatment.

| Phase/subphase                                | Proposed days | Status                                                                                 |
| --------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| 1. Foundation, Admin, and Core Reader         | 1?9           | Implemented and locally verified; external checks/client acceptance pending            |
| 1.1 Requirements, UX and provider feasibility | 1?2           | Reviewable UI/defaults documented; client decisions and live ad-provider proof pending |
| 1.2 MERN foundation and authentication        | 3?4           | Local checks pass; successful live Google Sign-In pending credentials                  |
| 1.3 Admin and publishing                      | 5?7           | API checks and admin publishing browser test pass                                      |
| 1.4 Core reader and Milestone 1 delivery      | 8?9           | Reader/discovery tests pass; source handover prepared for review                       |
| 2. Reading Experience and Monetization        | 10–18         | Not started                                                                            |
| 2.1 Reader interface and preferences          | 10–12         | Not started                                                                            |
| 2.2 Comments and in-chapter ads               | 13–14         | Not started                                                                            |
| 2.3 Verified premium unlock                   | 15–17         | Not started                                                                            |
| 2.4 Milestone 2 verification and delivery     | 18            | Not started                                                                            |
| 3. Protection, SEO, Deployment, and Handover  | 19–25         | Not started                                                                            |
| 3.1 Preview configuration and protection      | 19–20         | Not started                                                                            |
| 3.2 SEO and final public experience           | 21–22         | Not started                                                                            |
| 3.3 VPS deployment and operations             | 23            | Not started                                                                            |
| 3.4 Final acceptance and handover             | 24–25         | Not started                                                                            |

Security boundaries start in Phase 1, even where final protection/configuration acceptance belongs to Phase 3. Do not defer safe authorization until the last phase.

## Unresolved decisions and blockers

1. **Critical integration dependency:** select and prove a rewarded-ad provider supporting browser inventory and authenticated server-to-server completion callbacks. Browser JavaScript completion events are insufficient. Mobile AdMob SSV documentation does not prove browser compatibility. No provider has been selected or tested.
2. Actual project start/advance date, workweek and any existing work outside this folder are unconfirmed. The contract's tentative September 7/8 start is not evidence of actual commencement.
3. Site name/domain, colors, final logo, UI/content languages and sample content are missing. Confirm the client's contractual logo deadline against the actual start.
4. Clarify mature public-preview behavior and age threshold/text; proposed metadata-only exposure before confirmation must be reconciled with public-preview requirements.
5. Confirm preview default/override rules, cover ratio/limits, fonts, ad placements and the proposed seven-day trending formula.
6. Obtain delegated client-owned Google/ad/hosting/database/media/email access when needed; never request primary-account passwords.
7. Confirm static/policy page list, approved wording, contact mailbox, deletion/retention policy and expected traffic/content volume.

These items did not block preparation of the plan. They block only their dependent decisions/integrations. Continue independent authorized work when implementation is requested; do not invent answers or repeatedly seek approval already granted.

## Delivery constraints to retain

- BDT 18,000 development fee; BDT 6,000 advance, BDT 6,000 after accepted Milestone 2 work/testing/fixes, and BDT 6,000 after final Milestone 3 acceptance. No separate Milestone 1 payment trigger.
- Demonstration and complete-to-date source package at **every** milestone. Do not work directly in the client's GitHub account.
- Up to seven working days of review per milestone; silence is not automatic acceptance. Two in-scope revision rounds do not limit required material-bug fixes.
- Final acceptance requires working agreed features and material-bug correction; delivery alone is insufficient.
- Three-month included maintenance starts at final acceptance; actual date not yet established.
- Client-owned infrastructure/operational accounts and recurring fees; delegated development access; portable source and license documentation.
- Keep the contract and unpublished content confidential. Do not duplicate personal identity, address, bank/card details or credentials in code, context, logs or source archives.
- No invisible/forensic watermark, native app, payments/subscriptions or author portal in MVP. The contract's optional future “Phase 2” is not this plan's Phase 2.

## Planning-session history

- Located and read the complete 14-page source contract.
- Created PROJECT_PLAN.md with exactly three delivery phases, twelve subphases, milestone acceptance and a requirement mapping.
- Created ARCHITECTURE.md with diagrams, repository proposal, model/index design, API and security boundaries, reward flow and operations/testing strategy.
- Created this continuing-work context and root AGENTS.md instructions.
- Checked official Next.js, Express and Google ad documentation; reference links are in ARCHITECTURE.md. No ad-provider feasibility claim is made.
- Planning-document consistency and local-link checks completed. No application tests were run because application code does not yet exist.

## Next action

Next external step: deploy the frontend to Vercel and the separate API/worker to Railway using `docs/DEPLOYMENT_RAILWAY_VERCEL.md`, then test the real Google flow against the public Vercel callback URL. Atlas connectivity was verified from the backend configuration on 2026-09-25 without logging credentials. Keep secrets in ignored `apps/api/.env` locally and in host-managed variables in production. Resolve rewarded-ad provider feasibility and client review before declaring Phase 1 fully accepted. No need to rerun passing local checks unless code or configuration changes. Do not begin Phase 2 without the user?s direction.

After each implementation session update: current subphase, changed files, actual commands/test results, decisions and their source, open defects/blockers, milestone delivery/acceptance status, and the next concrete task. Preserve unresolved items until evidence resolves them.

## Local environment setup

Environment configuration is separated for hosting: ignored `apps/api/.env` holds API/database/media/Google/admin settings; ignored `apps/web/.env.local` holds the Next.js API route target and public site label. Each app has a committed `.env.example` template. The root `.env` files were removed to prevent accidental secret sharing between services. Google client ID/secret and administrator provisioning fields are intentionally blank for the user to fill locally. No real credentials were supplied or logged. `npm run typecheck` and `npm run build` passed after this configuration change; Next.js confirmed it loaded `apps/web/.env.local`. Restart the relevant app after changing its configuration.

## Cloud deployment preparation

MongoDB Atlas is configured and a read-only backend connection check passed on 2026-09-25. Railway compatibility maps Railway's `PORT` to the API's validated port when `API_PORT` is not set, and production defaults to `0.0.0.0` for its bind host. The web app now maps `@/*` directly to `apps/web/src`; API and web builds resolve `@storyhaven/contracts` directly from `packages/contracts/src`. On 2026-09-25, `npm run typecheck`, `npm run build:api`, and `npm run build -w @storyhaven/web` passed independently. Added root commands for the independent API and worker services, Node runtime pinning, and `docs/DEPLOYMENT_RAILWAY_VERCEL.md`. Production deployment itself remains pending client-owned Railway, Vercel, GitHub and domain access plus the public domains needed for `WEB_ORIGIN` and Google OAuth configuration.
