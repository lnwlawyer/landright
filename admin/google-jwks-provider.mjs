/**
 * Trusted Google signing-key provider for a server-side OIDC verifier.
 * Never accept JWKS endpoints, redirects, or keys from incoming requests.
 */
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const MAX_RESPONSE_BYTES = 65536;
const MAX_CACHE_SECONDS = 3600;
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_KEYS = 32;

function parseMaxAge(cacheControl) {
  const match = /(?:^|,)\s*max-age=(\d+)\s*(?:,|$)/i.exec(cacheControl || '');
  if (!match) return 0;
  const seconds = Number(match[1]);
  return Number.isSafeInteger(seconds) ? Math.min(seconds,MAX_CACHE_SECONDS) : 0;
}
function validJwks(jwks) {
  if (!jwks || typeof jwks !== 'object' || !Array.isArray(jwks.keys)
      || jwks.keys.length < 1 || jwks.keys.length > MAX_KEYS) throw Error('Invalid Google signing keys');
  const kids = new Set();
  for (const key of jwks.keys) {
    if (!key || key.kty !== 'RSA' || typeof key.kid !== 'string'
        || !/^[A-Za-z0-9_-]{1,128}$/.test(key.kid)
        || typeof key.n !== 'string' || !/^[A-Za-z0-9_-]{256,2048}$/.test(key.n)
        || typeof key.e !== 'string' || !/^[A-Za-z0-9_-]{2,12}$/.test(key.e)
        || (key.use && key.use !== 'sig') || (key.alg && key.alg !== 'RS256')
        || kids.has(key.kid)) throw Error('Invalid Google signing keys');
    kids.add(key.kid);
  }
  return {keys:jwks.keys.map(({kty,kid,n,e,use,alg})=>Object.freeze({kty,kid,n,e,use,alg}))};
}
/**
 * The supplied fetch implementation is trusted server infrastructure.
 * Fail closed on network errors; never use stale keys past their expiry.
 */
export function createGoogleJwksProvider({fetchImpl=globalThis.fetch,clock=()=>Date.now(),timeoutMs=DEFAULT_TIMEOUT_MS}={}) {
  if (typeof fetchImpl !== 'function' || typeof clock !== 'function'
      || !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 15000) throw Error('Invalid JWKS provider configuration');
  let cached=null,expiresAt=0,inFlight=null;
  return async function getGoogleJwks() {
    const now=clock();
    if (cached && now < expiresAt) return cached;
    if (inFlight) return inFlight;
    inFlight=(async()=>{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      try {
        const response=await fetchImpl(GOOGLE_JWKS_URL,{
          method:'GET',redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal,
          headers:{Accept:'application/json'}
        });
        if (!response || !response.ok || response.redirected || response.url && response.url !== GOOGLE_JWKS_URL) throw Error('Google signing keys unavailable');
        const type=response.headers?.get('content-type') || '';
        if (!/^application\/json(?:\s*;|\s*$)/i.test(type)) throw Error('Invalid signing key response');
        const sizeHeader=response.headers?.get('content-length');
        if (sizeHeader && (!/^\d+$/.test(sizeHeader) || Number(sizeHeader)>MAX_RESPONSE_BYTES)) throw Error('Signing keys too large');
        if (!response.body || typeof response.body.getReader !== 'function') throw Error('Invalid signing key response');
        const reader=response.body.getReader();
        const chunks=[];let total=0;
        try {
          while (true) {
            const {done,value}=await reader.read();
            if (done) break;
            total+=value.byteLength;
            if (total>MAX_RESPONSE_BYTES) throw Error('Signing keys too large');
            chunks.push(value);
          }
        } finally {reader.releaseLock();}
        const bytes=new Uint8Array(total);let offset=0;
        for (const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
        const parsed=validJwks(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
        const age=parseMaxAge(response.headers?.get('cache-control'));
        cached=parsed;
        expiresAt=clock()+age*1000;
        return cached;
      } finally {clearTimeout(timer);}
    })();
    try {return await inFlight;} finally {inFlight=null;}
  };
}
