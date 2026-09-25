# Phase 1 API reference

Base: `/api/v1`. Express owns the API independently of Next.js. Browser requests use same-origin proxying and the `sh_session` HttpOnly cookie. All state-changing requests need an exact allowed `Origin` plus `X-Requested-With: Storyhaven`. Use JSON unless uploading a cover. No credentials are required to read published public metadata. Private routes return `Cache-Control: private, no-store`.

Error shape: `{ "error": { "code": "AUTH_REQUIRED", "message": "Please sign in to continue." } }`. Common statuses: 400 validation, 401 missing/inactive/expired session, 403 role/content/origin rejection, 404 missing/unpublished resource, 409 duplicate/in-use record, 429 rate limit, 503 unconfigured Google provider. Responses include a request ID. Pagination uses `page` and `limit` (maximum 50) and returns `{items,total,page,pages}`.

## Authentication

| Method/path                 | Input                                | Result                                                   |
| --------------------------- | ------------------------------------ | -------------------------------------------------------- |
| POST `/auth/register`       | name, email, password (12–128 chars) | Reader DTO and session cookie; role cannot be supplied   |
| POST `/auth/login`          | email, password                      | Active user DTO and rotated session cookie               |
| POST `/auth/logout`         | none                                 | Revokes current session; clears cookie                   |
| GET `/auth/me`              | session                              | id, name, email, role, matureConfirmed                   |
| GET `/auth/providers`       | none                                 | Google configuration availability                        |
| GET `/auth/google`          | none                                 | Starts Google authorization with one-use state/PKCE      |
| GET `/auth/google/callback` | provider code/state                  | Verified identity → local session; safe failure redirect |

## Discovery and chapter access

| Method/path                 | Access/parameters                                          | Result                                                        |
| --------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| GET `/taxonomy`             | Public                                                     | Editable facet values and parent references                   |
| GET `/stories`              | q, exact author, comma-separated taxonomy IDs, page, limit | Published story DTOs; combined AND filters                    |
| GET `/stories/:slug`        | Public                                                     | Published story metadata and visible chapter metadata         |
| GET `/trending`             | Public                                                     | Up to 8 published stories with real seven-day activity scores |
| GET `/chapters/:id/preview` | Public; Mature text needs confirmed active user            | Approved excerpt only, safe metadata and gated flag           |
| GET `/chapters/:id/content` | Active user, publication/classification/entitlement checks | Authorized narrative; no public or shared cache               |
| POST `/chapters/:id/read`   | Same authorization as full content                         | Deduplicated daily read event                                 |
| GET `/media/:key`           | Public generated cover key                                 | Processed WebP cover only                                     |

## Reader state

| Method/path                           | Input/result                                                         |
| ------------------------------------- | -------------------------------------------------------------------- |
| GET `/me/library`                     | Paginated saved published stories and eligible resume chapter        |
| GET `/me/library/:storyId`            | `{saved}`                                                            |
| PUT/DELETE `/me/library/:storyId`     | Save/remove own story; idempotent                                    |
| GET `/me/bookmarks`                   | Paginated chapter bookmarks with public story metadata               |
| GET `/me/bookmarks/:chapterId`        | `{saved,blockAnchor}` for own bookmark                               |
| PUT/DELETE `/me/bookmarks/:chapterId` | Save `{blockAnchor}` / remove; full access required to save          |
| GET `/me/progress/:storyId`           | Own current chapter/anchor or null                                   |
| PUT `/me/progress/:storyId`           | `{chapterId,blockAnchor}`; validates story match/access              |
| POST `/me/content-confirmation`       | `{confirmed:true}` records self-attested mature-content confirmation |

## Administrator only

| Method/path                               | Input/result                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| GET `/admin/overview`                     | Story, chapter, reader and draft counts                                                               |
| GET/POST `/admin/stories`                 | Paginated stories / create validated story                                                            |
| GET/PUT/DELETE `/admin/stories/:id`       | Story+chapters / update / transactional cascade deletion                                              |
| POST `/admin/stories/:id/chapters`        | New chapter with separate protected body                                                              |
| PUT `/admin/stories/:id/chapters/reorder` | `{ids:[all chapter IDs in desired order]}`                                                            |
| GET/PUT/DELETE `/admin/chapters/:id`      | Private chapter including body / update / delete                                                      |
| POST `/admin/taxonomy`                    | name, slug, facet, nullable parentId                                                                  |
| PUT/DELETE `/admin/taxonomy/:id`          | Update or delete unused facet value                                                                   |
| GET `/admin/users`                        | Paginated q search over name/email; no password hashes                                                |
| PATCH `/admin/users/:id`                  | `{status:"active" or "suspended"}`; revokes existing sessions                                         |
| DELETE `/admin/users/:id`                 | Anonymize non-admin identity and clear personal reader data                                           |
| GET `/admin/users/:id/activity`           | Latest 50 library/bookmark/progress/read entries per category; comment placeholder marked unavailable |
| POST `/admin/media`                       | multipart field `cover`; validated image → `{key,width:600,height:900}`                               |

Story input: title, slug, authorName, prologue, status (`draft`/`published`), classification (`clean`/`mature`), taxonomyIds, optional nullable coverKey.

Chapter input: title, slug, body (plain text, max 200,000 characters), status (`draft`/`scheduled`/`published`), nullable ISO-UTC publishAt/freeAt, accessType (`free`/`premium`), preview `{mode:"percentage"|"words",value:number}`. Scheduled publication needs a date; percentage preview must be below 100 and word count at most 10,000. The excerpt engine caps output below the complete chapter even when the requested count exceeds its length.

Infrastructure readiness endpoint: `GET /health` outside the API version prefix. Returns 200 only when the database connection is ready.
