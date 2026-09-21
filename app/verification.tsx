import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Body,Button,Card,H2,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';
import {nativeLivenessAvailable,startNativeLiveness} from '@/src/lib/nativeLiveness';
import {verificationApi,verificationApiConfigured} from '@/src/lib/verificationApi';

type StartResponse={sessionId?:string;sessionID?:string;region?:string};
type ResultResponse={verified?:boolean;livenessVerified?:boolean;identityVerified?:boolean;photoVerified?:boolean};

export default function Verification(){
 const {colors}=useAppTheme(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
 const configured=verificationApiConfigured(); const nativeReady=nativeLivenessAvailable();
 async function begin(){
  if(busy)return;
  try{
   setBusy(true);setMessage('Creating secure liveness session…');
   const start=await verificationApi<StartResponse>('/api/face-verification/start',{method:'POST',body:'{}'});
   const sessionId=start.sessionId||start.sessionID; const region=start.region||process.env.EXPO_PUBLIC_AWS_REKOGNITION_REGION||'eu-west-2';
   if(!sessionId)throw new Error('LIVENESS_SESSION_MISSING');
   setMessage('Starting iPhone face check…');
   await startNativeLiveness(sessionId,region);
   setMessage('Checking verification result…');
   const result=await verificationApi<ResultResponse>('/api/face-verification/result',{method:'POST',body:JSON.stringify({sessionId})});
   if(result.verified||result.livenessVerified){setMessage('Face verification complete.');}else{setMessage('The check completed but verification was not confirmed. Please try again.');}
  }catch(e){
   const raw=e instanceof Error?e.message:'Unable to verify.';
   setMessage(raw==='VERIFICATION_API_NOT_CONFIGURED'?'Standalone verification backend is not configured yet.':raw==='NATIVE_LIVENESS_NOT_INSTALLED'?'Native Face Liveness is not installed in this build. Use an EAS development build containing the AutoFace iOS liveness module.':raw==='AUTH_REQUIRED'?'Please sign in again before verification.':raw);
  }finally{setBusy(false)}
 }
 return <Screen eyebrow="AUTOFACE SECURITY" title="Face verification"><View style={{gap:12,paddingBottom:40}}>
  <Card><H2>Verify inside AutoFace</H2><Body>This check stays in the AutoFace iOS experience. It does not open mip.chat or Safari.</Body><Body>AutoFace creates a secure liveness session, runs Amazon Rekognition Face Liveness on the iPhone, then asks the verification backend to confirm the result against your profile.</Body></Card>
  <Card><H2>Ready to verify</H2><View style={{gap:8}}><Status label="Verification API" ok={configured}/><Status label="Native iOS Face Liveness" ok={nativeReady}/></View><Button title={busy?'Verification in progress…':'Start face check'} disabled={busy||!configured||!nativeReady} onPress={begin}/>{message?<Text style={{color:colors.text,lineHeight:20}}>{message}</Text>:null}</Card>
  <Button title="Back to Profile" secondary onPress={()=>router.back()}/>
 </View></Screen>
}
function Status({label,ok}:{label:string;ok:boolean}){const {colors}=useAppTheme();return <View style={{flexDirection:'row',justifyContent:'space-between',gap:12}}><Text style={{color:colors.text,fontWeight:'700'}}>{label}</Text><Text style={{color:ok?colors.green:colors.muted,fontWeight:'800'}}>{ok?'Ready':'Setup required'}</Text></View>}
