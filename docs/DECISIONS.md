# Phase 1 decisions and provider investigation

Updated 2026-09-24. The user authorized completing Phase 1. No final branding, credentials or provider details were supplied during implementation. Independent development proceeded using the defaults below; these are not represented as client approvals.

## Product and technical defaults

| Topic            | Implemented default                                                                                         | Can be changed / remaining decision                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Brand            | Storyhaven; ivory/forest-green editorial design                                                             | Temporary name/logo treatment; final brand remains pending                                             |
| Language         | English UI; Unicode story text and word-boundary previews                                                   | Bengali supported as content; confirm full UI translation needs                                        |
| Cover            | Validated JPEG/PNG/WebP, max 5 MB and 25 megapixels; generated 600×900 WebP                                 | Confirm final cover ratio                                                                              |
| Author           | Editable story author name                                                                                  | No separate author login/portal                                                                        |
| Taxonomy         | Editable genre, subgenre, trope, descriptor and tag                                                         | Seed categories can be edited without a deployment                                                     |
| Search           | Normalized title/author tokens, exact author filter and selected taxonomy facets                            | No language stemming, fuzzy search or large-scale search engine claimed                                |
| Trending         | Last seven days: unique reader/chapter/day reads + 3 × current new library additions                        | Real activity only; ranking formula remains client-reviewable                                          |
| Reader storage   | Per-account library, per-chapter bookmark, per-story chapter/paragraph resume                               | Preferences/themes are Phase 2                                                                         |
| Preview          | Per-chapter percentage or word count, 20% initial default, always below full body                           | Global default settings UI belongs to Phase 3                                                          |
| Mature text      | Narrative preview/full content requires stored self-attested content confirmation; metadata remains public  | Age threshold and final wording unconfirmed; this is not identity verification or finalized age policy |
| Account deletion | Anonymize identity, clear credentials/sessions and delete personal reading/unlock records                   | Review final retention policy before production                                                        |
| Schedules        | UTC storage, browser-local date entry, atomic idempotent worker updates every 15 seconds                    | Display a fixed site timezone if client prefers                                                        |
| Chapter ordering | Parent-serialized transaction; contiguous order written atomically, indexed without a uniqueness constraint | Avoid transient duplicate-key problems during swaps; API enforces complete exact reorder sets          |
| Content storage  | Separate chapter metadata/body documents, on-demand server-only excerpt generation                          | Derived preview collection/cache unnecessary for this scale; avoids stale-preview leakage              |
| Hosting          | Local replica-set MongoDB and persisted local covers                                                        | Client-owned production hosting/media/database choices remain Phase 3 dependencies                     |

The implemented UI serves as the Phase 1 reviewable design: homepage/discovery → story details → chapter preview → sign-in → authorized reading; library/bookmark screens; administrator overview → story editor → chapter editor; taxonomy and user management. Screenshots under `docs/screenshots` capture desktop/mobile discovery and the studio.

## Rewarded-ad feasibility result

**Status: researched; not validated with a live provider. This remains an external acceptance dependency from subphase 1.1 and blocks the Phase 2 integration decision.**

The requirement is specifically a completed browser rewarded advertisement verified through an authenticated server-to-server provider callback, bound to a reader and chapter. A generic client event, offer completion or a mobile-only SDK is not enough.

| Candidate evidence                                                                                                                                                                           | What the primary source establishes                                                   | Result                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [Google Publisher Tag rewarded sample](https://developers.google.com/publisher-tag/samples/display-rewarded-ad)                                                                              | Browser rewarded ads and client reward/completion events                              | Browser rendering supported; this source does not establish the required web S2S verification               |
| [Google AdMob SSV](https://developers.google.com/admob/android/ssv)                                                                                                                          | Signed reward callback flow for mobile SDK integrations                               | Useful verification reference; not proof of browser compatibility                                           |
| [Lootably placement configuration](https://documentation.lootably.com/docs/configuring-your-placement) and [publisher onboarding](https://documentation.lootably.com/docs/getting-started-1) | Web/app offerwall integration, postback configuration and approved publisher accounts | Possible investigation candidate; not proof of a single fully watched web-video reward fitting this product |

No provider account was created, no application was submitted, and no live callback was fabricated or accepted. No provider is selected. Before Phase 2.3: obtain client-owned approved account/placement; confirm web video-completion semantics, permitted Clean/Mature content and audience/geography; implement the documented verification adapter; test signed completion, duplicate/replay/expiry/invalid signature and no-fill states. Record the provider's evidence and observed callback result. If compatibility cannot be established, agree a scope/timeline resolution instead of granting rewards from browser signals.

## Google authentication validation boundary

Backend authorization code exchange, PKCE, one-use state, audience/nonce verification, active-account checks and secure session issuance are implemented. Invalid state and missing-config failure cases are tested. Successful real Google consent/token exchange remains untested because client credentials were not supplied. Follow README setup and record a live sign-in/sign-out/suspension test before milestone contractual acceptance.
