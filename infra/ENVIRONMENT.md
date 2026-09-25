# Environment configuration

Configuration is deliberately split by application so a web deployment never receives database, Google OAuth, or administrator secrets.

| Process | Local file | Production configuration |
| --- | --- | --- |
| Express API and publishing worker | `apps/api/.env` | Hosting platform/service environment for both API processes |
| Next.js web application | `apps/web/.env.local` | Hosting platform/service environment for the web build and process |

Copy the matching `.env.example` file when starting locally. Both local files are ignored by Git. Do not create a root `.env`.

## API and worker

Set these for the API and worker: `NODE_ENV`, `API_PORT`, `API_HOST`, `WEB_ORIGIN`, `MONGODB_URI`, `MEDIA_DIR`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`. `TEST_MONGODB_URI` is for local test runs only. Administrator provisioning values are short-lived local inputs; do not retain them in production configuration.

For production, use `NODE_ENV=production`, an HTTPS `WEB_ORIGIN`, a private authenticated MongoDB URI, and an absolute persistent-volume `MEDIA_DIR`, for example `/var/lib/storyhaven/uploads`. The Google redirect URI must be the exact public URL, such as `https://example.com/api/v1/auth/google/callback`.

## Web application

Set `API_INTERNAL_URL` to the private URL reachable by the Next.js server, such as `http://127.0.0.1:4000` on one VPS. Set `NEXT_PUBLIC_SITE_NAME` for the browser-visible site label. Do not put credentials in the web configuration: every `NEXT_PUBLIC_` value is embedded in the browser bundle when Next.js builds.

Set web environment values before `npm run build`; rebuild after changing any `NEXT_PUBLIC_` value. In a managed host, define the web variables for both the build and runtime contexts if the host distinguishes them.
