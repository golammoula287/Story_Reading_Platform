# Render login and registration configuration

Frontend service -> Environment:

```dotenv
NODE_ENV=production
API_INTERNAL_URL=https://story-reading-platform-backend.onrender.com
NEXT_PUBLIC_SITE_NAME=Storyhaven
```

Backend service -> Environment:

```dotenv
NODE_ENV=production
API_HOST=0.0.0.0
WEB_ORIGIN=https://story-reading-platform-frontend.onrender.com
GOOGLE_REDIRECT_URI=https://story-reading-platform-frontend.onrender.com/api/v1/auth/google/callback
```

Keep the existing MongoDB and Google secrets on the backend only. Keep the same intended database. Register the exact Google callback above in Google Cloud as an authorized redirect URI.

Choose **Save, rebuild, and deploy** on the frontend: Next.js rewrites capture the API destination at build time. Redeploy the backend after changing its environment. Editing a local .env or .env.example does not change Render settings. Check linked environment groups for conflicting values.

Browser requests must remain relative /api/v1 requests through the frontend so session cookies belong to the frontend. Do not disable the backend's CSRF checks or change the browser to call the backend directly.

Verification: frontend /api/v1/auth/providers should return HTTP 200 JSON. A login with intentionally invalid credentials from the frontend origin should return 401 LOGIN_FAILED, not 500 or 403 CSRF. Then verify register -> account -> logout -> login in a browser with a test account. Provider availability alone does not prove Google sign-in works.

Render reference: https://render.com/docs/configure-environment-variables
