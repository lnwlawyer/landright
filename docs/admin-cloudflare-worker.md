# LandRight Admin — Cloudflare Workers adapter

The existing `admin/firebase-auth-gate.mjs` and `admin/firebase-http-handler.mjs` are reused by `admin/cloudflare-worker.mjs`. No duplicate authentication or role implementation is introduced.

## Deployment gate (NOT YET LIVE)
The default exported Worker **deliberately returns HTTP 503** for `GET /api/admin/me`. This is intentional until a trusted Workers-compatible Firebase ID-token verifier **with revocation checking** and a trusted read-only Firestore role reader are integrated. The existing Node Firebase Admin SDK uses Application Default Credentials; Cloudflare Workers cannot simply inherit those credentials or execute the Node HTTP server.

A Workers-compatible implementation must securely obtain Google credentials without putting long-lived service account keys in GitHub, browser code, or chat; it must verify Firebase tokens (including revocation), enforce project `landright-admin`, and read `landrightAdminRoles/{uid}` only. Do not use the SMT2 Google Sheets OAuth token, Firebase MCP account tokens, email strings, or unsigned JWT payloads as proof of Admin status.

The Worker is not a complete deployable production Admin service until that trust boundary is implemented and independently tested. Cloudflare Workers Free usage limits must be checked before deployment; no paid plan or billing is authorized. Never point the public UI at the unconfigured adapter. No Firebase project, roles, or rules are modified by this PR.
