# SMT2 — Ten public publication safety processes

This release is **not** a publication of actual statistics or a staff login implementation. It adds the next ten safety checks to the existing integrated LandRight SMT2 section.

1. Confirm preceding LandRight CI and GitHub Pages deployment succeeded.
2. Reject future `asOf` dates.
3. Reject future `approvedOn` dates.
4. Validate reconciled totals and category counts.
5. Reject duplicate labels, including case-only duplicates.
6. Require category breakdowns when total records are nonzero.
7. Block positive breakdown cells smaller than five.
8. Scan approved JSON for likely case identifiers, personal contact data, names and internal sheet references.
9. Enforce a 16 KiB limit and valid JSON before publication.
10. Run the new publication preflight on every pull request and push to main, with regression tests.

## Publication checklist for a data owner

- Confirm that each statistic is genuinely authorized for public disclosure and that no individual can be identified by combining cells, previous publications or other public information.
- Obtain human approval of the exact file and its reporting date. **Machine validation does not grant approval.**
- Publish only `smt2/approved-summary.json` after review. No production data is copied automatically.
- Check `npm test`, `node scripts/check-smt2-public.mjs`, and `node scripts/smt2-public-preflight.mjs` before merging.
- Verify the LandRight SMT2 menu and the deep link `index.html?view=smt2` after deployment.
- Keep all case records and write operations on an authenticated backend, never in GitHub Pages assets.
- To withdraw a release, remove the file and redeploy; previously committed public Git history and external caches cannot be guaranteed erased.

## Remaining dependencies

Staff-only CRUD still requires trustworthy identity, least-privilege server authorization and safe Apps Script deployment settings. Actual approved aggregate numbers have not been supplied. Do not insert illustrative numbers into the live dashboard.
