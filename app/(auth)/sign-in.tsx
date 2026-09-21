import React,{useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {signInWithEmailAndPassword} from 'firebase/auth';
import {auth,configured} from '@/src/lib/firebase';
import {Body,Button,Card,Input,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';
export default function SignIn(){const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);const {colors}=useAppTheme();async function go(){if(!auth){setMsg('Add Firebase values to .env first.');return}try{setBusy(true);setMsg('');await signInWithEmailAndPassword(auth,email.trim(),password);router.replace('/(tabs)/discover')}catch{setMsg('Email or password is incorrect.')}finally{setBusy(false)}}return <Screen eyebrow="MIP.CHAT" title="Welcome back"><Body>Sign in to continue your private AutoFace introductions.</Body><Card><Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/><Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword}/><Button title={busy?'Signing in...':'Sign in'} onPress={go} disabled={busy}/>{msg?<Text style={{color:colors.rose}}>{msg}</Text>:null}{!configured?<Body>Firebase is not configured yet. Add the existing mip.chat public Firebase values to the mobile .env file.</Body>:null}</Card><Body>AutoFace - Match Intelligence Platform</Body></Screen>}
