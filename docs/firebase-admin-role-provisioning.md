# Firebase Admin role provisioning: security checklist

The backend must look up a role document at `landrightAdminRoles/{firebaseUid}` using the trusted Firebase Admin SDK. Expected fields: `role: "admin"`, `is_active: true`. All other values are denied. No browser-side writes or automatic admin enrollment are provided.

1. Confirm the Firebase project is exactly `landright-admin` before any privileged action.
2. Obtain the intended Firebase Authentication **UID** from the Firebase Console; do not use Google OAuth subject IDs or an email as the document ID.
3. Have an authorized operator independently verify the UID and create the role document using the Firebase Console or a separately audited administrative procedure.
4. Keep Firestore client rules deny-by-default. Browser clients must not be able to modify role documents.
5. Test valid admin, normal user, revoked token, deleted role, inactive role and wrong Firebase project against the deployed HTTPS backend.
6. Record approvals and role revocation procedures outside the browser. Never place service account keys in the repository.

This change adds a reader and tests only. It does not provision an administrator, modify Firestore, deploy Firebase rules, or activate the public Admin UI.
