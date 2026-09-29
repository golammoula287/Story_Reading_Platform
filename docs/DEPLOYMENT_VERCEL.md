# Deploy frontend and backend to Vercel

Deploy the same complete repository as **two Vercel projects**. Next.js stays in `apps/web`; Express stays in `apps/api`. MongoDB Atlas stores accounts, sessions, content and shared rate limits. Cloudinary stores covers. Vercel does not host MongoDB or a permanent worker process.

This setup was requested on 2026-09-29. It is an explicit hosting change from the original VPS proposal and supersedes the Railway/Render setup for this deployment. It does not establish contractual acceptance or complete later product phases.

## 1. Create projects

Use a developer-controlled repository or deliver the source for the client to import. Do not log into the client's GitHub account. Create both projects in the client-owned Vercel team and reserve their stable production domains before configuring variables.

| Setting                                     | Backend                                           | Frontend             |
| ------------------------------------------- | ------------------------------------------------- | -------------------- |
| Root Directory                              | `apps/api`                                        | `apps/web`           |
| Framework Preset                            | Other                                             | Next.js              |
| Node.js version                             | 22.x                                              | 22.x                 |
| Include source files outside Root Directory | Enabled                                           | Enabled              |
| Install command (committed config)          | `cd ../.. && npm ci`                              | `cd ../.. && npm ci` |
| Build command (committed config)            | `npm run build`                                   | `npm run build`      |
| Output directory                            | `public` (empty static folder; API is a Function) | Next.js default      |

Keep the repository root lockfile and `packages/contracts` available to both projects. Do not upload either app folder by itself. Do not override the backend with the Express auto-detected preset: the committed config intentionally uses a built Node function at `api/index.js` to bundle the shared contracts and avoid starting the standalone server/worker.

The backend catch-all rewrite preserves request paths including `/health`, `/api/v1/*`, and `/internal/publishing`. `dist` is generated during the build and must not be committed. There is no start command on Vercel.

## 2. Backend environment variables

Enter only the value in Vercel's Value field: for WEB_ORIGIN use `https://story-reading-platform-zeta.vercel.app`, not a whole assignment or formatted link. The backend also normalizes copied WEB_ORIGIN assignments and Markdown links whose displayed URL exactly matches their destination. Paths, credentials, non-HTTP(S) URLs and mismatched links remain invalid. Invalid configuration logs name the setting without echoing its value.

Set these in the **backend project's Production environment**, using real values in the dashboard, never source files:

| Variable                | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| `NODE_ENV`              | `production`                                                             |
| `MONGODB_URI`           | Client-owned Atlas URI with an explicit application database name        |
| `WEB_ORIGIN`            | `https://YOUR-FRONTEND.vercel.app` (or canonical frontend custom domain) |
| `MEDIA_STORAGE`         | `cloudinary` (required on Vercel)                                        |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                                                    |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                                                       |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret; server-only                                       |
| `CRON_SECRET`           | Random secret, at least 32 characters                                    |
| `GOOGLE_CLIENT_ID`      | Google web OAuth client ID, when enabling Google login                   |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth client secret, when enabling Google login                   |
| `GOOGLE_REDIRECT_URI`   | `https://YOUR-FRONTEND.vercel.app/api/v1/auth/google/callback`           |

Generate a cron secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and store it only in the backend dashboard/password manager. No `API_PORT`, `API_HOST`, or `MEDIA_DIR` is needed on Vercel. Do not add provisioning passwords, `TEST_MONGODB_URI`, or frontend variables here.

Configure Atlas network access for the selected Vercel egress arrangement and a database user restricted to this application's database. Use the same database if intentionally retaining current data. Never reset/seed production as part of deployment. Enable managed backups and arrange a separate restore drill. Provision a new administrator only if needed using the existing `npm run admin:create` command in a trusted local environment pointed at the intended database; remove provisioning password variables afterward.

Backend production routes must be reachable by frontend SSR and rewrites without Vercel login protection. Use the team's appropriate Production Deployment Protection setting; application routes continue enforcing their own authentication. Keep preview projects protected and isolated. Recheck this when assigning custom domains.

Deploy the backend first and confirm `https://YOUR-BACKEND.vercel.app/health` returns HTTP 200 and `{"ready":true}`. A 503 means the database/index initialization is unavailable; inspect project configuration without logging credentials.

## 3. Frontend environment variables

Generated Vercel frontend aliases now redirect to the project's production domain before pages or login are served. This keeps browser Origin and OAuth cookies aligned with backend WEB_ORIGIN. Vercel supplies VERCEL_PROJECT_PRODUCTION_URL automatically when system variables are enabled. For a separate staging frontend/custom domain, set frontend CANONICAL_WEB_ORIGIN to the HTTPS origin trusted by that backend. This does not bypass Vercel deployment protection or allow preview origins in the production API. See [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables).

