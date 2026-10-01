import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {api,profilePhoto} from '@/src/lib/api';
import {Body,Button,Input,Loading,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';
import {useAuth} from '@/src/context/Auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Message={
  id:string;
  senderUid:string;
  text:string;
  createdAt?:string|null;
  pending?:boolean;
  failed?:boolean;
};

type Other={
  uid:string;
  firstName?:string;
  age?:number|null;
  generalLocation?:string|null;
  occupation?:string|null;
  authenticityScore?:number;
  compatibilityScore?:number;
  faceVerified?:boolean;
};

type Messaging={
  unlimited:boolean;
  freeLimit:number;
  sentCount:number;
  remaining:number|null;
  locked:boolean;
  contactDetailSharing?:boolean;
};

type Conversation={
  matchId:string;
  other:Other;
  messages:Message[];
  messaging:Messaging;
};

type AtlasCoachStatus={
  enabled:boolean;
  viewerOptIn:boolean;
  otherOptIn:boolean;
  available:boolean;
};

type AtlasCoachStarter={
  theme:string;
  question:string;
  basis:'shared_theme'|'discussion_point';
};

type AtlasCoachResult={
  intro:string;
  starters:AtlasCoachStarter[];
};

type AtlasCoachResponse={
  coach:AtlasCoachResult;
  persisted?:boolean;
  notice?:string;
};

const QUICK_REPLIES=[
  'Hi! Nice to meet you',
  'How has your day been?',
  'What made you smile today?'
];

function dayLabel(value?:string|null){
  if(!value)return '';

  const d=new Date(value);
  const today=new Date();
  const yesterday=new Date();

  yesterday.setDate(today.getDate()-1);

  if(d.toDateString()===today.toDateString())return 'Today';
  if(d.toDateString()===yesterday.toDateString())return 'Yesterday';

  return d.toLocaleDateString([],{
    day:'numeric',
    month:'short',
    year:d.getFullYear()===today.getFullYear()?undefined:'numeric'
  });
}

function ConnectionPhoto({
  person,
  token
}:{
  person:Other;
  token:string|null;
}){
  const {colors}=useAppTheme();
  const [failed,setFailed]=useState(false);

  const initial=(person.firstName||'?')
    .trim()
    .charAt(0)
    .toUpperCase();

  if(failed){
    return(
      <View
        style={[
          s.avatarFallback,
          {backgroundColor:colors.photo}
        ]}
      >
        <Text
          style={[
            s.avatarInitial,
            {color:colors.ink}
          ]}
        >
          {initial}
        </Text>
      </View>
    );
  }

  return(
    <Image
      source={{
        uri:profilePhoto(person.uid),
        headers:token
          ?{Authorization:`Bearer ${token}`}
          :undefined
      }}
      style={[
        s.avatar,
        {backgroundColor:colors.photo}
      ]}
      onError={()=>setFailed(true)}
    />
  );
}

