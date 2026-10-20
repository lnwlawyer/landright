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
