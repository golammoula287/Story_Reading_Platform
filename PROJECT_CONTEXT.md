# Project Context

Last updated: 2026-10-06.

## Purpose and current instruction

Build a serial-fiction reading platform based on the local 14-page WEBSITE DEVELOPMENT CONTRACT.pdf. The user requested: read the entire document, plan carefully using MERN, organize delivery into three main phases with subphases, then establish a context file before further implementation.

Current status: **User confirmed Phase 1 and authorized Phase 2 on 2026-10-02. Phase 2 independent local implementation and verification are complete; the user deferred commercial ad-provider integration to later on 2026-10-05.** Root: `D:/Story_reading_App`. Backend: `apps/api`; frontend: `apps/web`; shared contracts: `packages/contracts`.

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
| 1. Foundation, Admin, and Core Reader         | 1?9           | User confirmed Phase 1; outstanding external checks tracked separately            |
| 1.1 Requirements, UX and provider feasibility | 1?2           | Reviewable UI/defaults documented; client decisions and live ad-provider proof pending |
| 1.2 MERN foundation and authentication        | 3?4           | Local checks pass; successful live Google Sign-In pending credentials                  |
| 1.3 Admin and publishing                      | 5?7           | API checks and admin publishing browser test pass                                      |
| 1.4 Core reader and Milestone 1 delivery      | 8?9           | Reader/discovery tests pass; source handover prepared for review                       |
| 2. Reading Experience and Monetization        | 10–18         | In progress                                                                            |
| 2.1 Reader interface and preferences          | 10–12         | Implemented and locally verified                                                                            |
| 2.2 Comments and in-chapter ads               | 13–14         | Comments implemented/tested; display adapter deferred                                                                            |
| 2.3 Verified premium unlock                   | 15–17         | Reward core implemented/tested; real provider deferred                                                                            |
| 2.4 Milestone 2 verification and delivery     | 18            | Local checks passed; source review handover prepared                                                                            |
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

Next external step: deploy both frontend and separate Express API to Vercel using `docs/DEPLOYMENT_VERCEL.md`, as requested on 2026-09-29. Configure the two projects' production origins, Atlas, Cloudinary and cron credentials; verify live authentication, cover persistence and cron before switching traffic. The earlier Railway/Render guides remain historical alternatives. Atlas connectivity was verified on 2026-09-25 without logging credentials. Keep secrets in ignored local environment files and host-managed production variables. The user supplied Phase 1 confirmation and Phase 2 direction on 2026-10-02. Continue Phase 2.1 sequential verification; rewarded-ad provider feasibility remains an external dependency.

After each implementation session update: current subphase, changed files, actual commands/test results, decisions and their source, open defects/blockers, milestone delivery/acceptance status, and the next concrete task. Preserve unresolved items until evidence resolves them.

## Local environment setup

Environment configuration is separated for hosting: ignored `apps/api/.env` holds API/database/media/Google/admin settings; ignored `apps/web/.env.local` holds the Next.js API route target and public site label. Each app has a committed `.env.example` template. The root `.env` files were removed to prevent accidental secret sharing between services. Google client ID/secret and administrator provisioning fields are intentionally blank for the user to fill locally. No real credentials were supplied or logged. `npm run typecheck` and `npm run build` passed after this configuration change; Next.js confirmed it loaded `apps/web/.env.local`. Restart the relevant app after changing its configuration.

## Cloud deployment preparation

