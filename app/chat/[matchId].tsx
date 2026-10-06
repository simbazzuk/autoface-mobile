import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
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

type RelationshipInsightDimension={
  code:string;
  label:string;
  score:number;
  explanation:string;
};

type RelationshipInsight={
  available:boolean;
  compatibilityScore?:number;
  compatibilityLevel?:string;
  strongestAlignments?:string[];
  conversationPoints?:string[];
  dimensions?:RelationshipInsightDimension[];
  confidence?:string;
  confidenceScore?:number;
  summary?:string;
  notice?:string;
};

type Conversation={
  matchId:string;
  other:Other;
  messages:Message[];
  messaging:Messaging;
  relationshipInsight?:RelationshipInsight;
};

type AtlasCoachStatus={
  enabled:boolean;
  viewerOptIn:boolean;
  otherOptIn:boolean;
  available:boolean;
  usage?:{
    conversationCoach:AtlasUsage;
    replyCoach:AtlasUsage;
  };
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
  usage?:AtlasUsage;
  persisted?:boolean;
  notice?:string;
};

type AtlasUsage={
  feature:'atlasConversationCoach'|'atlasReplyCoach';
  limit:number;
  used:number;
  remaining:number;
  period:string;
};

type AtlasReplyTone='natural'|'curious'|'playful';

type AtlasReplySuggestion={
  tone:AtlasReplyTone;
  text:string;
};

type AtlasReplyCoachResult={
  intro:string;
  replies:AtlasReplySuggestion[];
};

