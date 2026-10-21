# WIF feasibility for LandRight Admin API (Cloudflare Workers Free)

**Status: optional provider implemented, not activated in production.** Cloudflare Workers has not been verified to provide a Google-trusted, workload-specific OIDC assertion to ordinary Workers at runtime. GitHub Actions OIDC exists only in CI jobs, not in the deployed Worker. Never substitute a Firebase user ID token, an unsigned JWT, or a static client secret for a workload identity.

Google Cloud WIF requires a trusted external OIDC/SAML issuer and a short-lived assertion, exchanged at Google STS. `admin/google-wif-token.mjs` provides a tested exchange/cache primitive that accepts a **trusted runtime subject token callback**. It intentionally does not issue assertions or wire itself into the production entrypoint.

Production remains fail-closed without `FIREBASE_SERVICE_ACCOUNT_JSON`; no Google private key is created or stored by this change.

Before enabling keyless auth, establish:
1. A real OIDC issuer with discovery/JWKS and workload-bound short-lived assertions available inside Cloudflare Workers on the Free plan.
2. A Google WIF pool/provider scoped to that issuer and narrowly mapped subject, and a Google Cloud IAM authorization strategy (direct WIF access where supported or service account impersonation).
3. Verified Google Identity Toolkit `accounts:lookup` and Firestore REST access, revocation checks, negative tests, and production access restrictions.
4. No static signing key or privileged token committed to GitHub or exposed to the browser.

If no suitable runtime OIDC assertion source exists, WIF cannot be safely activated simply by configuring Google Cloud. Consider an approved Google Cloud runtime with a metadata-server identity or a carefully reviewed encrypted service account secret instead.

References:
- https://docs.cloud.google.com/iam/docs/workload-identity-federation
- https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-providers
- https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation
