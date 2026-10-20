# LandRight dedicated Firebase bootstrap

**Confirmed by owner:** Firebase project ID `landright-admin`; Google Authentication and Firestore Database enabled. This repository does not have permission to change that project remotely.

## Register the LandRight web app
1. Open https://console.firebase.google.com/project/landright-admin/settings/general and select **Add app → Web** (if not already registered).
2. Copy the **public** Firebase web configuration (apiKey, authDomain, projectId, appId) and note the web OAuth client ID. These values are identifiers, **not** Admin SDK credentials.
3. In Authentication → Settings → Authorized domains, add `lnwlawyer.github.io` only if the Google sign-in flow needs it and the Firebase Console permits it. Review authorized OAuth redirect URIs separately if required.
4. Keep Google Sheets OAuth `spreadsheets.readonly` flow separate: it does not provide the Google **ID token** required by the privileged backend.

## Firestore security rules
`firestore.rules` is deny-by-default for **all** browser reads/writes, including `landrightAdminRoles`, `landrightAdminAudit`, and `landrightAdminMetadata`. These rules are suitable for a new, otherwise empty project only. **Do not** deploy these rules into SMT2 or any other existing project.

Review these rules in Firebase Console before applying. The Admin SDK bypasses these rules; IAM, token validation, and transactional server authorization remain mandatory.

## Local-only verification
```sh
npm ci
npx firebase-tools emulators:exec --only firestore --project demo-landright-test --config firebase.json "node --test tests/admin-firestore-emulator.integration.test.mjs"
```
The test additionally requires `LANDRIGHT_FIRESTORE_EMULATOR_TEST=1`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, and `firebase-admin` installed locally. The CI workflow provides these dependencies and runs the real emulator tests.

## Production activation gates
1. Confirm project `landright-admin` is empty or inventory all existing Firestore data.
2. Obtain explicit owner approval before **deploying** rules, creating any role records, or modifying IAM.
3. Approve server hosting (Firebase Hosting static alone cannot execute privileged APIs); check if hosting requires Blaze and do not enable paid billing without approval.
4. Verify backend OAuth audience, secrets, allowed origins, rate limits, request limits, audit retention, and first-Admin bootstrap.
5. Complete user-facing Admin UI and end-to-end acceptance tests.

**Not yet deployed:** This commit only adds repository configuration and documentation. No Firebase service was changed.
