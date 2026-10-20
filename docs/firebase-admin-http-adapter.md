# LandRight Admin Firebase HTTP adapter — integration staging

`admin/firebase-http-handler.mjs` implements a **read-only, framework-neutral** `GET /api/admin/me` contract. It is not a listening server and must not be bundled into the GitHub Pages frontend.

- Supply a trusted Firebase Admin SDK `getAuth()` object and a server-owned `getAdminRole(uid)` Firestore lookup.
- The client must supply a **Firebase Authentication ID token**, never the SMT2 Google Sheets OAuth access token or a Google OIDC ID token.
- Role records must be explicitly provisioned via a trusted administrator process; never bootstrap by browser-provided email or UID alone.
- Missing, revoked or invalid tokens fail with 401; non-admin or inactive users with 403; role lookup outage with 503.
- A real HTTPS deployment must add origin policy, rate limits, request limits, structured audit, IAM and secrets management. No privileged role-mutation endpoint is exposed in this stage.
- Keep PR #86's Google OIDC handler disabled until its contract is reconciled. Keep PR #89's deny-by-default rules for the dedicated project only.
- Verify `npm test`, CI, and Firebase emulator tests before merge. Do not deploy to Production until a trusted backend has been approved.
