# Phase 1 database handover

Source of truth: `apps/api/src/models.ts`. All references use MongoDB ObjectIds. MongoDB must support transactions (local helper runs a single-node replica set). Timestamps are stored in UTC.

| Model / default Mongo collection | Data and relationships                                                                                              | Index/invariant                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| User / users                     | Identity, password hash or Google subject, role/status, content confirmation                                        | Unique email; unique partial Google subject; password excluded from normal selection  |
| Session / sessions               | User reference, SHA256 opaque-session token hash, expiry                                                            | Unique token hash; TTL cleanup plus explicit expiry check                             |
| OAuthState / oauthstates         | One-use state hash, nonce, PKCE verifier and expiry                                                                 | Unique state hash, TTL; consumed on callback                                          |
| Story / stories                  | Public metadata, author, prologue, cover key, classification, status, taxonomy references, normalized search tokens | Unique slug; publication/time, taxonomy and search-token indexes                      |
| Chapter / chapters               | Story reference, metadata, order, status/dates, access type and preview configuration                               | Unique story+slug; story+order and status+publishAt indexes                           |
| ChapterContent / chaptercontents | Chapter reference and plain narrative text                                                                          | Unique chapter reference; never joined into public DTOs                               |
| Taxonomy / taxonomies            | Facet/name/slug and optional parent genre                                                                           | Unique facet+slug; API validates hierarchy and in-use deletion                        |
| Library / libraries              | User + story                                                                                                        | Unique user+story; account-persistent saved stories                                   |
| Bookmark / bookmarks             | User + chapter + paragraph anchor                                                                                   | Unique user+chapter                                                                   |
| Progress / progresses            | User + story + current chapter/anchor                                                                               | Unique user+story; chapter must belong to story and be accessible                     |
| ReadEvent / readevents           | User + story + chapter + UTC day                                                                                    | Unique user+chapter+day; time index for weekly ranking                                |
| Unlock / unlocks                 | User + chapter entitlement                                                                                          | Unique user+chapter; model and access check only, no granting endpoint before Phase 2 |
| Audit / audits                   | Administrator, action and target ID                                                                                 | Identity/body/credential payloads not copied into audit records                       |

Chapter creation/editing pairs metadata/body writes inside transactions. List mutation touches the parent story, serializing concurrent insert/reorder/delete transactions. Reordering requires exactly all current chapter IDs once, then atomically assigns contiguous positions. The order index is intentionally non-unique; the service owns the invariant. This is an implementation refinement to the original planning schema.

Publication jobs use conditional atomic updates and can run again after downtime. Read-time visibility also checks scheduled due dates and automatic-free dates. Story status is always checked; unpublishing the parent withdraws chapter access.

Deletion paths:

- Chapter deletion removes its body/bookmarks/progress/unlocks/read events and renumbers remaining chapters transactionally.
- Story deletion removes its chapters and dependent reader state/body records transactionally. Public cover files may remain orphaned; a cleanup/retention job can be added with operations work.
- Reader deletion anonymizes identity and removes credentials, Google subject, sessions, library, bookmarks, progress, read events and unlocks. Administrator accounts cannot be deleted/suspended through reader-management endpoints.
- Taxonomy in use by a story or child cannot be deleted. Comments will add their retention/moderation rules in Phase 2.

No production database or backup has been created. Source archives exclude `.local` databases and media. Before production, agree retention, media cleanup and backup cadence, restrict database access, create authentication credentials and verify a restore (Phase 3).
