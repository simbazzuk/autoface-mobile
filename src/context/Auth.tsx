import React,{createContext,useContext,useEffect,useState} from 'react';
import type {User} from 'firebase/auth';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '@/src/lib/firebase';
import {configurePurchases} from '@/src/lib/purchases';

const X=createContext<{
  user:User|null;
  loading:boolean;
}>({
  user:null,
  loading:true
});

export function AuthProvider({
  children
}:{
  children:React.ReactNode
}){
  const [user,setUser]=useState<User|null>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!auth){
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth,(u:any)=>{
      setUser(u);
      setLoading(false);

      if(u?.uid){
        void configurePurchases(u.uid).catch(error=>{
          console.warn(
            '[RevenueCat] Unable to identify customer:',
            error instanceof Error?error.message:error
          );
        });
      }
    });
  },[]);

  return(
    <X.Provider value={{user,loading}}>
      {children}
    </X.Provider>
  );
}

export const useAuth=()=>useContext(X);
