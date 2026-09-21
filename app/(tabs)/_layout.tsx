import React from 'react';
import {Tabs,Redirect} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useAuth} from '@/src/context/Auth';
import {useAppTheme} from '@/src/context/Theme';

const icons:Record<string,{on:keyof typeof Ionicons.glyphMap;off:keyof typeof Ionicons.glyphMap}>={
  discover:{on:'heart',off:'heart-outline'},
  introductions:{on:'people',off:'people-outline'},
  messages:{on:'chatbubble',off:'chatbubble-outline'},
  atlas:{on:'sparkles',off:'sparkles-outline'},
  profile:{on:'person',off:'person-outline'},
};

export default function TabsLayout(){
  const {user,loading}=useAuth();
  const {colors}=useAppTheme();
  if(!loading&&!user)return <Redirect href="/(auth)/sign-in"/>;
  return <Tabs screenOptions={({route})=>({
    headerShown:false,
    tabBarActiveTintColor:colors.blue,
    tabBarInactiveTintColor:colors.muted,
    tabBarStyle:{height:82,paddingTop:8,backgroundColor:colors.tab,borderTopColor:colors.line},
    tabBarLabelStyle:{fontSize:12,fontWeight:'600'},
    sceneStyle:{backgroundColor:colors.bg},
    tabBarIcon:({color,size,focused})=>{
      const pair=icons[route.name]??icons.profile;
      return <Ionicons name={focused?pair.on:pair.off} size={size} color={color}/>;
    },
  })}>
    <Tabs.Screen name="discover" options={{title:'Discover'}}/>
    <Tabs.Screen name="introductions" options={{title:'Introductions'}}/>
    <Tabs.Screen name="messages" options={{title:'Messages'}}/>
    <Tabs.Screen name="atlas" options={{title:'Atlas'}}/>
    <Tabs.Screen name="profile" options={{title:'Profile'}}/>
  </Tabs>;
}
