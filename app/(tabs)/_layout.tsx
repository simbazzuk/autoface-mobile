import React,{useCallback,useEffect,useState} from 'react';
import {Platform,View} from 'react-native';
import {Tabs,Redirect,router} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {useAuth} from '@/src/context/Auth';
import {useAppTheme} from '@/src/context/Theme';
import {api} from '@/src/lib/api';

type ReadinessStep={
  id:string;
  complete:boolean;
};

type ReadinessResponse={
  faceVerified:boolean;
  profileCompleteness:number;
  steps:ReadinessStep[];
};

const icons:Record<
  string,
  {
    on:keyof typeof Ionicons.glyphMap;
    off:keyof typeof Ionicons.glyphMap;
  }
>={
  discover:{on:'heart',off:'heart-outline'},
  introductions:{on:'people',off:'people-outline'},
  messages:{on:'chatbubble',off:'chatbubble-outline'},
  atlas:{on:'sparkles',off:'sparkles-outline'},
  profile:{on:'person',off:'person-outline'},
};

const protectedTabs=new Set([
  'discover',
  'introductions',
  'messages'
]);

export default function TabsLayout(){
  const {user,loading}=useAuth();
  const {colors,resolved}=useAppTheme();

  const [readiness,setReadiness]=useState<ReadinessResponse|null>(null);

  const refreshReadiness=useCallback(async()=>{
    if(!user){
      setReadiness(null);
      return;
    }

    try{
      const result=await api<ReadinessResponse>('/api/readiness');
      setReadiness(result);
    }catch(error){
      console.warn('[NavigationGate] unable to load readiness',error);
      setReadiness(null);
    }
  },[user]);

  useEffect(()=>{
    void refreshReadiness();
  },[refreshReadiness]);

  if(!loading&&!user){
    return <Redirect href="/(auth)/sign-in"/>;
  }

  const profileReady=
    readiness?.steps?.find(step=>step.id==='profile')?.complete===true;

  const faceVerified=readiness?.faceVerified===true;

  const matchingUnlocked=
    profileReady &&
    faceVerified;

  function lockedTabPress(e:{preventDefault:()=>void}){
    if(matchingUnlocked)return;

    e.preventDefault();

    if(!profileReady){
      router.push('/(tabs)/profile');
      return;
    }

    router.push('/verification');
  }

  return (
    <Tabs
      screenListeners={{
        state:()=>{
          void refreshReadiness();
        }
      }}
      screenOptions={({route})=>{
        const protectedTab=protectedTabs.has(route.name);
        const locked=protectedTab&&!matchingUnlocked;
        const relationshipTab=route.name==='introductions';

        return {
          headerShown:false,

          tabBarActiveTintColor:
            locked
              ?colors.muted
              :relationshipTab
                ?colors.pink
                :colors.blue,

          tabBarInactiveTintColor:colors.muted,

          sceneStyle:{
            backgroundColor:colors.bg
          },

          tabBarStyle:{
            position:'absolute',
            left:14,
            right:14,
            bottom:18,

            height:70,

            paddingTop:7,
            paddingBottom:7,

            backgroundColor:resolved==='dark'?'#101447':'#FFFFFF',
            borderTopWidth:0,
            borderWidth:1,
            borderColor:colors.line,
            borderRadius:30,

            shadowColor:'#000',
            shadowOffset:{width:0,height:7},
            shadowOpacity:0.13,
            shadowRadius:18,

            elevation:12
          },

          tabBarItemStyle:{
            paddingVertical:2
          },

          tabBarLabelStyle:{
            fontSize:9,
            fontWeight:'700',
            marginTop:1
          },

          tabBarIcon:({color,focused})=>{
            const pair=icons[route.name]??icons.profile;

            const activeColor=
              relationshipTab
                ?colors.pink
                :colors.blue;

            return (
              <View
                style={{
                  width:44,
                  height:36,
                  borderRadius:18,
                  alignItems:'center',
                  justifyContent:'center',

                  backgroundColor:
                    !locked&&focused
                      ?relationshipTab
                        ?colors.pink+'18'
                        :colors.blue+'14'
                      :'transparent',

                  borderWidth:!locked&&focused?1:0,
                  borderColor:
                    !locked&&focused
                      ?relationshipTab
                        ?colors.pink+'30'
                        :colors.blue+'28'
                      :'transparent'
                }}
              >
                <Ionicons
                  name={
                    locked
                      ?'lock-closed-outline'
                      :focused
                        ?pair.on
                        :pair.off
                  }
                  size={locked?20:24}
                  color={locked?colors.muted:focused?activeColor:color}
                />
              </View>
            );
          }
        };
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{title:'Discover'}}
        listeners={{
          tabPress:lockedTabPress
        }}
      />

      <Tabs.Screen
        name="introductions"
        options={{title:'Introductions'}}
        listeners={{
          tabPress:lockedTabPress
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{title:'Messages'}}
        listeners={{
          tabPress:lockedTabPress
        }}
      />

      <Tabs.Screen
        name="atlas"
        options={{title:'Atlas'}}
      />

      <Tabs.Screen
        name="profile"
        options={{title:'Profile'}}
      />
    </Tabs>
  );
}
