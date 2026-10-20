# LandRight — isolated Firebase project setup (approval checklist)

**Decision:** Create a new Firebase project for LandRight Admin only. Do **not** reuse the Firebase projects for Land-KM, LawLand, SMT2, or any existing production dataset.

## 1. Create the project (owner action)

1. Sign in to [Firebase Console](https://console.firebase.google.com/) with the account authorized to administer LandRight.
2. Select **Add project**. Choose a new, unique project ID (example pattern: `landright-admin-<unique-suffix>`; this is **not** a provisioned ID).
3. Review billing and product terms before proceeding. Do not enable Blaze billing or paid services without separate approval. Keep the project on Spark if available for the selected products.
4. Enable Firestore Database only after reviewing the project and rules. Start with restrictive rules below; do not allow public read/write.
5. Under Authentication, plan a Google sign-in provider for the **separate** Admin frontend integration. Record the web OAuth client ID and authorized origins. Google Sheets OAuth access tokens are **not** Google ID tokens.
6. Keep all Admin SDK service-account credentials in a server secret manager, never in this repository, GitHub Pages, browser code, or shared documents.

## 2. Server-only Firestore collections

- `landrightAdminRoles/{google-sub}` — trusted `subject`, `role`, `disabled`, `version`
- `landrightAdminAudit/{correlationId}` — immutable audit records
- `landrightAdminMetadata/roles` — `enabledAdminCount`, `version`

Use **separate collections** in the new project. The initial Admin must be provisioned using a trusted, separately reviewed one-time server bootstrap after verifying their Google subject. Never bootstrap via a public website or unauthenticated endpoint.

## 3. Deny all browser access

Use the rules in `admin/firestore.rules` as the starting point for the **new** project. Server Admin SDK access is governed by IAM and bypasses Firestore client rules; therefore, enforce role checks and audit transactions on every server API request. Verify rules using the Firestore Emulator before deployment.

## 4. Pre-deployment gates

- [ ] Owner supplies the new Firebase **project ID**, confirms it is distinct from existing projects, and approves the intended billing tier.
- [ ] Backend hosting selected and approved, including any pricing or billing requirement.
- [ ] Dedicated service identity uses minimum necessary IAM permissions.
- [ ] Verify Google ID tokens using a fixed audience and trusted JWKS.
- [ ] Bootstrap initial Admin and metadata atomically; verify enabled Admin count.
- [ ] Run Firestore Emulator tests, including simultaneous demotions and audit failures.
- [ ] Add rate limiting, body size limits, CORS allowlist, CSRF considerations, observability and backup/restore procedures.
- [ ] Deploy server API separately from static GitHub Pages, test with a nonprivileged account, then authorize production activation.

**Current state:** This checklist does not create a Firebase project, enable billing, deploy a backend, modify Firestore rules, or activate Admin features.
