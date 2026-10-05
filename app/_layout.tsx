import {useEffect} from 'react';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import {AuthProvider} from '@/src/context/Auth';
import {ThemeProvider,useAppTheme} from '@/src/context/Theme';
import {NotificationBridge} from '@/src/components/NotificationBridge';

// Keep the native splash visible until AutoFace explicitly hides it.
void SplashScreen.preventAutoHideAsync();

const MIN_SPLASH_MS = 5000;

function Navigation(){
  const {resolved,colors}=useAppTheme();

  useEffect(()=>{
    const timer=setTimeout(()=>{
      void SplashScreen.hideAsync();
    },MIN_SPLASH_MS);

    return ()=>clearTimeout(timer);
  },[]);

  return (
    <>
      <StatusBar style={resolved==='dark'?'light':'dark'}/>
      <NotificationBridge/>
      <Stack
        screenOptions={{
          headerShown:false,
          contentStyle:{backgroundColor:colors.bg}
        }}
      />
    </>
  );
}

export default function Root(){
  return (
    <ThemeProvider>
      <AuthProvider>
        <Navigation/>
      </AuthProvider>
    </ThemeProvider>
  );
}
