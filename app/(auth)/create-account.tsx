import React,{useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {createUserWithEmailAndPassword} from 'firebase/auth';
import {auth,configured} from '@/src/lib/firebase';
import {api} from '@/src/lib/api';
import {Body,Button,Card,Input,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';

export default function CreateAccount(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  const {colors}=useAppTheme();

  async function create(){
    const cleanEmail=email.trim();

    if(!auth){
      setMsg('Firebase is not configured.');
      return;
    }

    if(!cleanEmail){
      setMsg('Enter your email address.');
      return;
    }

    if(password.length<6){
      setMsg('Choose a password with at least 6 characters.');
      return;
    }

    if(password!==confirmPassword){
      setMsg('The passwords do not match.');
      return;
    }

    try{
      setBusy(true);
      setMsg('');

      await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await api<{ok:boolean;sent?:boolean}>(
        '/api/auth/verification-email',
        {
          method:'POST'
        }
      );

      router.replace('/(auth)/verify-email');
    }catch(error:any){
      const code=String(error?.code??'');

      if(code.includes('email-already-in-use')){
        setMsg('An account already exists for this email.');
      }else if(code.includes('invalid-email')){
        setMsg('Enter a valid email address.');
      }else if(code.includes('weak-password')){
        setMsg('Choose a stronger password.');
      }else{
        setMsg('Unable to create your account. Please try again.');
      }
    }finally{
      setBusy(false);
    }
  }

  return(
    <Screen
      eyebrow="AUTOFACE"
      title="Create your account"
    >
      <Body>
        Start your profile and tell AutoFace what matters to you.
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

        <Input
          placeholder="Confirm password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Button
          title={busy?'Creating account...':'Create account'}
          onPress={create}
          disabled={busy}
        />

        {msg?(
          <Text style={{color:colors.rose}}>
            {msg}
          </Text>
        ):null}
      </Card>

      <Button
        title="Already have an account? Sign in"
        secondary
        onPress={()=>router.replace('/(auth)/sign-in')}
      />

      {!configured?(
        <Body>
          Firebase is not configured.
        </Body>
      ):null}
    </Screen>
  );
}
