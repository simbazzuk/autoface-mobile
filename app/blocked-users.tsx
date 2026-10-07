import React,{useCallback,useState} from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native';
import {router,useFocusEffect} from 'expo-router';

import {api} from '@/src/lib/api';
import {useAppTheme} from '@/src/context/Theme';
import {Loading,Screen} from '@/src/components/UI';

type BlockedProfile={
  blockId:string;
  uid:string;
  firstName:string;
  location:string|null;
  matchId:string|null;
  blockedAt:string|null;
  source:string|null;
};

type BlockedResponse={
  blockedProfiles?:BlockedProfile[];
};

export default function BlockedUsers(){
  const {colors}=useAppTheme();

  const [people,setPeople]=useState<BlockedProfile[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [busyUid,setBusyUid]=useState<string|null>(null);
  const [error,setError]=useState('');

  const load=useCallback(async(showLoader=true)=>{
    try{
      if(showLoader)setLoading(true);
      setError('');

      const response=await api('/api/blocks') as BlockedResponse;

      setPeople(
        Array.isArray(response?.blockedProfiles)
          ?response.blockedProfiles
          :[]
      );
    }catch(error){
      setError(
        error instanceof Error
          ?error.message
          :'Unable to load blocked users.'
      );
    }finally{
      setLoading(false);
      setRefreshing(false);
    }
  },[]);

  useFocusEffect(
    useCallback(()=>{
      void load(true);
    },[load])
  );

  async function refresh(){
    setRefreshing(true);
    await load(false);
  }

  function unblock(person:BlockedProfile){
    if(busyUid)return;

    Alert.alert(
      `Unblock ${person.firstName}?`,
      `${person.firstName} won't automatically become a connection again. You may become eligible to discover each other again in the future.`,
      [
        {
          text:'Cancel',
          style:'cancel'
        },
        {
          text:'Unblock',
          onPress:async()=>{
            try{
              setBusyUid(person.uid);

              await api('/api/blocks',{
                method:'DELETE',
                body:JSON.stringify({
                  blockedUid:person.uid
                })
              });

              setPeople(current=>
                current.filter(item=>item.uid!==person.uid)
              );

              Alert.alert(
                'User unblocked',
                `${person.firstName} has been unblocked. Your previous connection has not been restored.`
              );
            }catch(error){
              Alert.alert(
                'Unable to unblock',
                error instanceof Error
                  ?error.message
                  :'Please try again.'
              );
            }finally{
              setBusyUid(null);
            }
          }
        }
      ]
    );
  }

  return(
    <Screen
      eyebrow="SAFETY & PRIVACY"
      title="Blocked users"
    >
      <Pressable
        onPress={()=>router.back()}
        style={{
          alignSelf:'flex-start',
          paddingVertical:4,
          marginBottom:12
        }}
      >
        <Text
          style={{
            color:colors.blue,
            fontWeight:'800',
            fontSize:16
          }}
        >
          ‹ Profile
        </Text>
      </Pressable>

      <Text
        style={{
          color:colors.muted,
          fontSize:14,
          lineHeight:20,
          marginBottom:14
        }}
      >
        People you've blocked can't contact you. Unblocking someone
        won't restore your previous connection or conversation.
      </Text>

      {loading?(
        <Loading/>
      ):(
        <ScrollView
          contentContainerStyle={{
            gap:10,
            paddingBottom:40
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
            />
          }
        >
          {error?(
            <View
              style={{
                backgroundColor:colors.card,
                borderColor:colors.line,
                borderWidth:1,
                borderRadius:16,
                padding:14
              }}
            >
              <Text
                style={{
                  color:colors.text,
                  fontWeight:'800'
                }}
              >
                Unable to load blocked users
              </Text>

              <Text
                style={{
                  color:colors.muted,
                  marginTop:4
                }}
              >
                {error}
              </Text>

              <Pressable
                onPress={()=>void load(true)}
                style={{
                  marginTop:12
                }}
              >
                <Text
                  style={{
                    color:'#FFFFFF',
                    fontWeight:'800'
                  }}
                >
                  Try again
                </Text>
              </Pressable>
            </View>
          ):null}

          {!error&&people.length===0?(
            <View
              style={{
                backgroundColor:colors.card,
                borderColor:colors.line,
                borderWidth:1,
                borderRadius:18,
                padding:18
              }}
            >
              <Text
                style={{
                  color:colors.text,
                  fontSize:17,
                  fontWeight:'800'
                }}
              >
                No blocked users
              </Text>

              <Text
                style={{
                  color:colors.muted,
                  marginTop:5,
                  lineHeight:19
                }}
              >
                Anyone you block will appear here.
              </Text>
            </View>
          ):null}

          {people.map(person=>(
            <View
              key={person.uid}
              style={{
                backgroundColor:colors.card,
                borderColor:colors.line,
                borderWidth:1,
                borderRadius:18,
                padding:15,
                flexDirection:'row',
                alignItems:'center',
                gap:12
              }}
            >
              <View
                style={{
                  width:44,
                  height:44,
                  borderRadius:22,
                  backgroundColor:colors.bg,
                  borderColor:colors.line,
                  borderWidth:1,
                  alignItems:'center',
                  justifyContent:'center'
                }}
              >
                <Text
                  style={{
                    color:colors.text,
                    fontSize:18,
                    fontWeight:'900'
                  }}
                >
                  {(person.firstName||'M')
                    .slice(0,1)
                    .toUpperCase()}
                </Text>
              </View>

              <View style={{flex:1}}>
                <Text
                  style={{
                    color:colors.text,
                    fontSize:16,
                    fontWeight:'800'
                  }}
                >
                  {person.firstName||'Member'}
                </Text>

                <Text
                  style={{
                    color:colors.muted,
                    fontSize:12,
                    marginTop:2
                  }}
                >
                  {person.location
                    ?`${person.location} · Blocked`
                    :'Blocked'}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unblock ${person.firstName||'member'}`}
                disabled={busyUid===person.uid}
                onPress={()=>unblock(person)}
                style={{
                  borderWidth:1.5,
                  borderColor:colors.blue,
                  backgroundColor:colors.card,
                  borderRadius:18,
                  paddingHorizontal:16,
                  paddingVertical:8,
                  alignItems:'center',
                  justifyContent:'center',
                  opacity:busyUid===person.uid?0.5:1
                }}
              >
                <Text
                  style={{
                    color:colors.blue,
                    fontSize:14,
                    fontWeight:'800'
                  }}
                >
                  {busyUid===person.uid?'Unblocking…':'Unblock'}
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
