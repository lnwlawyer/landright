# LandRight Admin trusted Node backend (staging only)

`admin/node-server.mjs` is a **server-only adapter**, not a deployed service. The server requires a trusted environment with `firebase-admin` installed and workload identity / application default credentials for the **dedicated** `landright-admin` project. It does not accept browser role assertions.

## Integration
- Provision a trusted HTTPS reverse proxy or approved HTTPS hosting service; the Node adapter listens on loopback only.
- Restrict the service account to required Firebase Admin Auth verification and read-only Firestore role lookup where practical. Keep secrets and service credentials out of GitHub Pages.
- Configure a strict origin allowlist, HTTPS termination, timeouts, rate limiting, logging, request size limits, monitoring and incident response at the reverse proxy.
- Never reuse the SMT2 Google Sheets OAuth access token. Frontend Firebase Auth `getIdToken()` is the correct token type.
- First Admin provisioning is a separate privileged, audited process. Do not create Admin users based on email sent from the browser.
- Only `GET /api/admin/me` is exposed; role changes are deliberately not implemented.
- `firebase-admin` must be installed in the **server** environment. It is not a frontend dependency.
- No production Firebase rules, data, role grants or credentials are changed by this PR.
- Tests exercise local Node HTTP only; staging deployment and real Firebase role tests remain required.
