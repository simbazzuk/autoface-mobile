import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {AuthProvider} from '@/src/context/Auth';
import {ThemeProvider,useAppTheme} from '@/src/context/Theme';
import {NotificationBridge} from '@/src/components/NotificationBridge';
function Navigation(){const {resolved,colors}=useAppTheme();return <><StatusBar style={resolved==='dark'?'light':'dark'}/><NotificationBridge/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.bg}}}/></>}
export default function Root(){return <ThemeProvider><AuthProvider><Navigation/></AuthProvider></ThemeProvider>}
