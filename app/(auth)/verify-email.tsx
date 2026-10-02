import React,{useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {auth} from '@/src/lib/firebase';
import {api} from '@/src/lib/api';
import {Body,Button,Card,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';

export default function VerifyEmail(){
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const {colors}=useAppTheme();

  async function check(){
    const user=auth?.currentUser;

    if(!user){
      router.replace('/(auth)/sign-in');
      return;
    }

    try{
      setBusy(true);
      setMsg('');

      await user.reload();

      if(user.emailVerified){
        router.replace('/(tabs)/profile');
        return;
      }

      setMsg(
        "We haven't detected verification yet. Open the link in your email, then try again."
      );
    }catch{
      setMsg('Unable to check verification right now.');
    }finally{
      setBusy(false);
    }
  }

  async function resend(){
    const user=auth?.currentUser;

    if(!user){
      router.replace('/(auth)/sign-in');
      return;
    }

    try{
      setBusy(true);
      setMsg('');

      await api<{ok:boolean;sent?:boolean}>(
        '/api/auth/verification-email',
        {
          method:'POST'
        }
      );

      setMsg(
        'Verification email sent. Check your inbox and spam folder.'
      );
    }catch{
      setMsg(
        'Please wait before requesting another verification email.'
      );
    }finally{
      setBusy(false);
    }
  }

  return(
    <Screen
      eyebrow="EMAIL VERIFICATION"
      title="Verify your email"
    >
      <Body>
        Before setting up your AutoFace profile, confirm that this email address belongs to you.
      </Body>

      <Card>
        <Text
          style={{
            color:colors.muted,
            fontSize:12,
            fontWeight:'800',
            marginBottom:6
          }}
        >
          SENT TO
        </Text>

        <Text
          style={{
            color:colors.ink,
            fontSize:16,
            fontWeight:'900',
            marginBottom:14
          }}
        >
          {auth?.currentUser?.email??'Your email address'}
        </Text>

        <Body>
          Open the verification link in the email from AutoFace, then return here.
        </Body>

        <Button
          title={busy?'Checking...':"I've verified my email"}
          disabled={busy}
          onPress={()=>void check()}
        />

        <Button
          title="Resend verification email"
          secondary
          disabled={busy}
          onPress={()=>void resend()}
        />

        {msg?(
          <Text
            style={{
              color:colors.muted,
              fontSize:13,
              lineHeight:18,
              marginTop:12
            }}
          >
            {msg}
          </Text>
        ):null}
      </Card>

      <Button
        title="Back to sign in"
        secondary
        onPress={()=>router.replace('/(auth)/sign-in')}
      />
    </Screen>
  );
}