You can deploy the frontend before the backend exists: leave `API_INTERNAL_URL` unset or keep the local template value. On Vercel this builds the frontend with API routes returning a no-store 503 until setup is complete. Reading, authentication and admin data require the backend. After hosting the API, set its HTTPS origin below and rebuild/redeploy the frontend to activate the proxy. Malformed URLs still fail validation.

Set in the **frontend project's Production environment** before building:

```dotenv
API_INTERNAL_URL=https://YOUR-BACKEND.vercel.app
NEXT_PUBLIC_SITE_NAME=Storyhaven
```

Use only the backend origin, with no `/api` suffix. The API URL is used by SSR, `/backend-status`, and the Next.js `/api/*` rewrite. Rebuild/redeploy the frontend whenever it changes. Never put database, Cloudinary, cron, or Google secrets in this project or in `NEXT_PUBLIC_*` variables.

Deploy the frontend. Browsers call the frontend `/api/v1/*` path, keeping Secure/HttpOnly sessions and Google state cookies on the frontend domain. No wildcard CORS or cross-site cookie relaxation is needed. In Google Cloud, register the frontend origin and the exact frontend callback URL above. Use the canonical frontend domain for `WEB_ORIGIN`; redirect alternate domains to it. A 403 CSRF generally means the frontend origin and backend `WEB_ORIGIN` differ.

For previews, use a separate backend/Atlas database and stable staging frontend domain with matching `WEB_ORIGIN` and OAuth callback. Arbitrary preview URLs are intentionally not trusted. Do not connect a testing preview to the production database.

## 4. Publishing scheduler

The backend config schedules `GET /internal/publishing` daily at `0 0 * * *` (UTC), compatible with Hobby. Vercel sends `Authorization: Bearer <CRON_SECRET>`. Missing/incorrect credentials are rejected; browser sessions cannot authorize this endpoint. Do not run `start:worker` on Vercel.

For minute-level database updates, use a plan supporting minute-level cron and change the schedule in `apps/api/vercel.json` to `* * * * *`, then redeploy. Hobby rejects more frequent cron schedules. Daily cron can run within the scheduled hour, and cron runs only on production deployments. The existing read-time checks enforce elapsed publication/free dates even before the cleanup job runs; the persisted admin status can lag until the job runs. Jobs use idempotent conditional updates and catch up after downtime. Check Cron logs after deployment and after rollbacks; rollback does not automatically restore cron settings.

## 5. Covers and platform limits

Cloudinary is mandatory because Vercel has no persistent local upload directory. Existing Cloudinary mappings work with the same Atlas database. Covers that exist only on Render/local disk must be re-uploaded through the admin editor to Cloudinary before retiring that backend; changing `MEDIA_STORAGE` does not migrate them.

Keep source cover files at or below **4 MiB** on Vercel, leaving room for multipart overhead below the platform's 4.5 MB request limit. Larger requests can be rejected by Vercel before Express runs. Other hosts retain the existing 5 MiB limit. Cover decoding/cropping and Cloudinary credentials remain in Express. The API function has a 60-second maximum duration; MongoDB connection selection and provider upload timeouts are bounded. Connections are reused per warm instance with a ten-connection pool. Authentication and general API counters use MongoDB on Vercel rather than per-instance memory.

## 6. Verify before switching traffic

1. Backend `/health` and frontend `/backend-status` return 200. Frontend `/api/v1/auth/providers` returns JSON, not a Vercel login page or 404.
2. Register a test reader, reload, sign out/in, and confirm library persistence. Check Secure/HttpOnly cookies, and reject an untrusted-origin write with 403.
3. Anonymous `/api/v1/chapters/CHAPTER_ID/content` returns 401 with no-store; locked chapters stay inaccessible without entitlement. Inspect public pages for private text leakage.
4. Upload a small cover as admin, redeploy the API, and verify that the cover still loads. Verify chapter publishing and an elapsed schedule.
5. An unauthenticated `/internal/publishing` request returns 401. Trigger the configured cron from Vercel and confirm success/idempotence in Cron logs.
6. Complete real Google sign-in through the frontend domain. Local mocks do not verify Google or Cloudinary accounts.

Keep the old deployment available until these pass. Roll back through Vercel deployment promotion, recheck frontend API target/backend origin alignment and cron settings, and retain Atlas/Cloudinary data. Deployments do not back up or roll back database content. Reward provider verification, backup restore, client review and remaining milestone acceptance stay separate.

## References

Local verification on 2026-09-29: API/worker/serverless and Next.js builds, workspace type checks, all 27 API tests, and a smoke test of the compiled Vercel entry passed. The real database tests used isolated local MongoDB databases; provider calls in media tests were mocked. Vercel-hosted routing, live cron, Google consent and Cloudinary accounts still require the checks above after deployment.

- [Vercel monorepos](https://vercel.com/docs/monorepos)
- [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Cron security and management](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Function limits](https://vercel.com/docs/functions/limitations)
