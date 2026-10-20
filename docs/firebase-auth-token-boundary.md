# Firebase Web App configuration — LandRight

The owner provided the public Web App configuration for Firebase project `landright-admin`. It is stored in `firebase-web-config.mjs`. This is **public client configuration**, not a privileged credential. The repository does not contain service-account keys.

## Critical token boundary
- The existing SMT2 Google Sheets access token is scoped to Sheets and **cannot** authenticate Admin.
- `admin/google-id-token.mjs` verifies a **Google OIDC ID token** with issuer `accounts.google.com`, not a Firebase Authentication ID token.
- Firebase Authentication `getIdToken()` issues a **Firebase ID token** with issuer `https://securetoken.google.com/landright-admin`; the backend must use `firebase-admin/auth` `verifyIdToken` for that token type.
- Never disable verification or trust an email/role field from the browser to work around token mismatch.
- Existing PR #86 is an OIDC-only server handler proposal; it must be updated or given a separately defined Google OIDC login flow before enabling Firebase Auth-based Admin.

## Next steps before live activation
1. In Firebase Console, verify `lnwlawyer.github.io` is an authorized domain for the intended Firebase Auth login flow.
2. Add a dedicated sign-in UI using Firebase Auth SDK; do not change the existing SMT2 Sheets login.
3. Add a server-only Firebase ID token verifier and test issuer/audience/revocation behavior.
4. Deploy reviewed Firestore Rules for the dedicated project only, and provision initial Admin through a trusted backend.
5. Select and approve an actual backend runtime and billing implications before deploying any privileged API.

**Current state:** Public identifiers are recorded and validated in tests. No live Firebase Auth sign-in, Admin backend, production Firestore writes or Firebase deployment are implemented by this PR.
