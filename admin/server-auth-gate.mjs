import {authorizeAdminAction} from './authorization-policy.mjs';
import {verifyGoogleIdToken} from './google-id-token.mjs';

/**
 * Dependency-injected server authorization gate.
 * roleStore.getBySubject MUST read from server-owned storage, never a request body.
 * This module has no public HTTP routes, secrets, or production integration.
 */
export async function authorizeGoogleAdminRequest({idToken,action,clientId,getJwks,roleStore,now}) {
  if (!roleStore || typeof roleStore.getBySubject !== 'function') throw new Error('Server role store not configured');
  const identity=await verifyGoogleIdToken(idToken,{clientId,getJwks,now});
  const record=await roleStore.getBySubject(identity.subject);
  if (!record || record.subject !== identity.subject || record.disabled !== false
    || !['user','admin'].includes(record.role)) return {allowed:false,reason:'forbidden'};
  const principal={subject:identity.subject,role:record.role,disabled:false};
  return {allowed:authorizeAdminAction(principal,action),reason:authorizeAdminAction(principal,action)?'ok':'forbidden',principal};
}
