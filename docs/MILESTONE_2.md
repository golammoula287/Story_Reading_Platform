# Milestone 2 - Local implementation and review

Updated: 2026-10-06.

Status: Phase 2 independent local implementation and verification complete; source handover prepared for review. The user explicitly deferred the commercial ad-provider integration on 2026-10-05. Live monetization is not enabled, and this report does not declare contractual acceptance or trigger payment.

## Implemented

- Four reading themes, serif/sans-serif controls, font sizing, account persistence and saved reading position.
- Chapter-access-protected comments, plain-text rendering, pagination, ownership, account rate limiting, administrator hide/restore, comment activity and deletion cascades.
- Ordinary ad placements with consent/decline, no-fill, blocked/error/timeout handling and preview exclusion. Adapter remains disabled pending the selected provider.
- Account/chapter-bound reward sessions, cancellation, expiry and bounded delayed-completion handling; verified callback adapter boundary; transactional reward events and durable unlocks; duplicate/replay protection; short-lived account/chapter-bound tokens.
- Reader reward availability, start/poll/cancel/retry flow. No browser completion event grants access. Production startup defaults cannot start ads or accept fixture callbacks.

## Verification evidence

| Check                                             | Result                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API integration, focused runs on 2026-10-05       | 34 cases passed: 15 existing chapter/admin cases, 8 reward-integrity cases, 5 comment cases, 1 account-preference case, 5 serverless cases.                                                                                                                                                                                               |
| Reader/comment/reward browser journey, 2026-10-06 | Passed: all themes/fonts, long mobile chapter, fresh-browser preference/resume persistence, comment escaping/post/hide/restore/delete, unsigned callback rejection, signed fixture unlock and returning-account entitlement. Anonymous full-content and HTML privacy checks passed. No browser runtime/hydration errors in the final run. |
| Ordinary ad-component browser matrix, 2026-10-05  | Passed: consent/decline, filled/no-fill/blocked/exception/timeout, late callback, mobile non-overlap and preview exclusion using a fixture adapter.                                                                                                                                                                                       |
| Final production build, 2026-10-06                | Passed: Express API, worker, serverless bundle and Next.js, including TypeScript.                                                                                                                                                                                                                                                         |
| Whitespace validation                             | git diff --check passed.                                                                                                                                                                                                                                                                                                                  |

Local fixture results do not establish live provider acceptance. Earlier unsuccessful runs found cold-start/test setup timing, an immutable-timestamp test fixture, harness issues, duplicate React sibling keys and a navigation hydration race. These were corrected; the final browser run passed with runtime-error assertions. Reading anchors are scoped to the current reader, clamped to edited chapter length, and preserved separately for the resume button. The screenshot is available at [mobile reading evidence](screenshots/phase-two-reader-mobile.png).

## Review and handover

See [Phase 2 integration guide](PHASE_2.md) for API routes, defaults, test commands and adapter requirements. `npm run package:milestone -- 2` prepares a complete-to-date source archive and SHA256 manifest under `releases/`; secrets, local databases, uploads, caches and the private contract are excluded. This is a review handover, not an external deployment.

## Deferred by user / remaining external checks

1. Provide the selected provider name and browser/S2S documentation, delegated account access and ad units.
2. Implement its real display and reward adapters, including its consent, signature, inventory and retry requirements; the tested local adapter is not that integration.
3. Demonstrate ordinary ads on free/unlocked chapters and a real authenticated callback producing a persistent unlock on the hosted site.
4. Client review, required fixes and milestone acceptance remain distinct from code/test completion. Existing live Google OAuth and other Phase 1 external checks remain separately tracked.

Phase 3 is not started by this handover.
