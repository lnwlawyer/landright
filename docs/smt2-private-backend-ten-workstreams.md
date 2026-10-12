# SMT2 — private backend security migration gate (10 workstreams)

**Status: design/reference code only. Not deployed.** Public LandRight/SMT2 remains aggregate-only. This is the next stage after PR #34.

## Ten workstreams

1. **Baseline verification:** Confirm PR #34 main CI and GitHub Pages succeeded; keep public routes stable.
2. **Identity:** Require a nonempty verified `Session.getActiveUser().getEmail()` on an appropriately restricted Apps Script deployment. Blank identity must fail closed.
3. **Roles:** Maintain independent reader/editor allowlists in Script Properties; never store them or credentials in GitHub.
4. **Private sheet boundaries:** Deny Config, OrgChart, and excluded group sheets, even when supplied directly as function arguments.
5. **Request validation:** Require bounded integer pagination (page 1–10000; limit 1–50) and known sheets.
6. **Column projection:** Expose only explicitly configured `SMT2_READER_COLUMNS`, not whole rows or every record from `getCombinedDashboardData`.
7. **Write hardening:** Review the earlier `write-guards.reference.gs` for expected-row conflict checking, editor authorization, allowed sheets and document locks.
8. **Legacy entry-point lockdown:** Identify and replace/restrict **all** callable legacy functions, including `getServerData`, `getUniqueColumnValues`, `getCombinedDashboardData`, `addRecord` and `updateRecord`. **New wrappers alone do not secure old functions.**
9. **Regression safety:** Add automated source-level guardrails, plus plan negative identity/role/sheet/field/concurrency tests against a disposable spreadsheet before any production release.
10. **Deployment and rollback:** Require a restricted deployment audience, approved test accounts, audit of effective execute-as identity, rollback to a previously safe version, and explicit acceptance of the test evidence before enabling staff access.

## Current production exposure requiring owner action

The user-supplied Apps Script deployment screenshot showed **Execute as Me** and **Who has access: Anyone**. The supplied legacy `addRecord` and `updateRecord` implementations do not check caller authorization. This is a potentially serious exposure and **cannot be repaired by a GitHub Pages merge**. The owner should promptly restrict or disable the old deployment until a secured replacement is verified. Verify all live deployments, not only the current editor version.

## Safe migration order

1. Inventory active Apps Script deployments and spreadsheet access; record rollback details privately.
2. Restrict the deployment audience first. Do not add a public execute-as-owner JSON write endpoint.
3. Add verified identity and authorization to *every* legacy public-callable function, or remove the old entry points from the deployment.
4. Set exact sheet and field permissions. Avoid including names, case identifiers, personal contact data, and other restricted fields in a public build.
5. Use a **disposable test spreadsheet** and separate Apps Script test deployment to verify negative cases (anonymous, non-reader, reader-write, invalid sheet, invalid column, stale edit, concurrent edit).
6. Confirm `Session.getActiveUser().getEmail()` reliably identifies the caller in the chosen account/deployment configuration; otherwise do not proceed.
7. Review private UI transport: `google.script.run` requires an Apps Script-hosted HTML page, not GitHub Pages. Keep a separate restricted staff app unless a securely authenticated API architecture is approved.
8. Deploy a secured version only after explicit review of tests and rollback plan.

## Acceptance criteria not yet met

- Actual server-side source patch installed in the live Apps Script project
- Confirmed authorized user identity for the selected deployment mode
- Real staff login and end-to-end read/edit tests
- Data field classification and an approved column allowlist
- Evidence that legacy unguarded entry points are unreachable

**Do not claim staff CRUD is live or secure until all criteria are verified.**
