# Cloudflare deployment checklist — LandRight Admin API

The root `wrangler.toml` targets **only** `landright-admin-api`. Existing `firebase-readonly-mcp` and `firebase-mcp` are not deployment targets.

In Cloudflare Workers & Pages → Create application → Continue with GitHub:
- Repository: `lnwlawyer/landright`
- Project name: `landright-admin-api`
- Root path: `/`
- Build command: blank
- Deploy command: `npx wrangler deploy`
- Preview builds: off until authorization is ready
- Cloudflare API token: a dedicated token scoped to the new Worker. Do not reuse `firebase-readonly-mcp-builds` without reviewing its permissions.

**Deployment safety:** Without the encrypted Worker secret `FIREBASE_SERVICE_ACCOUNT_JSON`, `GET /api/admin/me` responds with HTTP 503, even when a token is supplied. This is expected and safe. Do not route the production UI to the Worker until all Firebase checks pass.

A dedicated least-privilege Google service account and encrypted Cloudflare Worker secret are required for the current integration. A key is **not** generated or supplied here. If exportable private keys are disallowed, stop and use an approved keyless solution rather than bypassing the security gate.

After deployment, validate Worker hostname, HTTP 503 before provisioning, strict CORS, and no access to private data. Provision and test role access only through an authorized Firebase operator. Cloudflare Workers Free quotas and Google API billing must be reviewed; do not enable paid features automatically.
