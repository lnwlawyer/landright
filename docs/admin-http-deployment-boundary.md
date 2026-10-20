# LandRight Admin HTTP integration — deployment boundary

`admin/http-handler.mjs` defines a **server-only, framework-neutral handler**, not a running HTTP service. Its `handle({method,path,headers,body})` method returns `{status,headers,body}`. An approved server runtime must enforce HTTPS, JSON body size limits, request timeout, allowed origins, rate limiting and logging before calling it.

Routes:
- `GET /api/admin/me`: requires a valid Google **ID token** and a currently enabled server-owned Admin role.
- `POST /api/admin/roles/change`: same authorization, strict input allowlist, transactional role update and audit.

The token must be supplied as `Authorization: Bearer <Google ID token>`. Google Sheets OAuth access tokens are **not** accepted as identity. The handler never trusts a role or actor in request JSON. It returns no-store responses. Tests use synthetic locally signed ID tokens and an in-memory role store; they do not contact Google or Firebase.

**Not yet live:** No HTTP server, Admin UI, deployed service, trusted bootstrap, production Firestore database, origin allowlist, rate limits or credentials have been configured. Do not deploy to GitHub Pages: its static JavaScript cannot securely host privileged endpoints. Before enabling real role mutations, approve a backend hosting environment and isolated Firebase project, verify Firestore security rules and run production-like end-to-end tests. Preserve SMT2 and Sheets data.
