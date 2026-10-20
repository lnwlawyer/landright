import {startAdminServer} from './node-server.mjs';

const port=Number(process.env.PORT||8080);
const allowedOrigin=process.env.ADMIN_ALLOWED_ORIGIN||'https://lnwlawyer.github.io';
if(!Number.isInteger(port)||port<1||port>65535) throw new Error('Invalid PORT');
if(process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_CLOUD_PROJECT!=='landright-admin') {
  throw new Error('Unexpected Google Cloud project');
}
const server=await startAdminServer({port,allowedOrigin});
console.log('LandRight Admin backend listening on loopback',port);
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
