# Deploy Storyhaven: Railway + Vercel

This guide deploys the existing three-process application without placing database or Google OAuth secrets in the frontend:

```text
Browser → Vercel Next.js web → Railway Express API → MongoDB Atlas
                                  Railway publishing worker → MongoDB Atlas
```

The Vercel site is the browser's public origin. It proxies `/api/*` to Railway, so cookies, CSRF origin checks, and the Google callback remain on the Vercel domain.

## Before deployment

1. Push the complete repository to a private GitHub repository. Do not commit `apps/api/.env` or `apps/web/.env.local`.
2. Confirm the Atlas database user can access the `storyhaven` database and that Atlas Network Access permits the Railway API service.
3. Keep the API's uploaded covers on a Railway Volume. Local `.local/uploads` is not production storage.
4. Choose the production Vercel domain. This guide calls it `https://YOUR-VERCEL-DOMAIN.vercel.app`.

The repository pins Node 22.12.0 in `.nvmrc`. Railway automatically supplies `PORT`; the API accepts it when `API_PORT` is absent.

## Railway API service

In Railway, create a project and add a GitHub service named `storyhaven-api` from this repository. Leave the service rooted at the repository root so npm workspaces can resolve `packages/contracts`.

In **Settings**, set:

| Setting          | Value                         |
| ---------------- | ----------------------------- |
| Build command    | `npm ci && npm run build:api` |
| Start command    | `npm run start:api`           |
| Healthcheck path | `/health`                     |

Under **Networking**, generate a public domain. Record it as `https://YOUR-RAILWAY-API-DOMAIN.up.railway.app`.

Attach a Railway Volume to this API service at `/data`. In **Variables**, add:

```env
NODE_ENV=production
API_HOST=0.0.0.0
WEB_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
MONGODB_URI=YOUR_ATLAS_CONNECTION_STRING
MEDIA_DIR=/data/uploads
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://YOUR-VERCEL-DOMAIN.vercel.app/api/v1/auth/google/callback
```

Do not set `ADMIN_NAME`, `ADMIN_EMAIL`, or `ADMIN_PASSWORD` in Railway. Those values are only for one-time local provisioning. Do not set `API_PORT`; Railway supplies `PORT` automatically.

Deploy and open `https://YOUR-RAILWAY-API-DOMAIN.up.railway.app/health`. It must return `{"ready":true}` before continuing.

## Railway publishing worker

Create a second GitHub service from the same repository named `storyhaven-worker`. It does not need a public domain or a volume.

In **Settings**, set:

| Setting       | Value                         |
| ------------- | ----------------------------- |
| Build command | `npm ci && npm run build:api` |
| Start command | `npm run start:worker`        |

In **Variables**, add:

```env
NODE_ENV=production
WEB_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
MONGODB_URI=YOUR_ATLAS_CONNECTION_STRING
MEDIA_DIR=/data/uploads
```

Use the same Atlas URI as the API. The worker runs scheduled chapter publication, premium-to-free conversion and trending tasks. Keep it as an always-running service.

## Vercel web service

Import the same GitHub repository into Vercel. Set **Root Directory** to `apps/web` and enable source files outside the root directory, because `packages/contracts` is shared with the API. The web app maps `@/*` directly to `apps/web/src`, so component and library imports resolve consistently in Vercel builds.

Set these Production environment variables before deploying:

```env
API_INTERNAL_URL=https://YOUR-RAILWAY-API-DOMAIN.up.railway.app
NEXT_PUBLIC_SITE_NAME=Storyhaven
```

Deploy the project. `API_INTERNAL_URL` is server-side only. Do not add Atlas, Google OAuth, administrator, or media variables to Vercel. Redeploy the Vercel project whenever either variable changes.

## Google OAuth production callback

In Google Cloud Console, open the Web application OAuth client and add this exact **Authorized redirect URI**:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/v1/auth/google/callback
```

It must exactly match the `GOOGLE_REDIRECT_URI` on the Railway API service. Do not use the Railway API domain as this callback: Google returns through the Vercel rewrite so the browser receives session cookies for the web application origin.

## Production verification

1. Open the Railway health URL and confirm `ready` is `true`.
2. Open the Vercel homepage and confirm discovery content loads from Atlas.
3. Register, sign in, sign out, then sign in again.
4. Test Google sign-in through the Vercel website.
5. Sign in as the existing administrator, upload a cover, then redeploy Railway and confirm the cover remains available.
6. Publish a scheduled chapter and confirm the worker publishes it at the configured time.

Railway service settings support custom commands for shared monorepos and persistent services. Vercel supports monorepo root directories and injects configured values on new deployments. See [Railway monorepos](https://docs.railway.com/deployments/monorepo), [Railway services](https://docs.railway.com/services), [Railway volumes](https://docs.railway.com/overview/the-basics), [Vercel monorepos](https://vercel.com/docs/monorepos), and [Vercel environment variables](https://vercel.com/docs/environment-variables).
