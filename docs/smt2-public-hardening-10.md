# SMT2 public release hardening — 10 processes

Scope: public SMT2 dashboard only. Existing private SMT2 application and Google Sheets remain unchanged. No new infrastructure or paid services.

1. Verify previous Pages deployment succeeded before change.
2. Reject invalid calendar dates (including rollover dates).
3. Reject approval timestamps later than the current UTC date.
4. Require exact, allowlisted snapshot fields.
5. Bound aggregate counts to safe nonnegative integers.
6. Reject small nonzero breakdown cells (under 5). **This is only a minimum guard**, not a substitute for disclosure review or suppression of identifying combinations.
7. Reject control characters, HTML delimiters and padded group/status labels.
8. Limit fetched snapshot payload to 16 KiB.
9. Improve keyboard navigation, mobile spacing and reduced-motion behavior.
10. Run snapshot publication gate in CI, alongside regression tests.

## Publication procedure

The owner must review the exact JSON, verify sums, classify every field as releasable, inspect complementary disclosure across groups/time periods, and approve the PR. No snapshot is currently published. GitHub repository history is public; never commit private data even temporarily.

The CI script `node scripts/check-smt2-public.mjs` rejects malformed, unapproved or unsafe snapshots. A missing snapshot is valid and preserves the unavailable-data message.

## Not yet completed

- Actual authenticated CRUD integration for officers.
- Verification of Apps Script permissions and safe identity handling on the live deployment.
- Automated export of approved aggregates from the real spreadsheet.
- Mobile and desktop interactive browser acceptance tests.

Do not present the public static page as an authenticated security boundary. Restrict sensitive data on the backend; public static resources remain accessible to anyone with the URL.
