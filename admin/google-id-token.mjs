import {createPublicKey, verify as verifySignature} from 'node:crypto';

const ISSUERS = new Set(['https://accounts.google.com','accounts.google.com']);
const MAX_TOKEN_LENGTH = 16384;
function decodePart(part) {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('Invalid token encoding');
  const decoded = Buffer.from(part,'base64url');
  if (decoded.toString('base64url') !== part) throw new Error('Non-canonical token encoding');
  return JSON.parse(decoded.toString('utf8'));
}
const invalid = () => new Error('Invalid Google ID token');

/**
 * Verify a Google OIDC ID token, never an OAuth access token.
 * `getJwks` must return Google's trusted HTTPS JWKS, with bounded cache
 * lifetime and fail-closed behavior on retrieval failure. Do not pass keys
 * supplied by the request or its JWT header.
 */
export async function verifyGoogleIdToken(token,{clientId,getJwks,now=Date.now()}={}) {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH || token.length < 20
    || typeof clientId !== 'string' || !/^[0-9]+-[A-Za-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId)
    || typeof getJwks !== 'function' || !Number.isFinite(now)) throw invalid();
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts.every(Boolean)) throw invalid();
    const header=decodePart(parts[0]), payload=decodePart(parts[1]);
    if (!header || header.alg !== 'RS256' || header.typ && header.typ !== 'JWT'
      || typeof header.kid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(header.kid)
      || header.jku || header.jwk || header.x5u || header.crit) throw invalid();
    const nowSeconds=Math.floor(now/1000);
    if (!payload || !ISSUERS.has(payload.iss) || payload.aud !== clientId
      || typeof payload.sub !== 'string' || !/^[0-9]{3,64}$/.test(payload.sub)
      || !Number.isSafeInteger(payload.exp) || payload.exp <= nowSeconds
      || !Number.isSafeInteger(payload.iat) || payload.iat > nowSeconds + 60
      || payload.iat > payload.exp || payload.exp - payload.iat > 86400
      || (payload.nbf !== undefined && (!Number.isSafeInteger(payload.nbf) || payload.nbf > nowSeconds + 60))
      || (payload.azp !== undefined && payload.azp !== clientId)
    ) throw invalid();
    const jwks=await getJwks();
    if (!jwks || !Array.isArray(jwks.keys)) throw invalid();
    const candidates=jwks.keys.filter(k=>k && k.kid===header.kid && k.kty==='RSA'
      && (!k.use || k.use==='sig') && (!k.alg || k.alg==='RS256')
      && typeof k.n==='string' && typeof k.e==='string');
    if (candidates.length !== 1) throw invalid();
    const key=createPublicKey({key:{kty:'RSA',n:candidates[0].n,e:candidates[0].e},format:'jwk'});
    if (!verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),key,Buffer.from(parts[2],'base64url'))) throw invalid();
    return Object.freeze({subject:'google:'+payload.sub,issuer:payload.iss,audience:payload.aud});
  } catch { throw invalid(); }
}
