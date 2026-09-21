import { auth } from './firebase';
const BASE=(process.env.EXPO_PUBLIC_API_BASE_URL||'https://mip.chat').replace(/\/$/,'');
export async function api<T>(path:string, init:RequestInit={}):Promise<T>{
 const token=auth?.currentUser?await auth.currentUser.getIdToken():null;
 const r=await fetch(`${BASE}${path}`,{...init,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(init.headers||{})}});
 const body=await r.json().catch(()=>({})); if(!r.ok) throw new Error(body?.error||`Request failed (${r.status})`); return body as T;
}
export const profilePhoto=(uid:string)=>`${BASE}/api/profile-photo/${encodeURIComponent(uid)}`;
