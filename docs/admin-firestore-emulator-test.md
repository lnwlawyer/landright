# LandRight Admin role store — local Firestore Emulator integration

This is an **opt-in integration test** for the server-only adapter. The default `npm test` suite skips it; it does not contact Firebase Production. It never uses real service account credentials.

## Prerequisites
- Node.js and Java available for the Firebase Emulator Suite
- Firebase CLI available locally (`npx firebase-tools`)
- `firebase-admin` installed **in a disposable local test checkout**, not committed as a production dependency

## Run (PowerShell on Windows)

In a disposable clone of the LandRight repository:

```powershell
npm ci
npm install --no-save --package-lock=false firebase-admin
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:LANDRIGHT_FIRESTORE_EMULATOR_TEST = "1"
npx firebase-tools emulators:exec --only firestore --project demo-landright-test "node --test tests/admin-firestore-emulator.integration.test.mjs"
Remove-Item Env:LANDRIGHT_FIRESTORE_EMULATOR_TEST
Remove-Item Env:FIRESTORE_EMULATOR_HOST
```

The Firebase CLI may ask for setup or downloads on the first run. If needed, create a **local, untracked** `firebase.json` containing `{"emulators":{"firestore":{"host":"127.0.0.1","port":8080}}}` before running. Never select or configure a production Firebase project for this test.

The test uses an isolated random emulator project ID, bootstraps a synthetic Admin and two synthetic Users, promotes both concurrently, validates serialized Admin metadata counts and audit events, and tests stale-version denial and duplicate-audit rollback. It does **not** test or deploy an HTTP API, real authentication, browser access controls, or Firebase security rules.

**Production release remains blocked** pending approved backend hosting, Firestore project selection, server credentials, audited bootstrap procedure, access-control rules, emulator validation, and explicit deployment authorization. Do not expose Admin SDK credentials in GitHub Pages.
