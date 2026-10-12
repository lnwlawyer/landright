# SMT2 integration and backend migration

## Deployment
- LandRight remains the root GitHub Pages app.
- SMT2 is copied into `smt2/index.html` and is linked from the primary navigation.
- The original `lnwlawyer/smt2` repository is not changed.
- The original LandRight published Google Sheets CSV sources are not changed.
- SMT2's `google.script.run` calls require Apps Script HTML Service and **cannot** execute on GitHub Pages. The module displays a backend-unavailable state and disables add/save controls in that case.

## Backend contract to implement before enabling edits
SMT2 currently invokes these Apps Script functions:
- `getSheetNames()`
- `getUniqueColumnValues(sheetName, columnName)`
- `getOrgChartData()`
- `getCombinedDashboardData()`
- `getServerData(...)`
- `updateRecord({sheetName,rowIndex,newValues})`
- `addRecord({sheetName,rowData})`

A GitHub Pages migration needs a **real HTTPS API** with authenticated access, explicit per-user authorization for every write, server-side validation of sheet/column/row parameters, and anti-CSRF or equivalent request protection. A public Apps Script Web App configured to execute as its owner and accept arbitrary writes must **not** be used.

Before enabling production writes:
1. Identify the actual Apps Script project, spreadsheet IDs, sharing policy and existing authorization rules (none are included in the SMT2 repository).
2. Decide whether to keep Apps Script HTML Service as a protected editor or implement a separate authenticated API; published CSV can serve **public read-only** datasets only.
3. Confirm which sheets and fields may be exposed publicly; do not publish personnel or case data without authorization.
4. Test authorization failures, concurrent edits, row identity, data integrity, and rollback against a test spreadsheet.
5. Enable write actions only after end-to-end validation.

This integration adds no paid infrastructure and does not access or mutate production data.
