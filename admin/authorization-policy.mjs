/**
 * Pure authorization policy for a future server-side Admin API.
 * NEVER import this into the public UI as proof of authorization.
 * A trusted server must verify the identity token and load roles from
 * server-controlled storage before passing a principal to this function.
 */
export const ADMIN_ACTIONS = Object.freeze([
  'users.read','users.role.update','settings.read','settings.update','audit.read'
]);
const ACTIONS = new Set(ADMIN_ACTIONS);
const ROLES = new Set(['user','admin']);
export function normalizeServerPrincipal(principal) {
  if (!principal || typeof principal !== 'object' || Array.isArray(principal)) return null;
  const {subject,role,disabled} = principal;
  if (typeof subject !== 'string' || !/^[A-Za-z0-9:_-]{3,256}$/.test(subject)) return null;
  if (!ROLES.has(role) || disabled !== false) return null;
  return Object.freeze({subject,role,disabled:false});
}
export function authorizeAdminAction(principal,action) {
  const user = normalizeServerPrincipal(principal);
  return Boolean(user && user.role === 'admin' && ACTIONS.has(action));
}
/**
 * Server-side role mutation guard. The caller must load current state,
 * apply optimistic concurrency controls, and persist the mutation atomically.
 */
export function validateRoleChange({actor,target,newRole,confirmation,expectedVersion}) {
  if (!authorizeAdminAction(actor,'users.role.update')) return {ok:false,reason:'forbidden'};
  const subject = normalizeServerPrincipal(target);
  if (!subject || !ROLES.has(newRole)) return {ok:false,reason:'invalid-target'};
  if (subject.subject === actor.subject) return {ok:false,reason:'self-role-change-denied'};
  if (confirmation !== 'CONFIRM' || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return {ok:false,reason:'confirmation-or-version-required'};
  if (subject.role === newRole) return {ok:false,reason:'no-change'};
  return {ok:true,subject:subject.subject,newRole,expectedVersion};
}
/** Generate a minimal audit record only on a trusted server. */
export function buildAuditEvent({actor,action,targetId,outcome,correlationId,now}) {
  const user = normalizeServerPrincipal(actor);
  if (!user || !ACTIONS.has(action) || !['success','denied','error'].includes(outcome)
    || typeof targetId !== 'string' || !/^[A-Za-z0-9:_-]{3,256}$/.test(targetId)
    || typeof correlationId !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(correlationId)
    || typeof now !== 'string' || Number.isNaN(Date.parse(now))) throw new Error('Invalid audit metadata');
  return Object.freeze({actorId:user.subject,action,targetId,outcome,correlationId,timestamp:now});
}
