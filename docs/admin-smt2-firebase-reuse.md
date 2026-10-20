# LandRight Admin — reuse existing SMT2 Firebase project (decision revised)

**Decision:** LandRight Admin will use the **existing SMT2 Firebase project**, NOT a new Firebase project. This document supersedes the previous separate-project proposal. The exact SMT2 project ID must be confirmed from its owner-approved configuration before any changes.

## Non-negotiable safety boundaries
- **Do not alter, delete, migrate, or overwrite** existing SMT2 collections, documents, Authentication users, Storage objects, indexes, service accounts, or Firebase Rules without a reviewed change plan.
- LandRight Admin uses distinct namespaced collections: `landrightAdminRoles`, `landrightAdminAudit`, `landrightAdminMetadata`.
- Browser access to all three new collections must be denied. Existing SMT2 Firestore Rules must be **preserved** when adding the new deny rules; do not replace the entire ruleset with deny-all.
- Firestore Admin SDK bypasses Firestore Rules. Restrict server IAM permissions and enforce verified Google ID tokens and server-side role checks on every privileged request.
- Never place Admin SDK credentials in GitHub Pages, GitHub commits, or client JavaScript.
- Keep SMT2's current Google Sheets and Apps Script integrations unchanged.
- No changes to SMT2 production data or settings are authorized by this documentation.

## Before implementation
1. Confirm the exact Firebase project ID and existing Firestore database ID used by SMT2.
2. Read and back up current Firestore Rules and indexes; inspect overlaps from wildcard rules. Check any shared Authentication and OAuth client settings.
3. Review existing collection names and the proposed new namespace for collisions.
4. Verify Firebase plan, Firestore quotas, and whether approved backend hosting is available without unapproved charges.
5. Test the combined ruleset and transaction behavior in Firestore Emulator with synthetic SMT2 fixtures, including regression tests proving SMT2 reads remain unchanged.
6. Plan an explicitly authorized, trusted one-time Admin bootstrap and minimal audit retention policy.
7. Seek explicit approval before applying Firebase Rules, IAM, database writes, or backend deployment to the existing SMT2 project.

## Current status
The Firestore role adapter, transaction tests, and emulator CI are source code only. PR #86 contains an HTTP handler proposal pending separate merge approval. No live Admin backend or UI has been activated. No existing SMT2 Firebase configuration has been changed.
