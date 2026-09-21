import { auth } from './firebase';

const BASE=(process.env.EXPO_PUBLIC_VERIFICATION_API_BASE_URL||'').replace(/\/$/,'');

export function verificationApiConfigured(){return Boolean(BASE)}

export async function verificationApi<T>(path:string, init:RequestInit={}):Promise<T>{
  if(!BASE) throw new Error('VERIFICATION_API_NOT_CONFIGURED');
  const token=auth?.currentUser?await auth.currentUser.getIdToken():null;
  if(!token) throw new Error('AUTH_REQUIRED');
  const r=await fetch(`${BASE}${path}`,{
    ...init,
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(init.headers||{})},
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(body?.error||`Request failed (${r.status})`);
  return body as T;
}
