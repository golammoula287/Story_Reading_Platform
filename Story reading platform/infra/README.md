# Local infrastructure and future deployment

Phase 1 runs Next.js on localhost:3000, Express on 127.0.0.1:4000, and MongoDB on 127.0.0.1:27018. `npm run db:local` starts a single-node development replica set named `storyhaven` using `.local/mongo`. Transactions protect chapter/body writes and list ordering. This is a local development database; do not expose its port publicly or reuse its unauthenticated settings in production.

`npm run dev` starts web, API and the publishing worker together. The Next.js rewrite supplies same-origin `/api/v1` access. The API's WEB_ORIGIN must exactly match the browser origin, including the port. Use `http://localhost:3000`, not a mixture of localhost and 127.0.0.1.

Production deployment remains Phase 3. Its required processes are `node apps/api/dist/server.js` and `node apps/api/dist/workers/publishing.js` (run with the API working directory), plus `npm run start -w @storyhaven/web`. Use client-owned infrastructure, authenticated private MongoDB, TLS/reverse proxy, secrets outside source and persistent cover storage. Express currently trusts loopback proxies only; review proxy topology before changing it. The initial in-memory rate limiter assumes one API process; use a shared limiter before horizontal scaling.

See [environment configuration](ENVIRONMENT.md) for the separate API and web configuration required locally and in hosting.

Cover files are generated WebP images beneath `.local/uploads` by default. Database and media are excluded from milestone source archives. Backup, restore automation and production deployment are deliberately tracked in Phase 3, not represented as completed here.
