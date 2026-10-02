import React,{useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {signInWithEmailAndPassword} from 'firebase/auth';
import {auth,configured} from '@/src/lib/firebase';
import {Body,Button,Card,Input,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';

export default function SignIn(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  const {colors}=useAppTheme();

  async function go(){
    if(!auth){
      setMsg('Add Firebase values to .env first.');
      return;
    }

    try{
      setBusy(true);
      setMsg('');

      const credential=await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      if(credential.user.emailVerified){
        router.replace('/(tabs)/discover');
      }else{
        router.replace('/(auth)/verify-email');
      }
    }catch{
      setMsg('Email or password is incorrect.');
    }finally{
      setBusy(false);
    }
  }

  return(
    <Screen
      eyebrow="AUTOFACE"
      title="Welcome back"
    >
      <Body>
        Sign in to continue your private AutoFace introductions.
      </Body>

      <Card>
        <Input
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Input
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          title={busy?'Signing in...':'Sign in'}
          onPress={go}
          disabled={busy}
        />

        {msg?(
          <Text style={{color:colors.rose}}>
            {msg}
          </Text>
        ):null}
      </Card>

      <Body>New to AutoFace?</Body>

      <Button
        title="Create account"
        secondary
        onPress={()=>router.push('/(auth)/create-account')}
      />

      {!configured?(
        <Body>
          Firebase is not configured yet. Add the existing mip.chat
          public Firebase values to the mobile .env file.
        </Body>
      ):null}
    </Screen>
  );
}