MongoDB Atlas is configured and a read-only backend connection check passed on 2026-09-25. Cloud container hosting (Render, Railway) automatically binds to `0.0.0.0` and prioritizes dynamic host-assigned `PORT` (such as Render's default 10000 or custom port), overriding any accidental loopback host (`127.0.0.1`/`localhost`) to ensure port detection and routing succeed. Behind cloud reverse proxies, Express trusts the first hop (`trust proxy: 1`) to preserve client IPs for rate-limiting and HTTPS protocol detection. The web app now maps `@/*` directly to `apps/web/src`; API and web builds resolve `@storyhaven/contracts` directly from `packages/contracts/src`. On 2026-09-26, `npm run typecheck` and `npm run build:api` passed. Added root commands for independent API and worker services, Node runtime pinning, and deployment documentation. Production deployment remains pending client-owned Railway/Render, Vercel, GitHub, and domain access plus the public domains needed for `WEB_ORIGIN` and Google OAuth configuration.

## Render authentication diagnosis (2026-09-27)
Live backend providers returned 200; login with the frontend Origin returned 403 CSRF. Frontend providers and login returned 500. The dashboard API_INTERNAL_URL and WEB_ORIGIN must be aligned; this workspace cannot edit Render settings. Added frontend target validation/normalization shared by rewrites and SSR, backend origin normalization, deployment regression checks, and docs/DEPLOYMENT_RENDER.md. Verification results follow below. Live authentication is not yet confirmed fixed.

Verification: four deployment URL tests passed; npm run typecheck and separate API/web production builds passed. All 15 API integration tests passed against local storyhaven_deploy_test using the Render frontend origin with a trailing slash. The new browser auth regression passed against the built frontend and a separate local storyhaven_auth_browser_test database: register, reload/session persistence, logout, login, and rejection of an untrusted Origin. Test accounts were cleaned by the browser fixture. Repaired stale local workspace junctions after the move to D:/Story_reading_App. Atlas was not used for these tests. Render environment changes, deployment of this patch, live cookie verification and real Google sign-in remain pending.

## Hosted demo seed (2026-09-27)

User requested sample data on the hosted site using docs/Img Demo. Created four original demonstration stories with two published free chapters each, 28 taxonomy terms, and four supplied covers (images (1).jfif through images (4).jfif). Nine image files were available; five remain unused. Covers are demo assets, and the original sample text does not reproduce the books depicted on them.

Added scripts/seed-hosted-demo.mjs: invoke with node --import tsx and temporary SEED_WEB_URL, ADMIN_EMAIL and ADMIN_PASSWORD environment values. Uses authenticated admin APIs, preserves existing non-demo stories, skips existing taxonomy/stories/chapters, and attaches covers to matching demo stories without covers. No credentials are saved in source. Extracted shared definitions/examples into apps/api/src/scripts/demo-data.ts; local seed remains production-guarded.

Verified live: four published stories, two chapters each, all four WebP covers HTTP 200, all tested anonymous full-chapter requests HTTP 401. Repeat provisioning created zero duplicate stories/chapters. API typecheck passed. Images were uploaded to the backend's configured MEDIA_DIR; durability across Render restarts requires persistent media storage and was not verified in this task. No fake reading/trending activity was seeded.

## Additional reading demos (2026-09-27)

Added two original three-chapter stories to the live site at the user's request: The Lantern at Platform Seven (three free chapters) and The Orchard Beyond the Clouds (two free chapters and a premium third chapter). Added scripts/demo-reading-data.mjs and extended the hosted seeder to accept story-specific chapter bodies and access types. Reused supplied covers images (5).jfif and images (6).jfif. Existing stories/chapters were preserved. Hosted totals are now six stories and fourteen chapters.

Verified both public story pages return 200, ordered chapter metadata matches the intended free/premium settings, all six previews return 200, and all six anonymous full-content requests return 401. Premium unlocking remains unimplemented; this sample demonstrates locked content, not an operational rewarded-unlock flow. Users can use the free stories to try chapter navigation, saved library, bookmarks and progress. No user activity or entitlement records were seeded.

## Backend startup recovery (2026-09-29)

User reports frontend fails until backend Render URL is opened manually. Existing SSR API requests abort after eight seconds; browser failures did not recover. Added frontend /backend-status health proxy (8-second bounded upstream fetch), shared browser readiness checks (two-minute total deadline), startup/error/retry overlay, catalogue refresh and session refresh on readiness. Browser API calls await readiness without replaying mutations. No periodic keep-alive and no business logic moved out of Express. Existing seed changes remain intact.

Validation: five readiness regression tests passed, frontend production build including TypeScript passed, and Chromium against a simulated sleeping backend passed startup display, automatic readiness, server catalogue recovery and exactly one POST on a failed form submission. The browser harness was corrected to start Next from apps/web, matching npm workspace start. No production data changed. Redeploy/rebuild frontend to activate; live idle-start behavior remains to be checked after deployment. Render free-service spin-down/startup delay itself is unchanged.

## Cloudinary integration (2026-09-29)

User selected Cloudinary for persistent covers. Implemented authenticated backend REST uploads after existing image validation/600x900 WebP conversion. MEDIA_STORAGE selects local or cloudinary; cloud mode requires all three Cloudinary credentials. Added MongoDB MediaAsset mappings so existing cover-key URLs redirect to persisted Cloudinary images; local covers remain readable. Admin cover validation accepts durable mappings. Secrets are backend-only; empty placeholders added to ignored apps/api/.env and committed apps/api/.env.example. No real Cloudinary credentials were present during verification.

Added docs/CLOUDINARY.md and RESTORE_DEMO_COVERS=true mode in hosted seeder to restore the six known covers from original files. Restoration checks the deployed admin storage endpoint is cloudinary before replacing covers, and does not change chapter text. Asset cleanup is separate; switching storage does not delete existing cloud images.

Validation: all 20 API tests passed against a dedicated local database, including five mocked Cloudinary tests for authenticated upload/mapping, failures, external URL rejection, cover validation without disk files, and persisted redirect delivery. Real Cloudinary upload, hosted deployment and cover restoration remain pending account credentials and backend deployment. Local mode is retained until explicitly configured; no production media was changed.

## Both apps on Vercel (2026-09-29)

User explicitly requested complete Vercel deployment setup for backend and frontend. Added per-app vercel.json configurations and docs/DEPLOYMENT_VERCEL.md covering two projects, workspace installation, secrets, stable origins, Google callbacks, Atlas networking, Cloudinary, cron, previews, live checks and rollback. Backend api/index.js loads the esbuild-generated Express entry without starting a listener or timer worker. MongoDB connections are reused; requests wait for connection/model initialization and return sanitized no-store 503 responses on failure. Existing chapter/CSRF authorization remains in Express. MongoDB-backed API/login rate limits preserve counters across instances and cold starts. Cloudinary and a strong cron secret are required on Vercel; cover upload limit is 4 MiB there due to the platform payload ceiling, while other hosts retain 5 MiB.

Publishing uses authenticated GET /internal/publishing calling the existing idempotent service. Default cron is daily for Hobby compatibility; the guide gives the per-minute paid-plan setting. Existing read-time publication/free-date checks remain authoritative; stored admin status may lag until cron. This is the requested hosting deviation from the VPS proposal, not acceptance of the full Phase 3 scope. Added .vercelignore, ignored .vercel metadata, and excluded Vercel caches from milestone packages. Existing Cloudinary/demo changes were preserved.

Verification: npm run build passed (API, worker, serverless bundle and Next.js); npm run typecheck passed. All 27 Vitest tests passed with process workers, including the existing 15 database journeys, five media tests, five serverless authorization/failure tests and two real-MongoDB rate-limit concurrency/expiry tests. Local runner explicitly used storyhaven_vercel_test and storyhaven_rate_limit_test; no Atlas data was touched. Initial sandbox process spawning failed; thread-worker database suites timed out even outside the sandbox, and rerunning with the default process pool and one worker passed. A separate smoke test imported the actual built api/index.js with VERCEL=1 and an isolated storyhaven_vercel_smoke_test database, confirming health, anonymous chapter denial, cron authentication and the 31st auth attempt returning 429. Test databases were cleaned. git diff --check passed.

Not yet verified: Vercel-hosted build/routing/cookies, live cron invocation, production Google OAuth and actual Cloudinary credentials/uploads. No deployment or dashboard changes were performed because no Vercel account connection is available in this session. Next: import both projects using the guide, supply production variables, deploy API then frontend, and run the listed live checks before moving traffic. Phase 1 external checks/client acceptance remain pending; Phase 2 remains unstarted.

## Frontend-first Vercel deployment fix (2026-09-29)

2026-09-30 backend configuration repair: latest supplied runtime stack proves WEB_ORIGIN contains the full assignment and Markdown link. Replaced throwing URL refinement with a dedicated schema that normalizes this exact copy-paste format, same-label/target links and quoted assignments, then strictly validates one HTTP(S) origin. Unsafe URLs remain rejected; production still requires HTTPS. Configuration errors now report field names without echoing values. Added regression tests for the supplied crash input and malformed/unsafe origins. No changes to origin authorization or cron authentication; deployment remains external.

Verification for this repair: API build and API TypeScript check passed; all eight focused web-origin/serverless regression tests passed; git diff --check passed. No database/provider calls or production changes were made. Next: push and redeploy backend, then recheck production /health and frontend connectivity. Other missing/invalid deployment variables are still rejected deliberately.

Canonical redirect verification completed 2026-09-30: frontend production build including TypeScript passed. Raw HTTP checks against the built frontend confirm deployment-alias login requests return 307 to the production frontend with query preserved, while canonical sign-in returns 200 without a loop. The first smoke harness used fetch with a Host override and did not exercise the intended host; replaced it with node:http and the check passed. Seven deployment configuration tests pass. Changes are local; frontend redeployment and a real successful sign-in remain pending.

Login origin repair: live empty login requests with the canonical zeta Origin and X-Requested-With header pass CSRF and reach validation (400), both directly and via frontend; the backend domain as Origin correctly returns 403. To prevent deployment-alias visitors encountering this failure, added frontend canonical-origin redirects using Vercel's production-domain system variable, with an explicit CANONICAL_WEB_ORIGIN override for isolated staging. Generated vercel.app aliases redirect before rendering the login form; canonical/local requests do not loop. Backend origin checks remain strict. Seven deployment configuration tests and diff whitespace check pass. Hosted activation requires redeploying the frontend; Vercel account access remains unavailable in this session.

Latest live recovery verification: production backend j7gk /health now returns 200 ready:true; frontend zeta homepage and /backend-status return 200, with ready:true. Direct and proxied auth/providers return 200 google:true; public catalogue returns 200 with eight stories. Anonymous account/admin/full-chapter-route requests return 401 with private,no-store on both domains; unauthenticated backend cron returns 401. The chapter probe used a synthetic ID to verify the authentication gate, not a full content leakage audit. User-supplied git-main and lx9douzc6 deployment URLs redirect to Vercel Authentication (302), so use the stable production domains for public access. No records changed. Real Google consent, authenticated reader/admin journeys and authorized cron execution remain unverified.

Hosted root cause confirmed from user-provided runtime logs (20:27–20:30): config.ts throws "Vercel requires CRON_SECRET of at least 32 characters." The deployed backend lacks a sufficiently long cron secret; the earlier local MEDIA_STORAGE failure was a separate issue. Resolution: copy the generated local CRON_SECRET value into the backend project's Production environment and redeploy. Do not publish the secret or weaken cron authorization. Live recovery remains unverified until that dashboard change/deployment occurs.

Backend crash investigation: reproduced import-time failure of the compiled serverless app with VERCEL=1 using local configuration: "Vercel requires Cloudinary storage." Corrected ignored apps/api/.env MEDIA_STORAGE to cloudinary, preserving existing credentials. This proves a local configuration blocker, not the hosted root cause: Vercel CLI whoami reports an invalid token, so runtime logs and dashboard variables are inaccessible. Requested the hosted runtime error from the user. The backend Production MEDIA_STORAGE setting must be cloudinary and its deployment rebuilt/redeployed; no dashboard edits or deployment were performed.

Live deployment checks (2026-09-29): user supplied j7gk and zeta Vercel domains. HTTPS checks identify story-reading-platform-zeta.vercel.app as frontend (homepage 200) and story-reading-platform-j7gk.vercel.app as backend (health and all tested API paths return Vercel 500 FUNCTION_INVOCATION_FAILED). Frontend /backend-status returns 503 with ready:false; frontend proxied providers/catalogue/session/chapter endpoints return the same backend invocation error. The deployed frontend HTML still includes the startup overlay text, indicating the removal is not live yet. Authentication/access control could not be verified because the backend fails before normal responses. No accounts/content changed. Need backend Vercel runtime error logs to distinguish environment validation from module/runtime failures; public responses do not reveal the cause. Redeploy latest frontend after backend repair.

Subsequent UI request: removed the full-screen “Getting your stories ready” startup/error overlay and its CSS. Backend readiness checks, catalogue refresh and session recovery continue in the background; the homepage/navigation remain visible. Updated the existing startup browser check to expect the visible homepage rather than the removed overlay. Frontend typecheck and git diff --check passed; the browser check was not rerun. Live frontend redeployment is required; this change does not configure or repair an unavailable backend.

User reported a Vercel frontend build failure caused by API_INTERNAL_URL pointing to localhost and explicitly requested deploying the frontend before configuring the backend. Next.js configuration now permits missing/loopback targets on Vercel and rewrites API requests to a local no-store 503 route until configured. Runtime API-origin resolution remains strict; malformed URLs still fail validation. Local development and other host validation remain unchanged. Updated the frontend environment template and deployment guide with the frontend-first option and the requirement to rebuild after setting the actual backend origin.

Verification: all five deployment configuration tests passed via node scripts/deployment-config.test.mjs. The frontend production build, including TypeScript, passed with VERCEL=1 and API_INTERNAL_URL=http://localhost:4000, reproducing the previously failing configuration. The new backend-unavailable route is included in the build. No production deployment was performed. Next: push these changes and redeploy the frontend; after hosting the backend, set API_INTERNAL_URL to its HTTPS origin and redeploy again to enable data/authentication features. External acceptance status remains unchanged.

## Phase 2 started (2026-10-02)

User explicitly confirmed Phase 1 and requested Phase 2. This supersedes earlier instructions to wait before Phase 2. Record user confirmation separately from still-unverified live Google OAuth, authenticated production journeys and rewarded-provider callback evidence.

Subphase 2.1: implemented Day, Night, Grey and Off-White reader themes, serif/sans-serif selection, 16�32 px font sizing, explicit account-save feedback and loading/error/retry states. Shared strict preference schema and authenticated GET/PUT /api/v1/me/preferences persist settings on the User record. Existing accounts receive defaults; requests cannot target another account. Existing bookmarks, navigation, progress and workspace loading/UI changes were preserved. No credentials or production data were read or changed.

Verification: npm run typecheck passed. Dedicated real-MongoDB preference integration test passed (fresh-login persistence, defaults/account isolation, private no-store response, anonymous/suspended denial, CSRF and invalid payload rejection). Sandbox process-spawn restrictions required approved execution outside the sandbox. API build and frontend compilation/type checking passed; final production-build result recorded below. Browser theme/mobile/long-chapter and second-device resume verification remain pending, so subphase 2.1 is not yet marked complete.

Next: finish 2.1 browser verification, then implement 2.2 comments/moderation and ordinary ad slots. Provider selection and authenticated browser-compatible server-to-server completion proof remain unresolved for 2.3; never substitute browser completion events. Milestone 2 has not been delivered or accepted. Phase 3 remains unauthorized.

Final verification: npm run build passed for API, worker, serverless bundle and Next.js production output. Focused integration rerun also passed. git diff --check passed. Browser acceptance remains pending.


## Phase 2 completion work (2026-10-05)

User requested completion of Phase 2 and then deferred provider details ("take it for the latter"). Continue all independent implementation and local verification; do not invent or enable a commercial provider, or describe real monetization as complete. Phase 3 remains outside this authorization.

Completed comments/moderation, account activity and transactional deletion cleanup; ordinary-ad component/adapter boundary and consent/failure states; reward session, event, durable entitlement and token backend; availability/start/poll/cancel/retry reader UI. Actual production adapters remain null. Fixture adapters live only in tests and are never loaded by production startup. Full content and comments retain server-side authorization and no-store responses.

Reward tests cover signature rejection, nonce/session binding, concurrent duplicates, cross-session replay, transaction rollback/retry, cancellation, expiry/grace, suspension/publication/age changes, fresh-login access and token account/expiry/entitlement checks. Eight reward tests and 15 existing chapter/admin tests pass; five comments tests and five serverless checks pass; preferences and ordinary-ad browser matrix also pass. Slow initial database/index setup required longer test setup time and an explicit local TEST_MONGODB_URI override; no Atlas records were used. One delayed callback fixture was corrected to set immutable creation time through the test collection. Full browser journey and final build are being completed below.

Browser verification found that cached hidden chapter DOM could confuse page-wide paragraph queries. Reading progress and resume now use the current reader root. Test locators target visible reader content. Initial browser attempts also required fixing harness ESM/variable-name issues and allowing cold page compilation; those failures are not reported as successful acceptance.

See docs/PHASE_2.md for implementation defaults, opaque-token refinement, callback timing, comment rules, provider integration requirements and reproducible tests. docs/MILESTONE_2.md records review status. Package command now accepts milestone 1/2/3, preserving existing Milestone 1 archives. Next: complete browser/build verification, create and validate the Milestone 2 review archive, then await provider details for live integration.

Further browser diagnosis: duplicate narrative elements came from identical React sibling keys on ChapterNarrative and ChapterComments during session refresh. Keys now have distinct narrative/comments prefixes. Reader-root query scoping is retained as a robustness improvement, with a separate saved resume anchor and clamping after chapter edits. The earlier cached-DOM diagnosis was provisional; the duplicate-key warning identified the concrete cause.


## Phase 2 local handover (2026-10-06)

Completed final browser verification and production build. Browser checks passed all four themes/font controls, long mobile reading, cross-browser preferences/resume, escaped comments, administrator hide/restore, reader delete/refresh, anonymous denial, unsigned callback rejection, signed fixture reward polling and durable unlock after a fresh login. Final browser run asserts no runtime/hydration errors. Navigation now keeps its initial account-loading markup stable through hydration. Both narrative/comment React keys are distinct; current-reader anchor scoping and separate saved resume anchors prevent incorrect resume behavior.

Final npm run build passed API, worker, serverless bundle and Next.js including TypeScript. Recorded focused backend coverage totals 34 passing cases across existing access/admin, rewards, comments, preferences and serverless tests; ordinary-ad browser matrix passed separately. No production provider or Atlas data was used or changed. See docs/MILESTONE_2.md for results/limits and docs/PHASE_2.md for test and integration instructions.

Milestone 2 complete-to-date source handover is prepared through npm run package:milestone -- 2, with source and archive SHA256 manifests and secret/cache/contract exclusions. Delivery is for review; client acceptance and the real ad-provider integration remain pending. No deployment or Phase 3 work was performed. Next: user supplies the provider details previously deferred, then implement its actual display/reward adapters and verify live callback/inventory behavior before final monetization acceptance.
