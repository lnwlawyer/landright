# LandRight Settings — Admin security implementation plan

## Current state
LandRight is hosted on GitHub Pages (static public frontend). SMT2 uses Google OAuth with `spreadsheets.readonly` and Google Sheets access control. This is **not** an Admin role provider. Browser state, displayed email, and hidden controls must not grant authorization.

## Required before enabling privileged settings
1. Choose an authenticated backend (existing approved service or new service after review) capable of validating Google identity tokens on the server, including issuer, audience, expiry, and user identity.
2. Store Admin allowlists/roles in a server-controlled store. Only an existing authorized administrator may change roles. Require reauthentication and explicit confirmation for sensitive changes.
3. Implement backend authorization on **every** write endpoint. Reject unauthorized requests even when called outside the UI. Use least-privilege Google scopes; do not replace the existing read-only flow.
4. Record server-side audit events for administrative changes: actor, action, target, timestamp, outcome, and correlation ID. Exclude OAuth tokens, sensitive record contents, and unnecessary personal information.
5. Use a staged environment and reversible migrations; verify existing Google Sheets and SMT2 data are unchanged. Require automated permission tests (anonymous, User, Admin, expired token, revoked role, concurrent changes) and manual acceptance before enabling.
6. Confirm the intended Admin identity provider, approved storage, and cost/security constraints with the project owner before any production write capability.

## Safe current UI
The Settings page shows read-only readiness and explicit disabled capabilities. It does not implement user management, role assignment, Google Sheets writes, or server audit logs. These must not be simulated with localStorage or browser-only permissions.

## Implementation increment: policy foundation
`admin/authorization-policy.mjs` contains **server-only policy primitives** for deny-by-default action authorization, safe role-change validation, and minimal audit event construction. `tests/admin-authorization.test.mjs` covers anonymous, user, admin, disabled accounts, self-demotion, version checks and audit metadata. No backend is deployed or connected.

**Critical trust boundary:** `normalizeServerPrincipal` only validates the shape of a principal; it does NOT authenticate anyone. Never pass client-provided identity/role values directly. The future backend must verify Google identity tokens (signature, issuer, audience, expiry), resolve the immutable subject to a role in server-controlled storage, enforce permissions on each request, atomically compare-and-swap versions, and persist audit events before returning success.

Do not enable the privileged UI or ship credentials to GitHub Pages until backend choice, initial Admin bootstrap, storage, and operating costs are approved.
