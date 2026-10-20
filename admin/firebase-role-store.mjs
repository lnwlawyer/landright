/**
 * Trusted server-side Firestore role reader.
 * No browser writes, no email-derived grants, and no fallback admin accounts.
 */
export function createFirebaseRoleReader({firestore,collection='landrightAdminRoles'}) {
  if (!firestore || typeof firestore.collection!=='function') throw new TypeError('Firestore Admin SDK required');
  if (collection!=='landrightAdminRoles') throw new TypeError('Unexpected role collection');
  return async function getAdminRole(uid) {
    if(typeof uid!=='string'||!uid||uid.length>128||uid.includes('/')) throw new TypeError('Invalid Firebase UID');
    const snapshot=await firestore.collection(collection).doc(uid).get();
    if(!snapshot.exists) return null;
    const value=snapshot.data();
    if(!value || value.role!=='admin'||value.is_active!==true) return null;
    return {role:'admin',is_active:true};
  };
}
