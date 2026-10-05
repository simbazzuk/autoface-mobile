import React from 'react';
import {Platform,View} from 'react-native';
import {Tabs,Redirect} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {useAuth} from '@/src/context/Auth';
import {useAppTheme} from '@/src/context/Theme';

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

export default function TabsLayout(){
  const {user,loading}=useAuth();
  const {colors,resolved}=useAppTheme();

  if(!loading&&!user){
    return <Redirect href="/(auth)/sign-in"/>;
  }

  return (
    <Tabs
      screenOptions={({route})=>({
        headerShown:false,

        tabBarActiveTintColor:
          route.name==='introductions'
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
          const relationshipTab=route.name==='introductions';

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

                backgroundColor:focused
                  ?relationshipTab
                    ?colors.pink+'18'
                    :colors.blue+'14'
                  :'transparent',

                borderWidth:focused?1:0,
                borderColor:focused
                  ?relationshipTab
                    ?colors.pink+'30'
                    :colors.blue+'28'
                  :'transparent'
              }}
            >
              <Ionicons
                name={focused?pair.on:pair.off}
                size={24}
                color={focused?activeColor:color}
              />
            </View>
          );
        }
      })}
    >
      <Tabs.Screen
        name="discover"
        options={{title:'Discover'}}
      />

      <Tabs.Screen
        name="introductions"
        options={{title:'Introductions'}}
      />

      <Tabs.Screen
        name="messages"
        options={{title:'Messages'}}
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
