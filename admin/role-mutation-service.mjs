import {authorizeAdminAction,validateRoleChange,buildAuditEvent} from './authorization-policy.mjs';

/**
 * Server-only, storage-neutral role mutation workflow.
 * The adapter MUST implement an atomic transaction: verify expectedVersion,
 * prevent removal of the last enabled Admin, persist the role change and audit
 * record together, or persist neither. Never trust roles from request JSON.
 */
export async function changeUserRole({
 actor,targetSubject,newRole,confirmation,expectedVersion,correlationId,
 roleStore,clock=()=>new Date().toISOString()
}) {
 if (!authorizeAdminAction(actor,'users.role.update')) return {ok:false,reason:'forbidden'};
 if (!roleStore || typeof roleStore.transactRoleChange!=='function') throw Error('Trusted transactional role store required');
 if (typeof targetSubject!=='string' || !/^[A-Za-z0-9:_-]{3,256}$/.test(targetSubject)
     || !Number.isSafeInteger(expectedVersion) || expectedVersion<0
     || typeof correlationId!=='string' || !/^[A-Za-z0-9_-]{8,128}$/.test(correlationId)) return {ok:false,reason:'invalid-request'};
 return roleStore.transactRoleChange(async tx=>{
   const actorRecord=await tx.getRole(actor.subject);
   if (!actorRecord || actorRecord.role!=='admin' || actorRecord.disabled!==false) return {ok:false,reason:'forbidden'};
   const target=await tx.getRole(targetSubject);
   const check=validateRoleChange({actor:actorRecord,target,newRole,confirmation,expectedVersion});
   if (!check.ok) return check;
   if (target.version!==expectedVersion) return {ok:false,reason:'version-conflict'};
   if (target.role==='admin' && newRole!=='admin' && await tx.countEnabledAdmins()<=1)
     return {ok:false,reason:'last-admin-protected'};
   const event=buildAuditEvent({actor:actorRecord,action:'users.role.update',targetId:targetSubject,
     outcome:'success',correlationId,now:clock()});
   await tx.updateRole(targetSubject,{role:newRole,version:expectedVersion+1});
   await tx.appendAudit(event);
   return {ok:true,subject:targetSubject,version:expectedVersion+1};
 });
}
