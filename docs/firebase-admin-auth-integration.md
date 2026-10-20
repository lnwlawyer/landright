# Firebase Admin Auth boundary (proposed; not deployed)

This branch adds a **server-only** Firebase ID token authorization gate. It does not deploy a backend, grant an initial administrator, change Firestore production rules, or replace SMT2 Google Sheets OAuth.

## Trusted backend integration

1. On an approved HTTPS server runtime, initialize `firebase-admin` using workload identity / application default credentials (never a service account key in GitHub Pages).
2. Obtain `getAuth()` from `firebase-admin/auth`. Pass it as `firebaseAuth` to `authorizeFirebaseAdmin`; its `verifyIdToken(token, true)` validates signatures, issuer, audience, expiration, and revocation.
3. Implement `getAdminRole(uid)` as a trusted server-only Firestore lookup, checking the role record against the approved schema. The gate expects `{role:'admin',is_active:true}`. Adapt the schema deliberately rather than silently treating missing fields as authorized.
4. Use only `Authorization: Bearer <Firebase ID token>`. Never reuse the Google Sheets access token or Google OIDC ID token from PR #86.
5. Enforce HTTPS, CORS allowlist, rate limits, audit trail, request size limits and transactional role changes at the HTTP boundary. The gate alone is **not** a deployed service.
6. Keep Firestore browser access deny-by-default. Bootstrap the first admin through a separately approved trusted procedure; never via browser-supplied email or role.
7. Test positive/negative access, revocation, disabled users, role changes and audit with emulator and a staging backend before production activation.

## Dependencies

This branch is based on PR #90. It must be integrated with the dedicated Firebase rules in PR #89 and the server-side handler in PR #86 **after** reconciling its Google OIDC token contract. Do not merge PR #86 unchanged as a Firebase Authentication handler.
