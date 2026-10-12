# SMT2: 10 workstreams — delivery and security gates

The public website is **not** a private editor. The existing SMT2 Apps Script Web App currently executes as its owner and is accessible to everyone; it must not be used as an anonymous edit API. The original production spreadsheet and deployment remain unchanged.

| # | Workstream | Status / acceptance gate |
|---|---|---|
| 1 | Confirm public/private audience | Completed: public aggregate summary only; individual records restricted |
| 2 | Preserve LandRight existing routes | Completed: original pages unchanged |
| 3 | Preserve SMT2 legacy application | Completed: original module remains at `smt2/index.html`; no production changes |
| 4 | Build public-only dashboard | Completed: `smt2/public.html` |
| 5 | Define aggregate-only data contract | Completed: `smt2/public-dashboard.mjs` strict schema |
| 6 | Add fail-closed publication state | Completed: missing/invalid snapshot displays no invented statistics |
| 7 | Guard against data leakage and injection | Completed: exact allowed fields, DOM `textContent`, local-only JSON path |
| 8 | Add regression tests | Completed: tests for accepted and rejected snapshots |
| 9 | Establish controlled publication workflow | Prepared: reviewed snapshot format and release checklist below; no data published |
| 10 | Prepare authenticated internal write migration | Prepared: `docs/smt2-backend-audit.md` and write guard reference; requires real identity/permission decisions and test data before production |

## Publishing an approved summary (manual and free)

1. Data owner reviews and **explicitly approves** aggregate metrics for public release; check that small groups and combinations cannot reveal individual cases or staff.
2. Prepare `smt2/approved-summary.json` in a PR with this **exact** schema:
```json
{
  "schemaVersion": 1,
  "approvedForPublic": true,
  "asOf": "2026-10-01",
  "approvedOn": "2026-10-12",
  "summary": { "totalRecords": 100, "completedRecords": 60, "pendingRecords": 40 },
  "byStatus": [{ "label": "เสร็จแล้ว", "count": 60 }, { "label": "ระหว่างดำเนินการ", "count": 40 }],
  "byGroup": [{ "label": "กลุ่ม ก", "count": 100 }]
}
```
The example numbers are **fictional** and must never be committed as real metrics.
3. Review diff, confirm every field is approved and all totals reconcile, then pass CI before merge.
4. Publish only the reviewed aggregate JSON through GitHub Pages. The UI will refuse invalid or unapproved JSON and show the unavailable state.
5. To withdraw published data, remove the JSON file, redeploy and consider caching/CDN exposure; publishing to a public repository is not reversible in the sense of removing Git history. Never commit personal or case data.

## Backend migration remaining

- Determine actual staff identity provider and eligible editors. No credentials or private spreadsheet data should be committed.
- Review Apps Script `Execute as: me` / `Who has access: anyone` settings and prevent unauthorized writes **in the original application** after assessing existing users.
- Implement authenticated server-side access, least-privilege reads, sheet/row allowlists, stable IDs, optimistic concurrency, audit logs, and tests against a disposable spreadsheet.
- Do not make `doPost` an unrestricted write endpoint or place any shared secret in browser JS.
- Keep internal CRUD disabled on GitHub Pages until this work is finished.

## Deployment verification

Check GitHub Actions `LandRight checks` and `pages build and deployment` for the merge commit. Verify public navigation, absence of personal data, and the empty state on mobile and desktop. No claim of live-browser verification is made solely from CI.
