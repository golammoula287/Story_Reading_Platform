# Milestone 1 — Local verification and handover

Verified on 2026-09-24 from `D:/Naeem_Project/Story reading platform`.

**Status: local build and tested Phase 1 workflows pass; external integration checks and client acceptance remain pending.** This report is not a declaration of contractual acceptance or production readiness.

## Completed in this verification session

| Step | Command / check                            | Result                                                                                                                                                      |
| ---- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `npm run build`                            | API, publishing worker and Next.js production build passed from the relocated project                                                                       |
| 1    | `npm run typecheck`                        | API and frontend type checks passed                                                                                                                         |
| 2    | `npm test`                                 | 15 real-MongoDB integration tests passed                                                                                                                    |
| 2    | `npm start`; API `/health` and website `/` | Built processes started; both health/page requests returned HTTP 200                                                                                        |
| 2    | Desktop/mobile discovery browser test      | Passed: catalogue, search, mobile width/overflow and screenshots                                                                                            |
| 2    | Reader browser test                        | Passed: registration, saved story, authorized reading, bookmark, logout/login and resume                                                                    |
| 2    | Administrator browser test                 | Passed on focused rerun after fixing its dropdown locator: create/publish story and chapter, public preview, anonymous full-content denial and delete story |

The first browser run passed two tests and timed out while the admin test used an exact label locator for the status select. The actual select was present and accessible as a combobox. Changing the test to its role/name locator resolved the failure; no application change was needed. All three journeys have passing evidence across the initial run and focused rerun. The latest HTML Playwright report contains the focused admin rerun; discovery/reader screenshots and this report preserve the other outcomes.

The integration suite covers origin/role enforcement, password storage, taxonomy/search, private body separation, safe previews, anonymous/draft/premium denial, transactional reordering, account-isolated library/bookmarks/progress, real trending, due-date recovery/idempotence, automatic free conversion, mature-content checks, image decoding/cropping, invalid OAuth state, suspension/session revocation and deletion cascades. It does not prove successful live Google consent or ad-provider callbacks.

## Review the result

- Website: `http://localhost:3000` while the local processes are running.
- Backend: `apps/api`; frontend: `apps/web`; shared API contracts: `packages/contracts`.
- [Setup and administrator provisioning](../README.md).
- [Desktop homepage](screenshots/home-desktop.png), [mobile homepage](screenshots/home-mobile.png), [administrator studio](screenshots/admin-desktop.png).
- [API guide](API.md), [database schema](DATABASE.md), [implementation decisions](DECISIONS.md), [third-party dependencies](THIRD_PARTY.md).

Browser verification uses temporary randomly provisioned admin credentials and removes its test accounts afterwards. No permanent administrator password was created for the user. Follow the explicit `admin:create` instructions to provision your own account.

## Source handover

Run `npm run package:milestone` from the project root. The generated archive and archive checksum are under `releases/`. It includes frontend/backend/shared source, tests, package lockfile, app-specific environment templates, setup and infrastructure notes, screenshots, planning/context documents, and a file-level SHA256 manifest.

The package deliberately excludes credentials, local databases, uploaded media, dependency installations, build/cache output, test traces and the private source contract PDF. The contract remains separately available in the project root; any planning links to it require that separate document. Client-owned content/data transfer is distinct from this source archive. No external upload or message has been sent.

## Remaining before full Phase 1 acceptance

1. Configure a client-owned Google OAuth web client in local `apps/api/.env`, then demonstrate successful Google sign-in/sign-out and account access behavior. Never paste the client secret into chat or commit it.
2. Confirm a browser rewarded-ad provider and prove its authenticated completion callback as required by subphase 1.1. No provider has been selected; this is not implemented by substituting a browser event.
3. Client review of provisional branding, source content, cover ratio, taxonomy/trending defaults and mature-content/age wording; record agreed decisions and any required revisions.
4. Client reviews the delivered milestone and reports material issues; record acceptance only when the agreement's conditions are met.

Phase 2 functionality and Phase 3 production deployment remain outside this verification session. The local built preview is not a deployed production service.
