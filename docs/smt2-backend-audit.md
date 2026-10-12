# SMT2 Backend Review — supplied Apps Script Code.gs

Source: user-provided 654-line Apps Script excerpt, reviewed 2026-10-12. This repository does **not** contain the live Apps Script deployment, spreadsheet IDs, or credentials. Do not assume the GitHub Pages UI can call the original `google.script.run` methods.

## Verified function contract

| Function | Purpose | Data classification |
| --- | --- | --- |
| `doGet` | Serve Apps Script HTML template `index` | UI |
| `getGroupConfig` | Officer-to-group mapping from `Config` | internal |
| `getSheetNames` | Enumerate officer sheets, excluding two named groups, `Config`, `OrgChart` | internal |
| `getOrgChartData` | Read hierarchy from `OrgChart` | potentially personal |
| `getCombinedDashboardData` | Aggregate by group and officer; **also returns every underlying record** in `records` | potentially sensitive |
| `getProvinceData` | Aggregate province counts | aggregated |
| `getMapTopoJson` | Read `thailand-map.json` from Apps Script project | static |
| `getUniqueColumnValues` | List distinct values in a selected column | internal |
| `getServerData` | Search/filter/paginate 10 records per page | potentially sensitive |
| `updateRecord` | Replace a row by caller-provided sheet name and row number | WRITE |
| `addRecord` | Append a caller-provided row to a selected sheet | WRITE |

## Critical findings

1. `updateRecord` and `addRecord` do not themselves check identity, editor authorization, or a sheet allowlist. Their safety currently depends on deployment and spreadsheet access policy, which was not supplied.
2. `updateRecord` trusts `rowIndex` and `newValues.length` and can overwrite arbitrary columns/rows. The frontend sends a mutable physical row index rather than a stable record ID.
3. `getServerData` and `getUniqueColumnValues` accept arbitrary sheet names; `getSheetNames` exclusions do not protect these direct functions.
4. `getCombinedDashboardData` includes full records, not just aggregates. **Do not publish its raw response** in an anonymous GitHub Pages API.
5. `getGroupConfig` and `getOrgChartData` request `getRange(2, ..., getLastRow()-1, ...)` without handling header-only sheets.
6. `getServerData` calls `cell.toLowerCase()` on display strings, which is normally safe for `getDisplayValues`; however, filters assume the columns `จังหวัด` and `สถานะปัจจุบัน` exist.
7. `getMapTopoJson` requires a separate Apps Script project file `thailand-map.json`; the supplied source alone cannot verify it.
8. `@OnlyCurrentDoc` limits OAuth spreadsheet scope but **does not authorize end users or make an HTTP write API secure**.

## Migration decisions

- Phase A: keep the original Apps Script and Sheets untouched; retain SMT2 as a separate route inside LandRight.
- Phase B: establish actual identity, permitted audience, sheet-level access, and classification of fields. **Never** expose private case/personnel records as public CSV or JSON.
- Phase C: implement a protected transport. GitHub Pages cannot invoke `google.script.run`; a public Apps Script `doGet/doPost` execute-as-owner endpoint is not an acceptable unrestricted write proxy.
- Phase D: adapt client calls to the approved API, add loading/error states and stale-write conflict handling, and test against a disposable spreadsheet.
- Phase E: deploy only after authorization tests, concurrent edit tests, and rollback are verified.

## Write guard reference

`smt2/backend/write-guards.reference.gs` is a non-deployed, fail-closed example for use **inside an authenticated Apps Script environment**. It requires an explicit `SMT2_EDITOR_EMAILS` Script Property, checks sheet names, validates row/column counts, uses document locking, and requires expected original values for updates. The current SMT2 client does **not** yet supply `expectedValues`; integration is intentionally incomplete.

This reference is not a standalone HTTPS API and does not solve Apps Script CORS or account identity issues. It must not be deployed as an anonymous public web app.

## Required missing inputs

- Actual Apps Script project and deployment access (or exported `appsscript.json` and related server files)
- Spreadsheet identity and sharing/permission model (no confidential data or credentials in GitHub)
- Intended readers and editors, and whether the Google Workspace domain is controlled
- Classification of the records and permitted public aggregate metrics

No production spreadsheet has been read or written during this review.
