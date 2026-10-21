/**
 * Server-only Firebase Authentication boundary for LandRight Admin.
 * Pass firebase-admin/auth's Auth instance; never import this module in browser code.
 * Authorization is based on server-owned role records, not client claims.
 */
export async function authorizeFirebaseAdmin({authorization, firebaseAuth, getAdminRole, checkRevoked = true}) {
  if (!firebaseAuth || typeof firebaseAuth.verifyIdToken !== 'function' || typeof getAdminRole !== 'function') {
    throw new TypeError('Trusted Firebase Auth and role lookup are required');
  }
  const match = /^Bearer ([A-Za-z0-9_.-]{20,16384})$/.exec(authorization || '');
  if (!match) return {ok:false, status:401, reason:'missing_or_invalid_bearer'};
  let claims;
  try { claims = await firebaseAuth.verifyIdToken(match[1], checkRevoked); }
  catch (error) { return error?.code==='FIREBASE_AUTH_UPSTREAM_UNAVAILABLE'\n    ? {ok:false,status:503,reason:'firebase_auth_upstream_unavailable'}\n    : {ok:false,status:401,reason:'invalid_or_revoked_firebase_token'}; }
  if (!claims || typeof claims.uid !== 'string' || !claims.uid || claims.aud !== 'landright-admin' ||
      claims.iss !== 'https://securetoken.google.com/landright-admin' ||
      claims.firebase?.sign_in_provider === 'anonymous') {
    return {ok:false,status:401,reason:'invalid_firebase_claims'};
  }
  let role;
  try { role = await getAdminRole(claims.uid); }
  catch { return {ok:false,status:503,reason:'role_lookup_unavailable'}; }
  if (!role || role.is_active !== true || role.role !== 'admin') {
    return {ok:false,status:403,reason:'admin_permission_required'};
  }
  return {ok:true,status:200,uid:claims.uid};
}
