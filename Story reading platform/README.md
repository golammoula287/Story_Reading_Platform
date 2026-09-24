# Storyhaven — Phase 1

A serial-fiction platform using MongoDB, Express, React through Next.js, and Node.js. Phase 1 includes a working reader website and administrator studio. The temporary name, brand palette, cover ratio and demo stories are replaceable implementation defaults.

## Run locally

Requirements: Node.js 22.12+ (validated here on 24.6), npm, and MongoDB with replica-set support. The provided helper recognizes MongoDB 7 on this Windows machine; elsewhere put `mongod` on PATH or set `MONGOD_BINARY` to its executable path.

Project root: `D:/Naeem_Project/Story reading platform`. Backend and frontend remain separate in `apps/api` and `apps/web`.

From the project root:

```powershell
npm ci
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
npm run db:local
```

Leave the database terminal running. In a second terminal:

```powershell
npm run seed
npm run dev
```

Open **http://localhost:3000**. The seed creates editable taxonomy and four original demonstration stories. It creates no accounts or fake reading activity, does not overwrite existing stories, and refuses to run in production. Public discovery shows an honest empty/error state when content or the API is unavailable.

You can register a reader through **/sign-up**. Passwords require 12–128 characters.

## Create your administrator

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` in `apps/api/.env`, then run:

```powershell
npm run admin:create
```

Remove those three provisioning values from `apps/api/.env` afterwards. The command does not overwrite or promote an existing account and prints no password. Sign in normally, then open **/admin**. No default administrator or backdoor account exists.

In the studio you can:

1. Create a draft or published story, add a prologue and classify it Clean/Mature.
2. Upload a JPEG/PNG/WebP cover; it is validated and cropped to 600×900 (2:3).
3. Assign editable genres, subgenres, tropes, descriptors and tags.
4. Add/edit/delete chapters, reorder them, publish now or schedule publication.
5. Mark chapters free/premium, set an automatic-free date and a safe preview amount.
6. Search reader accounts, inspect activity, suspend/reactivate or delete/anonymize readers.

Story publication and chapter publication are separate: a public chapter also needs a published parent story. Scheduled chapter dates are entered in the browser's local timezone and stored in UTC. The worker checks due work every 15 seconds and catches up after restarts; access checks also honor due dates if the worker is delayed.

## Google Sign-In

The authorization-code/PKCE integration is implemented, but live verification needs a client-owned Google OAuth web client. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `apps/api/.env`; configure the matching Google redirect URI as `http://localhost:3000/api/v1/auth/google/callback` for local testing. Restart the apps. The button appears only when both credentials exist. Production requires an HTTPS origin and matching redirect URI.

State is bound to an HttpOnly cookie and a one-use expiring database record; Google ID tokens are checked on the backend, including audience and nonce. Existing password accounts are never silently linked using a Google email claim. Sign into an existing password account with its password. [Google's token verification guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) explains the provider checks.

## Commands and verification

| Command                     | Purpose                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `npm run dev`               | Start web, API and publishing worker                               |
| `npm run db:local`          | Start persistent local MongoDB replica set                         |
| `npm run seed`              | Add editable taxonomy and original demo stories                    |
| `npm run admin:create`      | Provision an explicitly configured administrator                   |
| `npm run typecheck`         | Check API, web and shared contract types                           |
| `npm test`                  | Real-MongoDB integration/security tests                            |
| `npm run test:e2e`          | Chromium reader/admin/browser checks against the running local app |
| `npm run build`             | Build production API/worker and Next.js                            |
| `npm run format`            | Format project source                                              |
| `npm run package:milestone` | Create source archive and SHA256 manifest                          |

For API tests, keep MongoDB running. The default test database is `storyhaven_test`; the test runner refuses database names without the `_test` suffix and resets only that test database. Tests exercise access isolation, drafts, premium gating, schedules, previews, persistence, image validation, reader deletion and session revocation. Test covers may remain in local development media storage.

For browser checks, first run `npm run seed`, then either `npm run dev` or `npm run build` followed by `npm start`. Install Chromium if necessary with `npx playwright install chromium`, then run `npm run test:e2e`. The browser setup provisions random temporary test credentials in the local database and removes its test users afterwards. Never point browser tests at a production database. Screenshots are stored in `docs/screenshots` and test diagnostics in ignored `test-results`/`playwright-report` folders.

## What remains external or belongs to later phases

- Live Google consent/login verification awaits client OAuth credentials.
- Rewarded-ad provider feasibility awaits an approved client account, suitable web video inventory and a verified server callback. No browser-only unlock fallback exists.
- Final brand/logo, source stories and mature-preview/age wording need client input.
- Phase 2 adds the complete reader customization, comments/moderation, advertising and verified premium unlock flow.
- Phase 3 completes layered copy deterrents/watermarking, SEO/policy/contact work, production hardening/deployment, backup and final handover.

See [Milestone 1 review](docs/MILESTONE_1.md), [decisions and provider investigation](docs/DECISIONS.md), [API guide](docs/API.md), [schema](docs/DATABASE.md), and [project context](PROJECT_CONTEXT.md). Contractual acceptance is separate from local implementation/test completion.
