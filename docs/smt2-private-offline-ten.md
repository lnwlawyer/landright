# SMT2 private backend — ten offline verification workstreams

**Scope:** GitHub-only policy verification; no real Apps Script deployment, spreadsheet access, staff accounts, or paid services.

1. Confirm PR #35 CI and Pages completed successfully.
2. Define deterministic identity normalization; blank identity is denied.
3. Test reader authorization against explicit allowlists.
4. Test editor authorization independently from reader access.
5. Verify editor role includes reader access without granting reader writes.
6. Deny Config, OrgChart, and both excluded group sheets even if present in a sheet listing.
7. Bound page number and page size to prevent unrestricted reads.
8. Require an explicit nonempty unique column projection.
9. Verify projected rows omit nonapproved columns using entirely fictional test data.
10. Integrate the tests with the existing `npm test` GitHub Actions gate; preserve rollback and nondeployment boundaries.

The policy implementation in `smt2/backend/private-policy.mjs` is a **pure JavaScript contract for offline tests**, not an authentication API. The Apps Script example `private-read-guards.reference.gs` remains non-deployed. Production security is **not** established by passing these tests.

## Remaining acceptance tests for a disposable spreadsheet

- Confirm the chosen restricted Apps Script deployment exposes a verified caller email (blank email must be rejected).
- Deny anonymous access, reader writes, unauthorized editors, excluded sheets and unapproved columns.
- Reject stale edits and concurrent conflicting writes; test locking and rollback.
- Replace or disable every unguarded legacy Apps Script entry point, not just add new wrappers.
- Confirm the production Apps Script audience is no longer unrestricted `Anyone` executing as owner.
- Keep the private Apps Script-hosted UI separate from anonymous GitHub Pages until a secure transport is proven.

No production deployment should occur before those checks and owner approval.
