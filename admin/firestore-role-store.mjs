/**
 * Server-only Firestore Admin SDK adapter. Pass a trusted Firestore instance
 * from the server (never the client SDK). No credentials or deployments here.
 *
 * Schema (isolated from existing application collections):
 * landrightAdminRoles/{google-subject-encoded}:
 *   {subject, role, disabled, version}
 * landrightAdminAudit/{correlationId}:
 *   {actorId, action, targetId, outcome, correlationId, timestamp}
 * landrightAdminMetadata/roles:
 *   {enabledAdminCount, version}
 *
 * All role mutations read/write the SAME metadata document, forcing
 * transaction conflicts and retries for concurrent last-admin changes.
 */
const SUBJECT_PATTERN=/^google:[0-9]{3,64}$/;
const CORRELATION_PATTERN=/^[A-Za-z0-9_-]{8,128}$/;
const ROLE_COLLECTION='landrightAdminRoles';
const AUDIT_COLLECTION='landrightAdminAudit';
const META_COLLECTION='landrightAdminMetadata';

export function roleDocumentId(subject) {
 if (typeof subject!=='string' || !SUBJECT_PATTERN.test(subject)) throw Error('Invalid Google subject');
 return subject.slice('google:'.length);
}
export function createFirestoreAdminRoleStore(db) {
 if (!db || typeof db.collection!=='function' || typeof db.runTransaction!=='function')
   throw Error('Trusted Firestore Admin SDK instance required');
 const roles=db.collection(ROLE_COLLECTION);
 const audit=db.collection(AUDIT_COLLECTION);
 const metadata=db.collection(META_COLLECTION).doc('roles');
 return Object.freeze({
   async getBySubject(subject) {
     const snapshot=await roles.doc(roleDocumentId(subject)).get();
     if (!snapshot.exists) return null;
     const value=snapshot.data();
     return value?.subject===subject ? {...value} : null;
   },
   async transactRoleChange(work) {
     if (typeof work!=='function') throw Error('Transaction callback required');
     return db.runTransaction(async transaction=>{
       // Firestore requires all reads before any writes. Stage writes until
       // the callback returns, then flush only on successful authorization.
       const staged=[];
       const roleCache=new Map();
       let metaRead=false,meta;
       const tx={
         async getRole(subject) {
           if (roleCache.has(subject)) return roleCache.get(subject);
           const snapshot=await transaction.get(roles.doc(roleDocumentId(subject)));
           const value=snapshot.exists ? snapshot.data() : null;
           const record=value?.subject===subject ? {...value} : null;
           roleCache.set(subject,record);
           return record;
         },
         async countEnabledAdmins() {
           if (!metaRead) {
             const snapshot=await transaction.get(metadata);
             if (!snapshot.exists) throw Error('Admin metadata not initialized');
             meta=snapshot.data();
             if (!Number.isSafeInteger(meta?.enabledAdminCount) || meta.enabledAdminCount<1
                 || !Number.isSafeInteger(meta.version) || meta.version<0)
               throw Error('Invalid Admin metadata');
             metaRead=true;
           }
           return meta.enabledAdminCount;
         },
         async updateRole(subject,changes) {
           if (!roleCache.has(subject) || !roleCache.get(subject)) throw Error('Role not read');
           if (!changes || !['user','admin'].includes(changes.role)
               || !Number.isSafeInteger(changes.version)) throw Error('Invalid role update');
           // Metadata is a global concurrency guard for all role changes.
           if (!metaRead) await tx.countEnabledAdmins();
           const old=roleCache.get(subject);
           if (changes.version!==old.version+1) throw Error('Invalid version increment');
           const delta=Number(changes.role==='admin')-Number(old.role==='admin');
           if (meta.enabledAdminCount+delta<1) throw Error('Last Admin protected');
           const next={...old,...changes};
           roleCache.set(subject,next);
           meta={...meta,enabledAdminCount:meta.enabledAdminCount+delta,version:meta.version+1};
           staged.push(()=>transaction.update(roles.doc(roleDocumentId(subject)),changes));
           staged.push(()=>transaction.update(metadata,{enabledAdminCount:meta.enabledAdminCount,version:meta.version}));
         },
         async appendAudit(event) {
           if (!event || typeof event!=='object' || !CORRELATION_PATTERN.test(event.correlationId)
               || !SUBJECT_PATTERN.test(event.actorId) || !SUBJECT_PATTERN.test(event.targetId)
               || event.action!=='users.role.update' || event.outcome!=='success'
               || typeof event.timestamp!=='string') throw Error('Invalid audit event');
           // Create, not set: duplicate correlation IDs must fail atomically.
           staged.push(()=>transaction.create(audit.doc(event.correlationId),event));
         }
       };
       const result=await work(tx);
       if (result?.ok===true) {
         if (!staged.length || !staged.some(Boolean)) throw Error('Missing transaction writes');
         for(const write of staged) write();
       }
       return result;
     });
   }
 });
}