export default function Chat(){
  const params=useLocalSearchParams<{matchId:string|string[]}>();
  const matchId=Array.isArray(params.matchId)
    ?params.matchId[0]
    :params.matchId;

  const {colors}=useAppTheme();
  const {user}=useAuth();

  const [data,setData]=useState<Conversation|null>(null);
  const [value,setValue]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [sending,setSending]=useState(false);
  const [photoAuthToken,setPhotoAuthToken]=useState<string|null>(null);

  // AutoFace 0.1.20 - Atlas Conversation Coach
  const [coachOpen,setCoachOpen]=useState(false);
  const [coachRound,setCoachRound]=useState(0);

  const [coachStatus,setCoachStatus]=useState<AtlasCoachStatus|null>(null);
  const [coach,setCoach]=useState<AtlasCoachResult|null>(null);
  const [coachBusy,setCoachBusy]=useState(false);
  const [coachConsent,setCoachConsent]=useState(false);
  const [coachError,setCoachError]=useState('');

  const list=useRef<FlatList<{message:Message;showDay:boolean}>>(null);
  const mounted=useRef(true);

  useEffect(()=>{
    let active=true;

    if(!user){
      setPhotoAuthToken(null);
      return()=>{active=false;};
    }

    void user.getIdToken()
      .then(token=>{
        if(active)setPhotoAuthToken(token);
      })
      .catch(()=>{
        if(active)setPhotoAuthToken(null);
      });

    return()=>{active=false;};
  },[user]);

  const load=useCallback(async(silent=false)=>{
    if(!matchId)return;

    try{
      if(!silent)setErr('');

      const next=await api<Conversation>(
        `/api/messages?matchId=${encodeURIComponent(matchId)}`
      );

      if(mounted.current)setData(next);
    }catch(e){
      if(!silent&&mounted.current){
        setErr(
          e instanceof Error
            ?e.message
            :'Unable to load messages'
        );
      }
    }finally{
      if(mounted.current){
        setLoading(false);
        setRefreshing(false);
      }
    }
  },[matchId]);

  useEffect(
    ()=>()=>{
      mounted.current=false;
    },
    []
  );

  useFocusEffect(
    useCallback(()=>{
      mounted.current=true;
      void load();

      const timer=setInterval(()=>{
        if(AppState.currentState==='active'){
          void load(true);
        }
      },5000);

      return()=>clearInterval(timer);
    },[load])
  );

  useEffect(()=>{
    if(matchId&&data){
      void AsyncStorage.setItem(
        `autoface:last-opened:${matchId}`,
        new Date().toISOString()
      );
    }
  },[matchId,data?.messages?.length]);

  const messages=data?.messages??[];

  useEffect(()=>{
    let active=true;

    if(!matchId){
      setCoachStatus(null);
      return()=>{active=false;};
    }

    void api<AtlasCoachStatus>(
      `/api/atlas-ai/introduction-coach?matchId=${encodeURIComponent(matchId)}`
    )
      .then(status=>{
        if(active)setCoachStatus(status);
      })
      .catch(()=>{
        if(active)setCoachStatus(null);
      });

    return()=>{active=false;};
  },[matchId]);

  const atlasSuggestions=useMemo(()=>{
    const name=data?.other.firstName?.trim()||'your connection';
    const score=data?.other.compatibilityScore;

    const rounds=[
      [
        {
          label:'Break the ice',
          text:'What are you looking forward to this weekend?'
        },
        {
          label:'Go a little deeper',
          text:"What's something you could talk about for hours?"
        },
        {
          label:'Use your connection',
          text:score!=null
            ?`Atlas says we have ${score}% compatibility — what do you think we'd get along best over?`
            :"What do you think we'd get along best over?"
        }
      ],
      [
        {
          label:'Keep it natural',
          text:"What's been the best part of your week so far?"
        },
        {
          label:'Discover more',
          text:"What's something you've always wanted to try?"
        },
        {
          label:`Ask ${name}`,
          text:"What's your idea of a really good first date?"
        }
      ],
      [
        {
          label:'Something fun',
          text:'Quick one — spontaneous weekend away or perfectly planned trip?'
        },
        {
          label:'Find common ground',
          text:'What do you usually enjoy doing when you get a completely free day?'
        },
        {
          label:'A little deeper',
          text:"What's something that's really important to you in a relationship?"
        }
      ]
    ];

    return rounds[coachRound%rounds.length];
  },[
    coachRound,
    data?.other.firstName,
    data?.other.compatibilityScore
  ]);

  function useAtlasSuggestion(suggestion:string){
    setValue(suggestion);
    setCoachOpen(false);

    setTimeout(
      ()=>list.current?.scrollToEnd({animated:true}),
      100
    );
  }

  async function generateAtlasCoach(){
    if(!matchId||!coachConsent||coachBusy)return;

    try{
      setCoachBusy(true);
      setCoachError('');

      const response=await api<AtlasCoachResponse>(
        '/api/atlas-ai/introduction-coach',
        {
          method:'POST',
          body:JSON.stringify({
            matchId,
            consent:true
          })
        }
      );

      if(!response.coach?.starters?.length){
        throw new Error('ATLAS_AI_INVALID_STARTERS');
      }

      setCoach(response.coach);
    }catch(e){
      const raw=e instanceof Error
        ?e.message
        :'Unable to generate conversation starters.';

      setCoachError(
        raw==='ATLAS_AI_TIMEOUT'||/operation was aborted/i.test(raw)
          ?'Atlas is taking longer than expected. Please try again.'
          :raw.startsWith('ATLAS_AI_INVALID_')||
             raw==='ATLAS_AI_EMPTY_RESPONSE'
            ?'Atlas could not create a valid set of conversation starters. Please try again.'
            :raw==='BOTH_AI_OPT_INS_REQUIRED'
              ?'Atlas AI conversation suggestions require both members to have AI Discovery enabled.'
              :raw==='AI_CONSENT_REQUIRED'
                ?'Atlas needs your permission before generating AI conversation suggestions.'
                :raw
      );
    }finally{
      setCoachBusy(false);
    }
  }

  const rendered=useMemo(
    ()=>messages.map((m,i)=>({
      message:m,
      showDay:
        i===0||
        dayLabel(messages[i-1]?.createdAt)!==dayLabel(m.createdAt)
    })),
    [messages]
  );

  async function refresh(){
    setRefreshing(true);
    await load();
  }

  async function send(prefill?:string){
    const text=(prefill??value).trim();

    if(
      !text||
      !matchId||
      sending||
      data?.messaging.locked
    ){
      return;
    }

    const tempId=`pending-${Date.now()}`;

    const optimistic:Message={
      id:tempId,
      senderUid:user?.uid??'',
      text,
      createdAt:new Date().toISOString(),
      pending:true
    };

    setData(current=>
      current
        ?{
          ...current,
          messages:[...current.messages,optimistic]
        }
        :current
    );

    setValue('');

    setTimeout(
      ()=>list.current?.scrollToEnd({animated:true}),
      30
    );

    try{
      setSending(true);
      setErr('');

      await api('/api/messages',{
        method:'POST',
        body:JSON.stringify({
          matchId,
          text,
          message:text
        })
      });

      await load(true);
    }catch(e){
      const raw=e instanceof Error
        ?e.message
        :'Unable to send';

      setData(current=>
        current
          ?{
            ...current,
            messages:current.messages.map(m=>
              m.id===tempId
                ?{...m,pending:false,failed:true}
                :m
            )
          }
          :current
      );

      setErr(
        raw==='MESSAGE_LIMIT_REACHED'
          ?'You have used your free message allowance. You can still read this conversation.'
          :raw==='CONTACT_DETAILS_MEMBERSHIP_REQUIRED'
            ?'Contact details can be shared once messaging is unlocked.'
            :raw
      );
    }finally{
      setSending(false);
    }
  }

  if(loading){
    return(
      <Screen
        eyebrow="PRIVATE CONNECTION"
        title="Conversation"
      >
        <Loading/>
      </Screen>
    );
  }

  const personName=data?.other?.firstName||'Your connection';

  const personDetails=data
    ?[
      data.other.generalLocation,
      data.other.occupation
    ].filter(Boolean).join(' · ')
    :'';

  return(
    <Screen
      eyebrow="PRIVATE CONNECTION"
      title={`Chat with ${personName}`}
    >
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS==='ios'?'padding':undefined}
        keyboardVerticalOffset={8}
      >
        <Pressable
          onPress={()=>router.back()}
          hitSlop={10}
        >
          <Text
            style={[
              s.back,
              {color:colors.blue}
            ]}
          >
            {'‹ Connections'}
          </Text>
        </Pressable>

        {data?(
          <View
            style={[
              s.connectionCard,
              {
                borderColor:colors.line,
                backgroundColor:colors.card
              }
            ]}
          >
            <View style={s.person}>
              <View>
                <ConnectionPhoto
                  person={data.other}
                  token={photoAuthToken}
                />

                {data.other.faceVerified?(
                  <View
                    style={[
                      s.verifiedDot,
                      {
                        backgroundColor:colors.blue,
                        borderColor:colors.card
                      }
                    ]}
                  >
                    <Text style={s.verifiedDotText}>✓</Text>
                  </View>
                ):null}
              </View>

              <View style={s.personCopy}>
                <View style={s.nameRow}>
                  <Text
                    style={[
                      s.personName,
                      {color:colors.text}
                    ]}
                  >
                    {personName}
                    {data.other.age?`, ${data.other.age}`:''}
                  </Text>

                  {data.other.faceVerified?(
                    <Text
                      style={[
                        s.blueCheck,
                        {color:colors.blue}
                      ]}
                    >
                      ✓
                    </Text>
                  ):null}
                </View>

                {personDetails?(
                  <Text
                    style={[
                      s.personDetail,
                      {color:colors.muted}
                    ]}
                    numberOfLines={1}
                  >
                    {personDetails}
                  </Text>
                ):null}

                <Text
                  style={[
                    s.privateLabel,
                    {color:colors.muted}
                  ]}
                >
                  Mutual connection · private conversation
                </Text>

                {data.other.faceVerified?(
                  <Text
                    style={[
                      s.verifiedText,
                      {color:colors.blue}
                    ]}
                  >
                    ✓ Face Verified
                  </Text>
                ):null}
              </View>
            </View>

            <View
              style={[
                s.divider,
                {backgroundColor:colors.line}
              ]}
            />

            <View style={s.trust}>
              <View style={s.trustItem}>
                <Text
                  style={[
                    s.trustValue,
                    {color:colors.ink}
                  ]}
                >
                  {data.other.compatibilityScore??'-'}%
                </Text>
                <Text
                  style={[
                    s.small,
                    {color:colors.muted}
                  ]}
                >
                  Atlas
                </Text>
              </View>

              <View style={s.trustItem}>
                <Text
                  style={[
                    s.trustValue,
                    {color:colors.ink}
                  ]}
                >
                  {data.other.authenticityScore??'-'}%
                </Text>
                <Text
                  style={[
                    s.small,
                    {color:colors.muted}
                  ]}
                >
                  Authenticity
                </Text>
              </View>

              <View style={s.entitlement}>
                <View
                  style={[
                    s.chatStatus,
                    {
                      backgroundColor:data.messaging.locked
                        ?colors.photo
                        :colors.blue
                    }
                  ]}
                >
                  <Text
                    style={[
                      s.chatStatusText,
                      {
                        color:data.messaging.locked
                          ?colors.rose
                          :'#fff'
                      }
                    ]}
                  >
                    {data.messaging.unlimited
                      ?'Unlimited chat'
                      :data.messaging.locked
                        ?'Messaging paused'
                        :`${data.messaging.remaining??0} free left`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ):null}

        {err?(
          <View
            style={[
              s.errorBox,
              {
                borderColor:colors.line,
                backgroundColor:colors.card
              }
            ]}
          >
            <Text
              style={[
                s.error,
                {color:colors.rose}
              ]}
            >
              {err}
            </Text>

            <Pressable onPress={()=>void load()}>
              <Text
                style={{
                  color:colors.blue,
                  fontWeight:'800'
                }}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        ):null}

        <FlatList
          ref={list}
          data={rendered}
          keyExtractor={x=>x.message.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.blue}
            />
          }
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={()=>
            list.current?.scrollToEnd({animated:false})
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View
                style={[
                  s.newConversation,
                  {
                    backgroundColor:colors.card,
                    borderColor:colors.line
                  }
                ]}
              >
                <Text
                  style={[
                    s.newConversationTitle,
                    {color:colors.ink}
                  ]}
                >
                  Your conversation starts here
                </Text>

                <Body>
                  You both chose to connect. A simple hello is enough.
                </Body>
              </View>

              <Text
                style={[
                  s.quickTitle,
                  {color:colors.muted}
                ]}
              >
                Conversation starters
              </Text>

              <View style={s.quickWrap}>
                {QUICK_REPLIES.map(x=>(
                  <Pressable
                    key={x}
                    onPress={()=>void send(x)}
                    style={[
                      s.quick,
                      {
                        borderColor:colors.line,
                        backgroundColor:colors.card
                      }
                    ]}
                  >
                    <Text
                      style={{
                        color:colors.text,
                        fontWeight:'700'
                      }}
                    >
                      {x}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          renderItem={({item})=>{
            const m=item.message;
            const mine=m.senderUid===user?.uid;

            return(
              <View>
                {item.showDay&&m.createdAt?(
                  <View style={s.day}>
                    <Text
                      style={[
                        s.dayText,
                        {
                          color:colors.muted,
                          backgroundColor:colors.bg
                        }
                      ]}
                    >
                      {dayLabel(m.createdAt)}
                    </Text>
                  </View>
                ):null}

                <View
                  style={[
                    s.messageRow,
                    mine?s.mine:s.theirs
                  ]}
                >
                  <View
                    style={[
                      s.bubble,
                      {
                        opacity:m.failed?.65:1,
                        backgroundColor:mine
                          ?colors.blue
                          :colors.card,
                        borderColor:m.failed
                          ?colors.rose
                          :mine
                            ?colors.blue
                            :colors.line
                      }
                    ]}
                  >
                    <Text
                      style={[
                        s.message,
                        {color:mine?'#fff':colors.text}
                      ]}
                    >
                      {m.text}
                    </Text>

                    <View style={s.meta}>
                      {m.createdAt?(
                        <Text
                          style={[
                            s.time,
                            {
                              color:mine
                                ?'#DBEAFE'
                                :colors.muted
                            }
                          ]}
                        >
                          {new Date(m.createdAt)
                            .toLocaleTimeString([],{
                              hour:'2-digit',
                              minute:'2-digit'
                            })}
                        </Text>
                      ):null}

                      {mine?(
                        <Text
                          style={[
                            s.time,
                            {
                              color:m.failed
                                ?'#FECACA'
                                :'#DBEAFE'
                            }
                          ]}
                        >
                          {m.failed
                            ?'Failed'
                            :m.pending
                              ?'Sending...'
                              :'Sent'}
                        </Text>
                      ):null}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />

        {data?.messaging.locked?(
          <View
            style={[
              s.locked,
              {
                backgroundColor:colors.card,
                borderColor:colors.line
              }
            ]}
          >
            <Text
              style={[
                s.lockedTitle,
                {color:colors.ink}
              ]}
            >
              Conversation paused
            </Text>

            <Body>
              Your message history remains available to read.
            </Body>
          </View>
        ):(
          <View
            style={[
              s.composerShell,
              {
                borderTopColor:colors.line,
                backgroundColor:colors.bg
              }
            ]}
          >
            <View style={{marginBottom:12}}>
              <Pressable
                onPress={()=>setCoachOpen(open=>!open)}
                style={{
                  alignSelf:'flex-start',
                  paddingHorizontal:14,
                  paddingVertical:9,
                  borderRadius:18,
                  borderWidth:1,
                  borderColor:colors.blue,
                  backgroundColor:colors.card
                }}
              >
                <Text
                  style={{
                    color:colors.blue,
                    fontWeight:'800',
                    fontSize:13
                  }}
                >
                  ✦ {coachOpen?'Hide Atlas':'Ask Atlas'}
                </Text>
              </Pressable>

              {coachOpen?(
                <ScrollView
                  style={{
                    marginTop:10,
                    maxHeight:360,
                    borderRadius:18,
                    borderWidth:1,
                    borderColor:colors.line,
                    backgroundColor:colors.card
                  }}
                  contentContainerStyle={{
                    padding:14
                  }}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  <Text
                    style={{
                      color:colors.blue,
                      fontWeight:'900',
                      fontSize:12,
                      letterSpacing:.6
                    }}
                  >
                    ✦ ATLAS CONVERSATION COACH
                  </Text>

                  <Text
                    style={{
                      color:colors.muted,
                      fontSize:12,
                      marginTop:4,
                      marginBottom:12,
                      lineHeight:17
                    }}
                  >
                    Private suggestions — only you can see these.
                    Nothing is sent until you choose and send it yourself.
                  </Text>

                  {coachStatus?.available?(
                    coach?(
                      <View>
                        <Text
                          style={{
                            color:colors.text,
                            fontSize:13,
                            lineHeight:19,
                            fontWeight:'600',
                            marginBottom:5
                          }}
                        >
                          {coach.intro}
                        </Text>

                        {coach.starters.map((item,index)=>(
                          <Pressable
                            key={`${item.theme}-${index}`}
                            onPress={()=>useAtlasSuggestion(item.question)}
                            style={{
                              paddingVertical:11,
                              borderTopWidth:1,
                              borderTopColor:colors.line
                            }}
                          >
                            <Text
                              style={{
                                color:colors.blue,
                                fontSize:10,
                                fontWeight:'900',
                                marginBottom:2
                              }}
                            >
                              {item.basis==='discussion_point'
                                ?'WORTH EXPLORING'
                                :'SHARED THEME'}
                            </Text>

                            <Text
                              style={{
                                color:colors.muted,
                                fontSize:11,
                                fontWeight:'800',
                                marginBottom:4
                              }}
                            >
                              {item.theme}
                            </Text>

                            <Text
                              style={{
                                color:colors.text,
                                fontSize:14,
                                lineHeight:20,
                                fontWeight:'600'
                              }}
                            >
                              “{item.question}”
                            </Text>
                          </Pressable>
                        ))}

                        <Pressable
                          disabled={coachBusy}
                          onPress={()=>void generateAtlasCoach()}
                          style={{
                            alignSelf:'flex-start',
                            marginTop:10,
                            paddingVertical:5
                          }}
                        >
                          <Text
                            style={{
                              color:colors.blue,
                              fontWeight:'800',
                              fontSize:12,
                              opacity:coachBusy?.6:1
                            }}
                          >
                            {coachBusy
                              ?'Atlas is thinking…'
                              :'↻ Show me another set'}
                          </Text>
                        </Pressable>
                      </View>
                    ):(
                      <View>
                        <Pressable
                          onPress={()=>setCoachConsent(value=>!value)}
                          style={{
                            flexDirection:'row',
                            alignItems:'flex-start',
                            gap:10,
                            paddingVertical:6
                          }}
                        >
                          <View
                            style={{
                              width:20,
                              height:20,
                              borderRadius:5,
                              borderWidth:1,
                              borderColor:coachConsent
                                ?colors.blue
                                :colors.line,
                              backgroundColor:coachConsent
                                ?colors.blue
                                :'transparent',
                              alignItems:'center',
                              justifyContent:'center'
                            }}
                          >
                            {coachConsent?(
                              <Text
                                style={{
                                  color:'#fff',
                                  fontWeight:'900',
                                  fontSize:12
                                }}
                              >
                                ✓
                              </Text>
                            ):null}
                          </View>

                          <View style={{flex:1}}>
                            <Text
                              style={{
                                color:colors.text,
                                fontWeight:'800',
                                fontSize:13
                              }}
                            >
                              Generate personalised starters with Atlas AI
                            </Text>

                            <Text
                              style={{
                                color:colors.muted,
                                fontSize:11,
                                lineHeight:16,
                                marginTop:3
                              }}
                            >
                              Both members have opted in. Atlas uses your
                              relationship themes to create editable ideas.
                            </Text>
                          </View>
                        </Pressable>

                        <Pressable
                          disabled={!coachConsent||coachBusy}
                          onPress={()=>void generateAtlasCoach()}
                          style={{
                            marginTop:10,
                            paddingHorizontal:14,
                            paddingVertical:10,
                            borderRadius:18,
                            alignSelf:'flex-start',
                            backgroundColor:colors.blue,
                            opacity:!coachConsent||coachBusy?.5:1
                          }}
                        >
                          <Text
                            style={{
                              color:'#fff',
                              fontWeight:'900',
                              fontSize:12
                            }}
                          >
                            {coachBusy
                              ?'Atlas is thinking…'
                              :'Suggest conversation starters'}
                          </Text>
                        </Pressable>
                      </View>
                    )
                  ):coachStatus&&!coachStatus.enabled?(
                    <View>
                      <Text
                        style={{
                          color:colors.muted,
                          fontSize:12,
                          lineHeight:17,
                          marginBottom:8
                        }}
                      >
                        Atlas AI is currently unavailable. Here are some
                        private conversation ideas instead.
                      </Text>

                      {atlasSuggestions.map(item=>(
                        <Pressable
                          key={`${item.label}-${item.text}`}
                          onPress={()=>useAtlasSuggestion(item.text)}
                          style={{
                            paddingVertical:11,
                            borderTopWidth:1,
                            borderTopColor:colors.line
                          }}
                        >
                          <Text
                            style={{
                              color:colors.blue,
                              fontSize:11,
                              fontWeight:'800',
                              marginBottom:4
                            }}
                          >
                            {item.label}
                          </Text>

                          <Text
                            style={{
                              color:colors.text,
                              fontSize:14,
                              lineHeight:20,
                              fontWeight:'600'
                            }}
                          >
                            “{item.text}”
                          </Text>
                        </Pressable>
                      ))}

                      <Pressable
                        onPress={()=>setCoachRound(round=>round+1)}
                        style={{
                          alignSelf:'flex-start',
                          marginTop:10,
                          paddingVertical:5
                        }}
                      >
                        <Text
                          style={{
                            color:colors.blue,
                            fontWeight:'800',
                            fontSize:12
                          }}
                        >
                          ↻ Refresh ideas
                        </Text>
                      </Pressable>
                    </View>
                  ):coachStatus&&!coachStatus.viewerOptIn?(
                    <Text
                      style={{
                        color:colors.muted,
                        fontSize:12,
                        lineHeight:17
                      }}
                    >
                      Enable optional AI Discovery in your Atlas Profile
                      for personalised Atlas conversation suggestions.
                    </Text>
                  ):coachStatus&&!coachStatus.otherOptIn?(
                    <View>
                      <Text
                        style={{
                          color:colors.muted,
                          fontSize:12,
                          lineHeight:17
                        }}
                      >
                        Personalised Atlas AI suggestions are unavailable
                        because {personName} has not opted in to AI Discovery.
                      </Text>


                    </View>
                  ):(
                    <View>
                      <Text
                        style={{
                          color:colors.muted,
                          fontSize:12,
                          lineHeight:17,
                          marginBottom:8
                        }}
                      >
                        Personalised Atlas AI is unavailable right now.
                        You can still use these private conversation ideas.
                      </Text>

                      {atlasSuggestions.map(item=>(
                        <Pressable
                          key={`${item.label}-${item.text}`}
                          onPress={()=>useAtlasSuggestion(item.text)}
                          style={{
                            paddingVertical:11,
                            borderTopWidth:1,
                            borderTopColor:colors.line
                          }}
                        >
                          <Text
                            style={{
                              color:colors.blue,
                              fontSize:11,
                              fontWeight:'800',
                              marginBottom:4
                            }}
                          >
                            {item.label}
                          </Text>

                          <Text
                            style={{
                              color:colors.text,
                              fontSize:14,
                              lineHeight:20,
                              fontWeight:'600'
                            }}
                          >
                            “{item.text}”
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {coachError?(
                    <Text
                      style={{
                        color:colors.rose,
                        fontSize:12,
                        lineHeight:17,
                        marginTop:10
                      }}
                    >
                      {coachError}
                    </Text>
                  ):null}
                </ScrollView>
              ):null}
            </View>

            {!data?.messaging.unlimited&&
             data?.messaging.remaining!=null?(
              <Text
                style={[
                  s.allowance,
                  {color:colors.muted}
                ]}
              >
                {data.messaging.remaining} free messages remaining
              </Text>
            ):null}

            <View style={s.composer}>
              <Input
                style={s.input}
                value={value}
                onChangeText={setValue}
                onFocus={()=>{
                  setTimeout(
                    ()=>list.current?.scrollToEnd({animated:true}),
                    300
                  );
                }}
                placeholder="Write a message..."
                multiline
                maxLength={1000}
              />

              <View style={s.send}>
                <Button
                  title={sending?'Sending...':'Send'}
                  disabled={sending||!value.trim()}
                  onPress={()=>void send()}
                />
              </View>
            </View>

            <Text
              style={[
                s.counter,
                {
                  color:value.length>900
                    ?colors.rose
                    :colors.muted
                }
              ]}
            >
              {value.length}/1000
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s=StyleSheet.create({
  flex:{
    flex:1,
    gap:8
  },
  back:{
    fontSize:15,
    fontWeight:'800'
  },
  connectionCard:{
    borderWidth:1,
    borderRadius:18,
    padding:12,
    gap:10
  },
  person:{
    flexDirection:'row',
    alignItems:'center',
    gap:12
  },
  avatar:{
    width:58,
    height:58,
    borderRadius:29
  },
  avatarFallback:{
    width:58,
    height:58,
    borderRadius:29,
    alignItems:'center',
    justifyContent:'center'
  },
  avatarInitial:{
    fontSize:24,
    fontWeight:'800'
  },
  verifiedDot:{
    position:'absolute',
    right:-1,
    bottom:-1,
    width:20,
    height:20,
    borderRadius:10,
    borderWidth:2,
    alignItems:'center',
    justifyContent:'center'
  },
  verifiedDotText:{
    color:'#fff',
    fontSize:10,
    fontWeight:'900'
  },
  personCopy:{
    flex:1,
    gap:2
  },
  nameRow:{
    flexDirection:'row',
    alignItems:'center',
    gap:5
  },
  personName:{
    fontSize:18,
    fontWeight:'800'
  },
  blueCheck:{
    fontSize:16,
    fontWeight:'900'
  },
  personDetail:{
    fontSize:12
  },
  privateLabel:{
    fontSize:11
  },
  verifiedText:{
    fontSize:11,
    fontWeight:'800',
    marginTop:1
  },
  divider:{
    height:1
  },
  trust:{
    flexDirection:'row',
    alignItems:'center',
    gap:22
  },
  trustItem:{
    minWidth:58
  },
  trustValue:{
    fontSize:18,
    fontWeight:'800'
  },
  small:{
    fontSize:11
  },
  entitlement:{
    marginLeft:'auto'
  },
  chatStatus:{
    borderRadius:999,
    paddingVertical:7,
    paddingHorizontal:10
  },
  chatStatusText:{
    fontSize:11,
    fontWeight:'800'
  },
  errorBox:{
    borderWidth:1,
    borderRadius:12,
    padding:10,
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    gap:10
  },
  error:{
    fontSize:13,
    lineHeight:18,
    flex:1
  },
  list:{
    paddingTop:8,
    paddingBottom:20,
    gap:5,
    flexGrow:1
  },
  empty:{
    paddingVertical:24,
    gap:14
  },
  newConversation:{
    borderWidth:1,
    borderRadius:16,
    padding:14,
    gap:4
  },
  newConversationTitle:{
    fontSize:16,
    fontWeight:'800'
  },
  quickTitle:{
    fontSize:12,
    fontWeight:'800'
  },
  quickWrap:{
    gap:8
  },
  quick:{
    borderWidth:1,
    borderRadius:999,
    paddingVertical:9,
    paddingHorizontal:13,
    alignSelf:'flex-start'
  },
  day:{
    alignItems:'center',
    marginVertical:8
  },
  dayText:{
    fontSize:11,
    fontWeight:'700',
    paddingHorizontal:8
  },
  messageRow:{
    flexDirection:'row'
  },
  mine:{
    justifyContent:'flex-end'
  },
  theirs:{
    justifyContent:'flex-start'
  },
  bubble:{
    maxWidth:'82%',
    borderWidth:1,
    borderRadius:18,
    paddingHorizontal:14,
    paddingVertical:10
  },
  message:{
    fontSize:16,
    lineHeight:21
  },
  meta:{
    flexDirection:'row',
    justifyContent:'flex-end',
    gap:7,
    marginTop:4
  },
  time:{
    fontSize:10
  },
  composerShell:{
    borderTopWidth:1,
    paddingTop:8
  },
  composer:{
    flexDirection:'row',
    gap:8,
    alignItems:'flex-end'
  },
  input:{
    flex:1,
    minHeight:48,
    maxHeight:110
  },
  send:{
    width:88
  },
  counter:{
    fontSize:10,
    textAlign:'right',
    marginTop:2,
    marginRight:96
  },
  allowance:{
    fontSize:11,
    fontWeight:'700',
    marginBottom:6
  },
  locked:{
    borderWidth:1,
    borderRadius:14,
    padding:12,
    gap:2
  },
  lockedTitle:{
    fontSize:14,
    fontWeight:'800'
  }
});
