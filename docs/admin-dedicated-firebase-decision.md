# LandRight — dedicated Firebase project decision

**Current decision (2026-10-20):** Use a NEW Firebase project exclusively for LandRight. Do not use the existing SMT2 project. This document supersedes `docs/admin-smt2-firebase-reuse.md` and all earlier conflicting planning notes.

## Owner creation steps

1. Open https://console.firebase.google.com/ and choose **Add project**.
2. Choose a unique project ID such as `landright-admin-<unique-suffix>` (example only; not created).
3. Review the Spark plan and available quotas. Do not activate Blaze or enable paid services without separate approval. Backend hosting may require billing and is NOT assumed available under Spark.
4. Create a web app registration if needed; record the public Firebase configuration and approved web OAuth client ID. Never commit service account keys.
5. Enable Authentication (Google sign-in) and Firestore only after checking current product availability and project-specific rules. Use deny-by-default browser Firestore access for privileged role collections.
6. Provide the nonsecret project ID to the development workflow for configuration review.

## Isolation and server security

- Preserve existing SMT2, Land-KM and LawLand projects, Google Sheets, Apps Script and data unchanged.
- Server-only role collections: `landrightAdminRoles`, `landrightAdminAudit`, `landrightAdminMetadata`.
- Google Sheets OAuth access tokens are not Google ID tokens. Admin requests require verified OIDC ID tokens and server-side authorization.
- Do not embed Firebase Admin SDK credentials or privileged write operations in GitHub Pages.
- Bootstrap the first Admin only via an approved trusted server procedure, with audit and last-admin protection.
- Firestore Admin SDK bypasses client security rules: restrict IAM and enforce server-side checks.
- Run emulator and backend integration tests before any deployment. Approve hosting platform, billing, domain/origin policy, secret management, and production rollout separately.

## Implementation status

PR #85 added real emulator tests and is merged. PR #86 proposes a server-only HTTP handler and remains pending separate merge approval. No new Firebase project, backend deployment, rules change, service account, or real Admin endpoint is created by this documentation.
