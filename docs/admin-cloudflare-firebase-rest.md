# Cloudflare Workers Free: trusted Firebase Admin REST integration

Entry: `admin/cloudflare-firebase-entry.mjs`. This reuses the existing `cloudflare-worker.mjs` adapter, `workers-firebase-auth.mjs` verifier and `firebase-auth-gate.mjs` authorization boundary.

## Required operator actions (not performed by this PR)

1. In Google Cloud project `landright-admin`, an authorized operator must create a **dedicated least-privilege service account**, with permissions to look up Firebase Authentication users and read only the Firestore `landrightAdminRoles` documents. Review actual IAM and Firestore permission grants before production use; do not reuse the read-only Firebase MCP account or SMT2 OAuth token.
2. This implementation uses a Google service account **private key stored only in Cloudflare's encrypted Worker secret** named `FIREBASE_SERVICE_ACCOUNT_JSON`. It is never committed to GitHub or exposed to the browser. Keys require rotation and revocation procedures; this is **not a keyless workload identity solution**. If organizational policy prohibits exportable service-account keys, do **not deploy** this adapter; choose an approved keyless broker instead.
3. Set the Cloudflare Worker entrypoint to `admin/cloudflare-firebase-entry.mjs`, and configure the encrypted secret using Cloudflare's authenticated dashboard or Wrangler secret interface. Do not paste the credential into ChatGPT or GitHub issues. Restrict deploy access, set log redaction, monitor quotas and API errors.
4. Check Cloudflare Workers Free request/CPU limits, Google API quotas and billing status before deploying. No claim of guaranteed zero cost is made. Configure public Admin frontend endpoint only **after** production smoke tests.
5. Manually provision an audited Firestore document `landrightAdminRoles/{FirebaseAuthUID}` with `role: "admin"`, `is_active: true` only for the approved administrator. The browser cannot create this role.
6. Test signed-in Admin 200, normal user 403, disabled/revoked user 401, missing role 403, bad token 401, invalid origin 403, no credential 503 and unavailable Google APIs 503. Verify HTTPS and no-store.

**Status:** code and tests only. No Cloudflare deployment, Google Cloud IAM modification, Firebase data modification, or credential provisioning is performed by this PR.
