import {LANDRIGHT_FIREBASE_CONFIG} from '../firebase-web-config.mjs';

/**
 * Browser-side UX only. The backend is the authority for admin privileges.
 * Firebase Auth tokens are never persisted by this module.
 */
export function createFirebaseAdminClient({auth,signInWithPopup,signOut,GoogleAuthProvider,fetchImpl=fetch,apiBaseUrl}) {
  if (!/^https:\/\//.test(apiBaseUrl||'')) throw new TypeError('HTTPS Admin API URL required');
  let current=null;
  async function refresh() {
    current=null;
    const user=auth.currentUser;
    if(!user) return {authorized:false,reason:'signed_out'};
    const token=await user.getIdToken();
    const response=await fetchImpl(new URL('/api/admin/me',apiBaseUrl),{
      method:'GET',headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'omit'
    });
    if(!response.ok) return {authorized:false,reason:response.status===403?'not_admin':'verification_failed'};
    const body=await response.json();
    if(body.role!=='admin'||body.uid!==user.uid) return {authorized:false,reason:'identity_mismatch'};
    current={uid:user.uid,role:'admin'};
    return {authorized:true,uid:user.uid};
  }
  async function login(){
    await signInWithPopup(auth,new GoogleAuthProvider());
    return refresh();
  }
  async function logout(){
    current=null;
    await signOut(auth);
    return {authorized:false,reason:'signed_out'};
  }
  return {refresh,login,logout,isAuthorized:()=>!!current,getIdentity:()=>current&&{...current}};
}

export async function loadFirebaseAdminClient({apiBaseUrl}){
  const [{initializeApp,getApps,getApp},{getAuth,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence}]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')
  ]);
  const app=getApps().length?getApp():initializeApp(LANDRIGHT_FIREBASE_CONFIG);
  const auth=getAuth(app);
  await setPersistence(auth,inMemoryPersistence);
  return createFirebaseAdminClient({auth,signInWithPopup,signOut,GoogleAuthProvider,apiBaseUrl});
}
