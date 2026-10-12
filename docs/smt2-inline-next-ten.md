# SMT2 integrated dashboard — next 10 processes

This change enhances the **native SMT2 section** inside LandRight's existing sidebar and header. It does not enable staff CRUD or expose case-level data.

1. Verify prior PR #32 GitHub Actions and Pages deployment passed.
2. Extract SMT2 inline logic to a reusable ES module (`smt2/inline-dashboard.mjs`).
3. Preserve LandRight's original navigation and existing menu content.
4. Support a direct link to the same-page SMT2 section via `index.html?view=smt2`.
5. Add an explicit **ตรวจสอบข้อมูลล่าสุด** refresh control.
6. Prevent concurrent refreshes and show a loading state.
7. Abort stalled snapshot requests after 10 seconds and re-enable the refresh button.
8. Enforce same-origin aggregate-only JSON, 16 KiB size cap, no credentials, and no redirect.
9. Render aggregate statistics with `textContent`, show approved dates, and clear stale statistics on errors.
10. Add automated regression tests for navigation, validation, and forbidden private-backend calls.

## Security boundary

A public GitHub Pages site is not a staff-authenticated application. The private Apps Script deployment still requires separate server-side access control and verification. Never use client-side role checks as authorization. No spreadsheet or Apps Script deployment is changed by this PR.

## Release verification

Run `npm test`, `node scripts/check-smt2-public.mjs`, and confirm both GitHub Actions workflows on main. Open `index.html?view=smt2`, test refresh on mobile and desktop, and verify the empty state remains when no approved JSON exists.
