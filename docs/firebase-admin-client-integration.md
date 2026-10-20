# Firebase Admin browser client gate (not enabled in production UI)

Import `loadFirebaseAdminClient` from `admin/firebase-client-gate.mjs` on a dedicated Admin page only **after** a trusted HTTPS backend has been deployed and validated. Pass its HTTPS origin as `apiBaseUrl`. The module uses Firebase Authentication with in-memory persistence, obtains Firebase **ID** tokens, and calls `GET /api/admin/me` with `credentials: omit`. Never use SMT2 Google OAuth tokens.

Example:
```js
const client = await loadFirebaseAdminClient({apiBaseUrl:'https://YOUR-TRUSTED-ADMIN-BACKEND'});
const result = await client.login();
if (result.authorized) { /* reveal Admin UI; all data operations still require server-side checks */ }
```

Do not render sensitive Admin records based solely on browser-side state. Do not add this module to the public landing page until the trusted endpoint is live and verified. Login UX is not a substitute for Firestore security rules or backend authorization. The backend must implement strict HTTPS, approved CORS, throttling, secure logs and role provisioning. No Firebase rules, credentials, or production roles are changed by this PR.