type AtlasReplyCoachResponse={
  coach:AtlasReplyCoachResult;
  usage?:AtlasUsage;
  persisted?:boolean;
  contextMessages?:number;
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
  const [journeyOpen,setJourneyOpen]=useState(false);

  const [conversationReflection,setConversationReflection]=useState<
    'comfortable'|'interesting'|'unsure'|'not_for_me'|null
  >(null);

  const [reflectionBusy,setReflectionBusy]=useState(false);

  const [coachStatus,setCoachStatus]=useState<AtlasCoachStatus|null>(null);
  const [coach,setCoach]=useState<AtlasCoachResult|null>(null);
  const [coachBusy,setCoachBusy]=useState(false);
  const [coachConsent,setCoachConsent]=useState(false);
  const [coachError,setCoachError]=useState('');

  const [atlasMode,setAtlasMode]=useState<'starters'|'reply'>('starters');
  const [replyCoach,setReplyCoach]=useState<AtlasReplyCoachResult|null>(null);
  const [replyCoachBusy,setReplyCoachBusy]=useState(false);
  const [replyCoachError,setReplyCoachError]=useState('');
  const [starterUsage,setStarterUsage]=useState<AtlasUsage|null>(null);
  const [replyUsage,setReplyUsage]=useState<AtlasUsage|null>(null);

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

  async function saveConversationReflection(
    reflection:'comfortable'|'interesting'|'unsure'|'not_for_me'
  ){
    if(!matchId||reflectionBusy)return;

    const previous=conversationReflection;

    setConversationReflection(reflection);
    setReflectionBusy(true);

    try{
      await api('/api/conversation-reflection',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          matchId,
          reflection
        })
      });
    }catch{
      setConversationReflection(previous);
    }finally{
      setReflectionBusy(false);
    }
  }

  useEffect(()=>{
    if(!matchId)return;

    let cancelled=false;

    void api<{reflection:
      |'comfortable'
      |'interesting'
      |'unsure'
      |'not_for_me'
      |null
    }>(
      `/api/conversation-reflection?matchId=${encodeURIComponent(matchId)}`
    )
      .then(result=>{
        if(!cancelled){
          setConversationReflection(result.reflection);
        }
      })
      .catch(()=>{
        // Reflection is optional; conversation remains usable.
      });

    return()=>{
      cancelled=true;
    };
  },[matchId]);

  const connectionJourney=useMemo(()=>{
    const realMessages=messages.filter(
      message=>!message.pending&&!message.failed
    );

    const myUid=user?.uid??'';

    const myMessages=realMessages.filter(
      message=>message.senderUid===myUid
    ).length;

    const theirMessages=realMessages.filter(
      message=>message.senderUid!==myUid
    ).length;

    const bothParticipated=myMessages>0&&theirMessages>0;

    const sustained=
      realMessages.length>=6 &&
      myMessages>=2 &&
      theirMessages>=2;

    const stage=
      sustained
        ?3
        :bothParticipated
          ?2
          :realMessages.length>0
            ?1
            :0;

    const suggestion=
      stage===0
        ?`Start when you're ready. Atlas can help you find an easy opening with ${data?.other.firstName?.trim()||'your connection'}.`
        :stage===1
          ?myMessages>0&&theirMessages===0
            ?'You have opened the conversation. Give them space to reply when they are ready.'
            :'The conversation has started. Reply naturally when you are ready.'
          :stage===2
            ?'You are both taking part. Explore something you genuinely enjoy talking about.'
            :'You have a longer two-way conversation going. Atlas can help you explore it without forcing the pace.';

    const momentum=
      realMessages.length===0
        ?{
            label:'Ready to start',
            detail:'Your private conversation is ready when you are.'
          }
        :myMessages>0&&theirMessages===0
          ?{
              label:'Waiting for a reply',
              detail:'You have made the first move. Give them space to respond when they are ready.'
            }
          :myMessages===0&&theirMessages>0
            ?{
                label:'Your turn',
                detail:`${data?.other.firstName?.trim()||'Your connection'} has started the conversation. Reply when you are ready.`
              }
            :sustained
              ?{
                  label:'Conversation flowing',
                  detail:'You are both contributing to a longer two-way conversation.'
                }
              :{
                  label:'Two-way conversation',
                  detail:'Both of you are contributing to the conversation.'
                };

    const nextStep=
      realMessages.length===0
        ?{
            title:'Start the conversation',
            detail:'Atlas can help you find a natural way to begin.',
            action:'starters' as const
          }
        :myMessages>0&&theirMessages===0
          ?{
              title:'Give them space',
              detail:"You've already made the first move. There's nothing you need to send right now.",
              action:'none' as const
            }
          :myMessages===0&&theirMessages>0
            ?{
                title:'Reply naturally',
                detail:`${data?.other.firstName?.trim()||'Your connection'} has opened the conversation. Atlas can help you shape a reply in your own voice.`,
                action:'reply' as const
              }
            :conversationReflection==='not_for_me'
              ?{
                  title:'Trust how you feel',
                  detail:"You don't need to continue a conversation that doesn't feel right for you.",
                  action:'none' as const
                }
              :conversationReflection==='unsure'
                ?{
                    title:'Keep it light',
                    detail:'There is no need to decide anything yet. Keep the conversation comfortable and at your own pace.',
                    action:'starters' as const
                  }
                :conversationReflection==='interesting'
                  ?{
                      title:'Explore what interests you',
                      detail:'You marked this conversation as interesting. Atlas can help you explore a genuine topic a little further.',
                      action:'starters' as const
                    }
                  :conversationReflection==='comfortable'
                    ?{
                        title:'Continue naturally',
                        detail:'You marked this conversation as comfortable. Keep following the conversation at a pace that feels natural.',
                        action:'starters' as const
                      }
                    :sustained
                      ?{
                          title:'Go a little deeper',
                          detail:'You have an active two-way conversation. Atlas can suggest a thoughtful way to keep exploring it.',
                          action:'starters' as const
                        }
                      :{
                          title:'Explore common ground',
                          detail:'You are both participating. Atlas can suggest something natural to explore next.',
                          action:'starters' as const
                        };

    return{
      stage,
      suggestion,
      momentum,
      nextStep,
      bothParticipated,
      steps:[
        'Connected',
        'Conversation started',
        'Getting to know each other',
        'Building the conversation'
      ]
    };
  },[
    messages,
    user?.uid,
    data?.other.firstName,
    conversationReflection
  ]);

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
        if(!active)return;

        console.log('[Atlas status]', JSON.stringify(status));
        setCoachStatus(status);

        if(status.usage){
          setStarterUsage(status.usage.conversationCoach);
          setReplyUsage(status.usage.replyCoach);
        }
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

  function openAtlasNextStep(){
    const action=connectionJourney.nextStep.action;

    if(action==='none')return;

    // iOS should not present the Atlas modal while the Journey
    // modal is still being dismissed.
    setJourneyOpen(false);

    setTimeout(()=>{
      setAtlasMode(action);
      setCoachOpen(true);
    },350);
  }

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
      if(response.usage)setStarterUsage(response.usage);
    }catch(e){
      const raw=e instanceof Error
        ?e.message
        :'Unable to generate conversation starters.';

      if(raw==='ATLAS_DAILY_LIMIT_REACHED'){
        setStarterUsage(current=>current
          ?{...current,used:current.limit,remaining:0}
          :null
        );
      }

      setCoachError(
        raw==='ATLAS_DAILY_LIMIT_REACHED'
          ?'You have used today’s Atlas conversation allowance.'
          :raw==='ATLAS_AI_TIMEOUT'||/operation was aborted/i.test(raw)
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

  async function generateAtlasReplyCoach(){
    if(!matchId||!coachConsent||replyCoachBusy)return;

    try{
      setReplyCoachBusy(true);
      setReplyCoachError('');

      const response=await api<AtlasReplyCoachResponse>(
        '/api/atlas-ai/reply-coach',
        {
          method:'POST',
          body:JSON.stringify({
            matchId,
            consent:true
          })
        }
      );

      if(!response.coach?.replies?.length){
        throw new Error('ATLAS_AI_INVALID_REPLIES');
      }

      setReplyCoach(response.coach);
      if(response.usage)setReplyUsage(response.usage);
    }catch(e){
      const raw=e instanceof Error
        ?e.message
        :'Unable to generate reply suggestions.';

      if(raw==='ATLAS_DAILY_LIMIT_REACHED'){
        setReplyUsage(current=>current
          ?{...current,used:current.limit,remaining:0}
          :null
        );
      }

      setReplyCoachError(
        raw==='ATLAS_DAILY_LIMIT_REACHED'
          ?'You have used today’s Atlas reply allowance.'
          :raw==='ATLAS_AI_TIMEOUT'||/operation was aborted/i.test(raw)
          ?'Atlas is taking longer than expected. Please try again.'
          :raw.startsWith('ATLAS_AI_INVALID_')||
             raw==='ATLAS_AI_EMPTY_RESPONSE'
            ?'Atlas could not create valid reply suggestions. Please try again.'
            :raw==='ATLAS_REPLY_REQUIRES_MESSAGES'
              ?'Send or receive a message first, then Atlas can help you reply.'
              :raw==='BOTH_AI_OPT_INS_REQUIRED'
                ?'Atlas AI reply suggestions require both members to have AI Discovery enabled.'
                :raw==='AI_CONSENT_REQUIRED'
                  ?'Atlas needs your permission before generating reply suggestions.'
                  :raw
      );
    }finally{
      setReplyCoachBusy(false);
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

        {data?(
          <View
            style={[
              s.connectionJourneyCard,
              {
                borderColor:colors.blue,
                backgroundColor:colors.card
              }
            ]}
          >
            <View style={s.connectionJourneyHeader}>
              <View style={{flex:1}}>
                <Text
                  style={[
                    s.connectionJourneyEyebrow,
                    {color:colors.blue}
                  ]}
                >
                  YOUR CONNECTION
                </Text>

                <Text
                  style={[
                    s.connectionJourneyTitle,
                    {color:colors.text}
                  ]}
                >
                  Conversation journey
                </Text>
              </View>

              <Text
                style={[
                  s.connectionJourneyAtlas,
                  {color:colors.blue}
                ]}
              >
                ATLAS
              </Text>
            </View>

            <>
                <View style={s.connectionJourneyCompact}>
                  <View
                    style={[
                      s.connectionJourneyDot,
                      {
                        borderColor:colors.blue,
                        backgroundColor:colors.blue
                      }
                    ]}
                  >
                    <Text style={s.connectionJourneyCheck}>
                      ✓
                    </Text>
                  </View>

                  <View style={{flex:1}}>
                    <Text
                      style={[
                        s.connectionJourneyStepText,
                        {color:colors.text}
                      ]}
                      numberOfLines={2}
                    >
                      {connectionJourney.steps[connectionJourney.stage]}
                      <Text
                        style={{color:colors.muted,fontWeight:'600'}}
                      >
                        {' · '}{connectionJourney.momentum.label}
                      </Text>
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={()=>setJourneyOpen(true)}
                  hitSlop={8}
                  style={s.connectionJourneyToggle}
                >
                  <Text
                    style={[
                      s.connectionJourneyToggleText,
                      {color:colors.blue}
                    ]}
                  >
                    View journey ›
                  </Text>
                </Pressable>
              </>

              <Modal
                visible={journeyOpen}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={()=>setJourneyOpen(false)}
              >
                <SafeAreaView
                  style={{
                    flex:1,
                    backgroundColor:colors.bg
                  }}
                >
                  <View
                    style={{
                      flexDirection:'row',
                      alignItems:'center',
                      justifyContent:'space-between',
                      paddingHorizontal:20,
                      paddingTop:10,
                      paddingBottom:14,
                      borderBottomWidth:1,
                      borderBottomColor:colors.line
                    }}
                  >
                    <View style={{flex:1}}>
                      <Text
                        style={{
                          color:colors.blue,
                          fontSize:11,
                          fontWeight:'900',
                          letterSpacing:.8
                        }}
                      >
                        YOUR CONNECTION · ATLAS
                      </Text>

                      <Text
                        style={{
                          color:colors.text,
                          fontSize:22,
                          lineHeight:28,
                          fontWeight:'900',
                          marginTop:3
                        }}
                      >
                        Conversation journey
                      </Text>
                    </View>

                    <Pressable
                      onPress={()=>setJourneyOpen(false)}
                      hitSlop={10}
                      style={{
                        marginLeft:12,
                        borderWidth:1,
                        borderColor:colors.blue,
                        borderRadius:18,
                        paddingHorizontal:14,
                        paddingVertical:8
                      }}
                    >
                      <Text
                        style={{
                          color:colors.blue,
                          fontSize:12,
                          fontWeight:'900'
                        }}
                      >
                        ✕ Close
                      </Text>
                    </Pressable>
                  </View>

                  <ScrollView
                    style={{flex:1}}
                    contentContainerStyle={{
                      paddingHorizontal:20,
                      paddingTop:20,
                      paddingBottom:80
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                  >

                <View style={s.connectionJourneySteps}>
                  {connectionJourney.steps.map((step,index)=>{
                    const reached=index<=connectionJourney.stage;

                    return(
                      <View
                        key={step}
                        style={s.connectionJourneyStep}
                      >
                        <View
                          style={[
                            s.connectionJourneyDot,
                            {
                              borderColor:reached
                                ?colors.blue
                                :colors.line,
                              backgroundColor:reached
                                ?colors.blue
                                :'transparent'
                            }
                          ]}
                        >
                          {reached?(
                            <Text style={s.connectionJourneyCheck}>
                              ✓
                            </Text>
                          ):null}
                        </View>

                        <Text
                          style={[
                            s.connectionJourneyStepText,
                            {
                              color:reached
                                ?colors.text
                                :colors.muted
                            }
                          ]}
                        >
                          {step}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View
                  style={[
                    s.connectionMomentum,
                    {borderTopColor:colors.line}
                  ]}
                >
                  <Text
                    style={[
                      s.connectionMomentumLabel,
                      {color:colors.blue}
                    ]}
                  >
                    CONVERSATION MOMENTUM
                  </Text>

                  <Text
                    style={[
                      s.connectionMomentumValue,
                      {color:colors.text}
                    ]}
                  >
                    {connectionJourney.momentum.label}
                  </Text>

                  <Text
                    style={[
                      s.connectionMomentumDetail,
                      {color:colors.muted}
                    ]}
                  >
                    {connectionJourney.momentum.detail}
                  </Text>
                </View>

                {connectionJourney.bothParticipated?(
                  <View
                    style={[
                      s.conversationReflection,
                      {borderTopColor:colors.line}
                    ]}
                  >
                    <Text
                      style={[
                        s.conversationReflectionLabel,
                        {color:colors.blue}
                      ]}
                    >
                      CONVERSATION REFLECTION
                    </Text>

                    <Text
                      style={[
                        s.conversationReflectionTitle,
                        {color:colors.text}
                      ]}
                    >
                      How is this conversation feeling for you?
                    </Text>

                    <Text
                      style={[
                        s.conversationReflectionDetail,
                        {color:colors.muted}
                      ]}
                    >
                      Optional and private to you. Atlas does not infer this from your messages.
                    </Text>

                    <View style={s.conversationReflectionOptions}>
                      {[
                        ['comfortable','Comfortable'],
                        ['interesting','Interesting'],
                        ['unsure','Unsure'],
                        ['not_for_me','Not for me']
                      ].map(([value,label])=>{
                        const selected=
                          conversationReflection===value;

                        return(
                          <Pressable
                            key={value}
                            disabled={reflectionBusy}
                            onPress={()=>
                              void saveConversationReflection(
                                value as
                                  |'comfortable'
                                  |'interesting'
                                  |'unsure'
                                  |'not_for_me'
                              )
                            }
                            style={[
                              s.conversationReflectionOption,
                              {
                                borderColor:selected
                                  ?colors.blue
                                  :colors.line,
                                backgroundColor:selected
                                  ?colors.blue
                                  :colors.card,
                                opacity:reflectionBusy?.7:1
                              }
                            ]}
                          >
                            <Text
                              style={[
                                s.conversationReflectionOptionText,
                                {
                                  color:selected
                                    ?'#FFFFFF'
                                    :colors.text
                                }
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {conversationReflection?(
                      <Text
                        style={[
                          s.conversationReflectionSaved,
                          {color:colors.muted}
                        ]}
                      >
                        ✓ Reflection saved privately
                      </Text>
                    ):null}
                  </View>
                ):null}

                <View
                  style={[
                    s.atlasNextStep,
                    {
                      borderTopColor:colors.line
                    }
                  ]}
                >
                  <Text
                    style={[
                      s.atlasNextStepLabel,
                      {color:colors.blue}
                    ]}
                  >
                    ATLAS NEXT STEP
                  </Text>

                  <Text
                    style={[
                      s.atlasNextStepTitle,
                      {color:colors.text}
                    ]}
                  >
                    {connectionJourney.nextStep.title}
                  </Text>

                  <Text
                    style={[
                      s.atlasNextStepDetail,
                      {color:colors.muted}
                    ]}
                  >
                    {connectionJourney.nextStep.detail}
                  </Text>

                  {connectionJourney.nextStep.action!=='none'?(
                    <Pressable
                      onPress={openAtlasNextStep}
                      style={[
                        s.atlasNextStepButton,
                        {
                          borderColor:colors.blue,
                          backgroundColor:colors.blue
                        }
                      ]}
                    >
                      <Text style={s.atlasNextStepButtonText}>
                        ✦ Ask Atlas
                      </Text>
                    </Pressable>
                  ):(
                    <View
                      style={[
                        s.atlasNextStepNoAction,
                        {borderColor:colors.line}
                      ]}
                    >
                      <Text
                        style={[
                          s.atlasNextStepNoActionText,
                          {color:colors.muted}
                        ]}
                      >
                        No action needed
                      </Text>
                    </View>
                  )}
                </View>


                  </ScrollView>
                </SafeAreaView>
              </Modal>
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
                onPress={()=>setCoachOpen(true)}
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
                  ✦ Ask Atlas
                </Text>
              </Pressable>

              {coachOpen?(
                <Modal
                  visible={coachOpen}
                  animationType="slide"
                  presentationStyle="fullScreen"
                  onRequestClose={()=>setCoachOpen(false)}
                >
                  <SafeAreaView
                    style={{
                      flex:1,
                      backgroundColor:colors.bg
                    }}
                  >
                    <View
                      style={{
                        flexDirection:'row',
                        alignItems:'center',
                        justifyContent:'space-between',
                        paddingHorizontal:18,
                        paddingTop:10,
                        paddingBottom:12,
                        borderBottomWidth:1,
                        borderBottomColor:colors.line
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            color:colors.blue,
                            fontSize:11,
                            fontWeight:'900',
                            letterSpacing:.7
                          }}
                        >
                          ✦ ATLAS
                        </Text>

                        <Text
                          style={{
                            color:colors.text,
                            fontSize:20,
                            fontWeight:'900',
                            marginTop:2
                          }}
                        >
                          Conversation Coach
                        </Text>
                      </View>

                      <Pressable
                        onPress={()=>setCoachOpen(false)}
                        hitSlop={10}
                        style={{
                          borderWidth:1,
                          borderColor:colors.blue,
                          borderRadius:18,
                          paddingHorizontal:14,
                          paddingVertical:8
                        }}
                      >
                        <Text
                          style={{
                            color:colors.blue,
                            fontSize:12,
                            fontWeight:'900'
                          }}
                        >
                          ✕ Close
                        </Text>
                      </Pressable>
                    </View>

                    <ScrollView
                      style={{flex:1}}
                      contentContainerStyle={{
                        paddingHorizontal:18,
                        paddingTop:16,
                        paddingBottom:60
                      }}
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

                  {(
                    (atlasMode==='reply'&&replyUsage?.remaining===0)||
                    (atlasMode==='starters'&&starterUsage?.remaining===0)
                  )?(
                    <View
                      style={{
                        backgroundColor:colors.blue+'0D',
                        borderWidth:1,
                        borderColor:colors.blue+'55',
                        borderRadius:16,
                        padding:14,
                        marginBottom:12
                      }}
                    >
                      <Text
                        style={{
                          color:colors.blue,
                          fontSize:10,
                          fontWeight:'900',
                          letterSpacing:1,
                          marginBottom:6
                        }}
                      >
                        ✦ ATLAS DAILY LIMIT
                      </Text>

                      <Text
                        style={{
                          color:colors.ink,
                          fontSize:15,
                          fontWeight:'900',
                          marginBottom:5
                        }}
                      >
                        You've used today's Atlas suggestions
                      </Text>

                      <Text
                        style={{
                          color:colors.muted,
                          fontSize:12,
                          lineHeight:18,
                          marginBottom:12
                        }}
                      >
                        AutoFace Plus gives you 25 Conversation Coach and 25 Reply Coach suggestions each day.
                      </Text>

                      <Pressable
                        onPress={()=>{
                          setCoachOpen(false);
                          router.push('/membership' as any);
                        }}
                        style={{
                          alignSelf:'flex-start',
                          backgroundColor:colors.blue,
                          paddingHorizontal:14,
                          paddingVertical:10,
                          borderRadius:12
                        }}
                      >
                        <Text
                          style={{
                            color:'#FFFFFF',
                            fontSize:12,
                            fontWeight:'900'
                          }}
                        >
                          Explore AutoFace Plus
                        </Text>
                      </Pressable>
                    </View>
                  ):atlasMode==='reply'&&replyUsage?(
                    <View
                      style={{
                        alignSelf:'flex-start',
                        backgroundColor:colors.pink,
                        borderRadius:999,
                        paddingHorizontal:12,
                        paddingVertical:7,
                        marginBottom:12
                      }}
                    >
                      <Text
                        style={{
                          color:'#FFFFFF',
                          fontSize:11,
                          fontWeight:'900'
                        }}
                      >
                        {`${replyUsage.remaining} / ${replyUsage.limit} replies left today`}
                      </Text>
                    </View>
                  ):atlasMode==='starters'&&starterUsage?(
                    <View
                      style={{
                        alignSelf:'flex-start',
                        backgroundColor:colors.pink,
                        borderRadius:999,
                        paddingHorizontal:12,
                        paddingVertical:7,
                        marginBottom:12
                      }}
                    >
                      <Text
                        style={{
                          color:'#FFFFFF',
                          fontSize:11,
                          fontWeight:'900'
                        }}
                      >
                        {`${starterUsage.remaining} / ${starterUsage.limit} suggestions left today`}
                      </Text>
                    </View>
                  ):null}

                  {coachStatus?.available?(
                    <View
                      style={{
                        flexDirection:'row',
                        borderWidth:1,
                        borderColor:colors.line,
                        borderRadius:14,
                        padding:3,
                        marginBottom:12,
                        backgroundColor:colors.bg
                      }}
                    >
                      <Pressable
                        onPress={()=>setAtlasMode('starters')}
                        style={{
                          flex:1,
                          paddingVertical:9,
                          paddingHorizontal:8,
                          borderRadius:11,
                          backgroundColor:atlasMode==='starters'
                            ?colors.blue
                            :'transparent'
                        }}
                      >
                        <Text
                          style={{
                            textAlign:'center',
                            color:atlasMode==='starters'
                              ?'#fff'
                              :colors.muted,
                            fontSize:11,
                            fontWeight:'800'
                          }}
                        >
                          Start conversation
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={()=>setAtlasMode('reply')}
                        style={{
                          flex:1,
                          paddingVertical:9,
                          paddingHorizontal:8,
                          borderRadius:11,
                          backgroundColor:atlasMode==='reply'
                            ?colors.blue
                            :'transparent'
                        }}
                      >
                        <Text
                          style={{
                            textAlign:'center',
                            color:atlasMode==='reply'
                              ?'#fff'
                              :colors.muted,
                            fontSize:11,
                            fontWeight:'800'
                          }}
                        >
                          Help me reply
                        </Text>
                      </Pressable>
                    </View>
                  ):null}

                  {coachStatus?.available&&atlasMode==='reply'?(
                    <View>
                      {replyCoach?(
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
                            {replyCoach.intro}
                          </Text>

                          {replyCoach.replies.map((item,index)=>(
                            <Pressable
                              key={`${item.tone}-${index}`}
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
                                  fontSize:10,
                                  fontWeight:'900',
                                  marginBottom:4,
                                  letterSpacing:.5
                                }}
                              >
                                {item.tone.toUpperCase()}
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
                            disabled={replyCoachBusy||replyUsage?.remaining===0}
                            onPress={()=>void generateAtlasReplyCoach()}
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
                                opacity:replyCoachBusy?.6:1
                              }}
                            >
                              {replyCoachBusy
                                ?'Atlas is thinking…'
                                :'↻ Show me another set'}
                            </Text>
                          </Pressable>
                        </View>
                      ):(
                        <View>
                          <Text
                            style={{
                              color:colors.muted,
                              fontSize:12,
                              lineHeight:17,
                              marginBottom:10
                            }}
                          >
                            Atlas can use the latest messages in this
                            conversation to suggest three editable replies.
                          </Text>

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
                                Generate personalised replies with Atlas AI
                              </Text>

                              <Text
                                style={{
                                  color:colors.muted,
                                  fontSize:11,
                                  lineHeight:16,
                                  marginTop:3
                                }}
                              >
                                Atlas uses up to the latest 10 messages to
                                create private, editable suggestions.
                              </Text>
                            </View>
                          </Pressable>

                          <Pressable
                            disabled={!coachConsent||replyCoachBusy||replyUsage?.remaining===0}
                            onPress={()=>void generateAtlasReplyCoach()}
                            style={{
                              marginTop:10,
                              paddingHorizontal:14,
                              paddingVertical:10,
                              borderRadius:18,
                              alignSelf:'flex-start',
                              backgroundColor:colors.blue,
                              opacity:!coachConsent||replyCoachBusy?.5:1
                            }}
                          >
                            <Text
                              style={{
                                color:'#fff',
                                fontWeight:'900',
                                fontSize:12
                              }}
                            >
                              {replyCoachBusy
                                ?'Atlas is thinking…'
                                :'Suggest replies'}
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      {replyCoachError?(
                        <Text
                          style={{
                            color:colors.rose,
                            fontSize:12,
                            lineHeight:17,
                            marginTop:10
                          }}
                        >
                          {replyCoachError}
                        </Text>
                      ):null}
                    </View>
                  ):null}

                  {coachStatus?.available&&atlasMode==='starters'?(
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
                  </SafeAreaView>
                </Modal>
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
  connectionJourneyCard:{
    borderWidth:1,
    borderRadius:14,
    paddingHorizontal:12,
    paddingVertical:10,
    marginTop:8,
    marginBottom:8
  },
  connectionJourneyHeader:{
    flexDirection:'row',
    alignItems:'flex-start',
    justifyContent:'space-between',
    gap:12
  },
  connectionJourneyEyebrow:{
    fontSize:11,
    lineHeight:14,
    fontWeight:'900',
    letterSpacing:.8
  },
  connectionJourneyTitle:{
    marginTop:2,
    fontSize:15,
    lineHeight:19,
    fontWeight:'900'
  },
  connectionJourneyAtlas:{
    fontSize:11,
    lineHeight:14,
    fontWeight:'900',
    letterSpacing:.8
  },
  connectionJourneyCompact:{
    marginTop:7,
    flexDirection:'row',
    alignItems:'center',
    gap:8
  },
  connectionJourneyCompactMomentum:{
    marginTop:2,
    fontSize:12,
    lineHeight:17,
    fontWeight:'600'
  },
  connectionJourneyToggle:{
    alignSelf:'flex-end',
    marginTop:4,
    paddingVertical:1
  },
  connectionJourneyToggleText:{
    fontSize:12,
    lineHeight:17,
    fontWeight:'900'
  },
  connectionJourneySteps:{
    marginTop:14,
    gap:9
  },
  connectionJourneyStep:{
    flexDirection:'row',
    alignItems:'center',
    gap:9
  },
  connectionJourneyDot:{
    width:20,
    height:20,
    borderRadius:10,
    borderWidth:1.5,
    alignItems:'center',
    justifyContent:'center'
  },
  connectionJourneyCheck:{
    color:'#FFFFFF',
    fontSize:11,
    lineHeight:14,
    fontWeight:'900'
  },
  connectionJourneyStepText:{
    flex:1,
    fontSize:13,
    lineHeight:18,
    fontWeight:'700'
  },
  connectionMomentum:{
    marginTop:15,
    paddingTop:14,
    borderTopWidth:1
  },
  connectionMomentumLabel:{
    fontSize:10,
    lineHeight:13,
    fontWeight:'900',
    letterSpacing:.7
  },
  connectionMomentumValue:{
    marginTop:5,
    fontSize:15,
    lineHeight:20,
    fontWeight:'900'
  },
  connectionMomentumDetail:{
    marginTop:3,
    fontSize:12,
    lineHeight:18,
    fontWeight:'600'
  },
  conversationReflection:{
    marginTop:15,
    paddingTop:14,
    borderTopWidth:1
  },
  conversationReflectionLabel:{
    fontSize:10,
    lineHeight:13,
    fontWeight:'900',
    letterSpacing:.7
  },
  conversationReflectionTitle:{
    marginTop:5,
    fontSize:15,
    lineHeight:20,
    fontWeight:'900'
  },
  conversationReflectionDetail:{
    marginTop:3,
    fontSize:11,
    lineHeight:16,
    fontWeight:'600'
  },
  conversationReflectionOptions:{
    flexDirection:'row',
    flexWrap:'wrap',
    gap:8,
    marginTop:11
  },
  conversationReflectionOption:{
    borderWidth:1,
    borderRadius:999,
    paddingHorizontal:12,
    paddingVertical:8
  },
  conversationReflectionOptionText:{
    fontSize:11,
    lineHeight:15,
    fontWeight:'800'
  },
  conversationReflectionSaved:{
    marginTop:9,
    fontSize:10,
    lineHeight:14,
    fontWeight:'700'
  },
  atlasNextStep:{
    marginTop:15,
    paddingTop:14,
    borderTopWidth:1
  },
  atlasNextStepLabel:{
    fontSize:10,
    lineHeight:13,
    fontWeight:'900',
    letterSpacing:.7
  },
  atlasNextStepTitle:{
    marginTop:5,
    fontSize:15,
    lineHeight:20,
    fontWeight:'900'
  },
  atlasNextStepDetail:{
    marginTop:3,
    fontSize:12,
    lineHeight:18,
    fontWeight:'600'
  },
  atlasNextStepButton:{
    alignSelf:'flex-start',
    marginTop:10,
    borderWidth:1,
    borderRadius:14,
    paddingHorizontal:14,
    paddingVertical:9
  },
  atlasNextStepButtonText:{
    color:'#FFFFFF',
    fontSize:12,
    lineHeight:16,
    fontWeight:'900'
  },
  atlasNextStepNoAction:{
    alignSelf:'flex-start',
    marginTop:10,
    borderWidth:1,
    borderRadius:14,
    paddingHorizontal:12,
    paddingVertical:8
  },
  atlasNextStepNoActionText:{
    fontSize:11,
    lineHeight:15,
    fontWeight:'800'
  },
  connectionJourneySuggestion:{
    marginTop:15,
    borderRadius:14,
    padding:12
  },
  connectionJourneySuggestionLabel:{
    fontSize:10,
    lineHeight:13,
    fontWeight:'900',
    letterSpacing:.7
  },
  connectionJourneySuggestionText:{
    marginTop:5,
    fontSize:13,
    lineHeight:19,
    fontWeight:'600'
  },
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
    paddingTop:16,
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
