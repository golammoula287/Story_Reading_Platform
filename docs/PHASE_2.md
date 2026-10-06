# Phase 2 integration and review

The user authorized completion of Phase 2 on 2026-10-05 and explicitly deferred ad-provider details to later. This document distinguishes implemented local behavior from live monetization acceptance. Phase 3 is not included.

## Reader and comments

Reading settings are account-persisted. Themes: Day, Night, Grey, Off-White; serif/sans-serif and 16-32 px. Comments are plain text (1-2000 characters), rendered as text, with pagination and a five-posts-per-minute account limit. Reading/posting comments requires the same publication, login, mature-content and premium entitlement checks as full chapters. Owners can delete their own comments even after access changes. Administrators hide/restore comments with transactional audit entries and can inspect recent comment activity. Hidden comments disappear on subsequent fetch/refresh or window focus; previously downloaded text cannot be recalled from a browser.

Comments are deleted with their account, chapter or story, following the existing deletion cascade. Moderation does not edit a reader's text. Initial comments are visible immediately; these are documented implementation defaults, not a new preapproval requirement.

## Ordinary ads

`apps/web/src/lib/display-ads.ts` defines the display adapter. The default is null: no third-party scripts, consent prompts or empty ad placeholders are loaded. Once a verified adapter is connected, placements appear after every sixth narrative paragraph, excluding the final paragraph, on both free and entitled premium chapters. This provisional spacing remains subject to client/provider review. Preview-only text has no ads.

The component supports consent/decline, filled, no-fill, blocked, thrown error and an eight-second timeout. It preserves reading and ignores late success after timeout. The browser test uses a fixture adapter, not real ad inventory. Provider-specific consent/CMP requirements must be integrated before activation; the local consent controls do not establish provider/legal compliance.

## Reward adapter and server rules

`apps/api/src/modules/reward-provider.ts` is intentionally unconfigured. No environment toggle enables a test provider in production. A selected adapter must prepare a browser ad launch and verify the documented server callback signature, timestamp/retry rules, ad unit and reward type before returning normalized transaction/session/nonce/completion data. The HMAC fixture exists only in tests and is not a supported commercial-provider protocol.

The configured callback route alone bypasses browser CSRF and reads a bounded raw body; verification is mandatory. All account endpoints retain session, CSRF and no-store protections. A browser completion message cannot grant an unlock.

Reward sessions bind account, chapter, provider, a hashed random nonce and expiry. Provisional timing: 10 minutes to complete, plus five minutes for a delayed verified callback, provided completion occurred within the session. Cancellation is terminal. Pending sessions become expired when polled; an on-time completion received within the grace period can still verify. Provider no-fill/preparation errors mark sessions failed. Provider-specific timing can require changes when selected.

Verified event, durable entitlement and session completion commit in one MongoDB transaction. Unique provider/transaction-hash and session indexes reject replay or double credit. Callbacks recheck account status, publication and mature confirmation. Transactions serialize with account/content deletion. A failed write rolls back, allowing a safe provider retry.

Short-lived delivery tokens use random opaque values stored only as hashes, expire after two minutes and are bound to account/chapter. This deliberately refines the architecture's proposed signed-token representation: server-stored opaque tokens provide revocation and expiry without introducing a new signing secret. Tokens cannot replace login or the durable entitlement check; normal returning readers can read using their session and durable entitlement without a token. A supplied invalid token is rejected.

Account/content deletion removes reward sessions, delivery tokens and entitlements. Reward-event replay tombstones retain only provider, transaction hash and an orphan session identifier, without account ID, chapter ID, raw callback or nonce. Do not purge replay tombstones without deciding a provider-specific replay/retention policy.

## API

- `GET /api/v1/rewards/availability`: authenticated availability; false until configured.
- `POST /api/v1/chapters/:id/reward-sessions`: empty object; returns an entitled state or a prepared session; unavailable providers return 503. Five starts per account/minute.
- `GET /api/v1/reward-sessions/:id`: own status only.
- `DELETE /api/v1/reward-sessions/:id`: cancel own pending/expired session; cannot revoke verified entitlement.
- `POST /api/v1/chapters/:id/unlock-token`: authorized account receives a short-lived token.
- `GET /api/v1/chapters/:id/content`: optionally accepts `X-Unlock-Token`; always performs full authorization.
- `POST /api/v1/ads/<configured-provider>/callback`: only exists for the configured adapter. Actual method/protocol must follow selected-provider documentation.
- `GET/POST /api/v1/chapters/:chapterId/comments`; `DELETE /api/v1/chapters/:chapterId/comments/:id`.
- `GET /api/v1/admin/comments?status=visible|hidden|all&page=1&limit=20`; `PATCH /api/v1/admin/comments/:id` with `{ "status": "hidden" }` or `visible`.

## Local verification and handover commands

Start `npm run db:local`. Tests use dedicated local databases; never point test commands at production.

- `npm run typecheck`
- API verification: use the explicit local test environment below, then run the focused suites.
- `node scripts/test-phase-two-browser.mjs`
- `node scripts/test-display-ads.mjs`
- `npm run build`
- `npm run package:milestone -- 2`

For PowerShell, override any inherited test configuration before running the API checks:

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27018/storyhaven_phase_two_regression_test?replicaSet=storyhaven'
$env:MEDIA_STORAGE='local'
$env:NODE_ENV='test'
$env:WEB_ORIGIN='http://localhost:3000'
npm run test -w @storyhaven/api -- test/rewards.test.ts test/comments.test.ts test/preferences.test.ts test/phase-one.test.ts test/vercel.test.ts --maxWorkers=1 --testTimeout=30000 --hookTimeout=60000
```

Browser scripts launch/close their own local services and Chromium. The reader/comments journey uses `storyhaven_phase_two_browser_test`; the ad test uses no database or provider network. Final results and any limitations belong in MILESTONE_2.md.

## Remaining external acceptance

Client-owned provider name/documentation/access, real ordinary-ad delivery, no-fill/blocked behavior with that provider, authenticated test and production reward callbacks, and hosted account persistence must be demonstrated. Local fixture passes cannot mark this work accepted. A source package is a handover for review, not a claim that monetization is live or that the milestone payment/acceptance condition has been met.
