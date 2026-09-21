import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {Appearance,ColorSchemeName} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {darkColors,lightColors,ThemeMode} from '@/src/lib/theme';
const KEY='autoface.theme.mode';
type Value={mode:ThemeMode;resolved:'light'|'dark';colors:typeof lightColors;setMode:(m:ThemeMode)=>void};
const ThemeContext=createContext<Value|undefined>(undefined);
export function ThemeProvider({children}:{children:React.ReactNode}){
 const [mode,setModeState]=useState<ThemeMode>('system');
 const [system,setSystem]=useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'light');
 useEffect(()=>{AsyncStorage.getItem(KEY).then(v=>{if(v==='light'||v==='dark'||v==='system')setModeState(v)}).catch(()=>{});const sub=Appearance.addChangeListener(({colorScheme})=>setSystem(colorScheme));return()=>sub.remove()},[]);
 const setMode=(m:ThemeMode)=>{setModeState(m);void AsyncStorage.setItem(KEY,m)};
 const resolved: 'light'|'dark'=mode==='system'?(system==='dark'?'dark':'light'):mode;
 const colors=resolved==='dark'?darkColors:lightColors;
 const value=useMemo(()=>({mode,resolved,colors,setMode}),[mode,resolved,colors]);
 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export function useAppTheme(){const v=useContext(ThemeContext);if(!v)throw new Error('useAppTheme must be used inside ThemeProvider');return v}
