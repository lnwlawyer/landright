import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeAdminAction,validateRoleChange,buildAuditEvent} from '../admin/authorization-policy.mjs';

const admin={subject:'google:admin123',role:'admin',disabled:false};
const user={subject:'google:user123',role:'user',disabled:false};
test('deny-by-default for anonymous, users, disabled accounts, forged role values and unknown actions',()=>{
 for(const principal of [null,undefined,{},user,{...admin,disabled:true},{...admin,role:'superadmin'},{...admin,subject:'bad email'}]) {
  assert.equal(authorizeAdminAction(principal,'users.role.update'),false);
 }
 assert.equal(authorizeAdminAction(admin,'users.role.update'),true);
 assert.equal(authorizeAdminAction(admin,'unknown.action'),false);
});
test('role change requires admin, target, confirmation and version; forbids self-demotion',()=>{
 const request={actor:admin,target:user,newRole:'admin',confirmation:'CONFIRM',expectedVersion:3};
 assert.deepEqual(validateRoleChange(request),{ok:true,subject:user.subject,newRole:'admin',expectedVersion:3});
 for(const changes of [
  {actor:user},{target:admin},{confirmation:'yes'},{expectedVersion:-1},{expectedVersion:1.5},{newRole:'owner'},{target:{...user,disabled:true}},{newRole:'user'}
 ]) assert.equal(validateRoleChange({...request,...changes}).ok,false);
});
test('audit events include only safe metadata, no token or record payload',()=>{
 const event=buildAuditEvent({actor:admin,action:'users.role.update',targetId:user.subject,outcome:'success',correlationId:'request_12345',now:'2026-10-20T00:00:00Z',accessToken:'secret'});
 assert.deepEqual(Object.keys(event).sort(),['action','actorId','correlationId','outcome','targetId','timestamp'].sort());
 assert.equal(JSON.stringify(event).includes('secret'),false);
 assert.throws(()=>buildAuditEvent({actor:admin,action:'unknown',targetId:user.subject,outcome:'success',correlationId:'request_12345',now:'2026-10-20T00:00:00Z'}));
});
