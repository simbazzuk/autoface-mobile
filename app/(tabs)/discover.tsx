import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {api,profilePhoto} from '@/src/lib/api';
import {Body,Button,Card,H2,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';
import {auth} from '@/src/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AtlasDailyThought={
  thought:string;
  today:string;
};

const ATLAS_DAILY_THOUGHTS:AtlasDailyThought[]=[
  {
    thought:"Compatibility can start a connection. Curiosity is what helps it grow.",
    today:"Ask something you genuinely want to know."
  },
  {
    thought:"Being understood often begins with taking the time to understand.",
    today:"Listen for what someone means, not only what they say."
  },
  {
    thought:"The best connections don't require perfect people. They require honest ones.",
    today:"Let one conversation be a little more genuine."
  },
  {
    thought:"A meaningful connection grows through small moments of attention.",
    today:"Notice something worth asking about."
  },
  {
    thought:"You don't have to impress the right person. Give them the chance to know you.",
    today:"Share something real about yourself."
  },
  {
    thought:"Chemistry can catch your attention. Character is what keeps it.",
    today:"Be curious about the person behind the profile."
  },
  {
    thought:"Sometimes the most attractive thing you can bring to a conversation is presence.",
    today:"Give someone your full attention."
  },
  {
    thought:"Good relationships aren't discovered fully formed. They're built conversation by conversation.",
    today:"Start with one thoughtful question."
  },
  {
    thought:"A good connection leaves room for two people to be themselves.",
    today:"Notice whether you feel comfortable being yourself."
  },
  {
    thought:"Listening is more than waiting for your turn to speak.",
    today:"Ask one follow-up question before changing the subject."
  },
  {
    thought:"The strongest first impression may simply be making someone feel heard.",
    today:"Listen for the detail they hoped you would notice."
  },
  {
    thought:"You can be interested in someone without rushing to decide where it will lead.",
    today:"Let curiosity come before conclusions."
  },
  {
    thought:"Confidence doesn't need to be loud. Sometimes it's simply being comfortable with who you are.",
    today:"Bring your real personality into the conversation."
  },
  {
    thought:"A boundary isn't a wall. It's a way of showing someone how to meet you well.",
    today:"Be clear about something that matters to you."
  },
  {
    thought:"A connection becomes meaningful when both people have room to contribute.",
    today:"Make space for their story as well as your own."
  },
  {
    thought:"The right pace is the one where both people still feel comfortable.",
    today:"Don't mistake urgency for connection."
  },
  {
    thought:"Kindness is easy to overlook because it rarely asks to be noticed.",
    today:"Pay attention to how someone treats other people."
  },
  {
    thought:"Shared interests give you something to talk about. Shared values can give you something to build on.",
    today:"Ask about something that genuinely matters to them."
  },
  {
    thought:"A thoughtful question can reveal more than a perfect opening line.",
    today:"Ask about a story, not just a fact."
  },
  {
    thought:"Not every good conversation needs to become a relationship to have been worthwhile.",
    today:"Enjoy discovering someone without forcing an outcome."
  },
  {
    thought:"Attraction may be immediate. Trust usually takes its time.",
    today:"Let consistency tell you what chemistry cannot."
  },
  {
    thought:"Someone showing interest in your world is often more meaningful than someone trying to impress you with theirs.",
    today:"Notice where curiosity flows both ways."
  },
  {
    thought:"Vulnerability isn't telling someone everything. It's allowing them to see something real.",
    today:"Share one thing that matters to you."
  },
  {
    thought:"Good communication isn't about always agreeing. It's about feeling safe enough to disagree.",
    today:"Be curious when you encounter a different point of view."
  },
  {
    thought:"Sometimes compatibility is found in similarities. Sometimes it's found in how differences are handled.",
    today:"Notice how a difference makes you feel."
  },
  {
    thought:"The person worth knowing may not be the person with the perfect profile.",
    today:"Leave a little room for surprise."
  },
  {
    thought:"You learn a lot about someone from what they make time for.",
    today:"Notice what seems genuinely important to them."
  },
  {
    thought:"Healthy interest feels like an invitation, not an obligation.",
    today:"Choose connection without abandoning your own pace."
  },
  {
    thought:"There is confidence in saying what you mean with kindness.",
    today:"Be clear rather than trying to say the perfect thing."
  },
  {
    thought:"A relationship isn't only about finding someone interesting. It's about becoming interested in each other's lives.",
    today:"Ask about something they care about."
  },
  {
    thought:"Silence doesn't always need filling. Comfort can live there too.",
    today:"Don't rush every pause."
  },
  {
    thought:"Someone can look right on paper and still not feel right in conversation. Both kinds of information matter.",
    today:"Pay attention to how the interaction actually feels."
  },
  {
    thought:"A small act of consistency can say more than a large promise.",
    today:"Notice actions as much as words."
  },
  {
    thought:"The goal isn't to be liked by everyone. It's to be known by someone compatible with the real you.",
    today:"Choose authenticity over performance."
  },
  {
    thought:"A good conversation doesn't need an impressive destination. Sometimes wandering is the interesting part.",
    today:"Follow the question that makes you both curious."
  },
  {
    thought:"Connection grows differently for everyone. Comparison can make you rush something that deserves time.",
    today:"Let your own experience set the pace."
  },
  {
    thought:"Two people can see the world differently and still make each other feel understood.",
    today:"Explore a difference instead of trying to resolve it."
  },
  {
    thought:"Some connections arrive loudly. Others become important quietly.",
    today:"Don't overlook the conversation that simply feels easy."
  },
  {
    thought:"Between hello and knowing, there are a thousand small moments where trust can grow.",
    today:"Make one of those moments kind."
  },
  {
    thought:"You don't need to know where a connection is going to appreciate where it is today.",
    today:"Stay present for the conversation you're actually having."
  }
];

function atlasDailyDateKey(){
  const now=new Date();
  return [
    now.getFullYear(),
    String(now.getMonth()+1).padStart(2,'0'),
    String(now.getDate()).padStart(2,'0')
  ].join('-');
}

function atlasDailyThought(){
  const now=new Date();
  const start=new Date(now.getFullYear(),0,0);
  const day=Math.floor(
    (now.getTime()-start.getTime())/86400000
  );

  return ATLAS_DAILY_THOUGHTS[
    day%ATLAS_DAILY_THOUGHTS.length
  ];
}

type Candidate={
  uid:string;
  firstName:string;
  age?:number|null;
  generalLocation?:string|null;
  occupation?:string|null;
  hobbies?:string[];
  aboutMe?:string;
  authenticityScore?:number;
  authenticityLevel?:string;
  faceVerified?:boolean;
  compatibilityScore?:number;
  compatibilityLevel?:string;
  strongestAlignments?:string[];
  conversationPoints?:string[];
};

type ReadinessStep={
  id:string;
  title:string;
  shortTitle:string;
  description:string;
  complete:boolean;
  href:string;
  optional:boolean;
};

type ReadinessResponse={
  firstName:string;
  faceVerified:boolean;
  livenessVerified:boolean;
  photoVerified:boolean;
  profileCompleteness:number;
  atlasCompleteness:number;
  steps:ReadinessStep[];
  completed:number;
  total:number;
  setupPercent:number;
  readyForDiscovery:boolean;
  discoveryEnabled:boolean;
};

type D={
  eligible:boolean;
  candidates:Candidate[];
};

type InterestResponse={
  ok:boolean;
  matched:boolean;
  matchId?:string|null;
};

type MatchMoment={
  candidate:Candidate;
  matchId:string;
};

type AtlasPattern={
  reason:
    |'shared_values'
    |'relationship_goals'
    |'lifestyle_alignment'
    |'shared_interests'
    |'profile_stood_out';
  label:string;
  count:number;
  actionable:boolean;
  preferenceKey:'shared_interests'|null;
};

type AtlasPatternsResponse={
  available:boolean;
  evidenceRequired:number;
  patterns:AtlasPattern[];
};

type DiscoveryDecision='interested'|'saved'|'pass';

type DiscoveryFeedbackMoment={
  candidateUid:string;
  firstName:string;
  decision:DiscoveryDecision;
};

type DiscoveryFeedbackResponse={
  ok:boolean;
  saved:boolean;
  usedForPersonalisation:boolean;
};

type AtlasDiscoveryTheme={
  theme:string;
  strength?:'strong'|'moderate';
  explanation:string;
};

type AtlasDiscoveryInsight={
  headline:string;
  summary:string;
  sharedThemes:AtlasDiscoveryTheme[];
  discussionPoints:Array<{
    theme:string;
    explanation:string;
  }>;
};

type AtlasDiscoveryResponse={
  insight:AtlasDiscoveryInsight;
  source:string;
  officialCompatibilityScore:number;
  persisted:boolean;
  notice?:string;
};

type SharedInterestImportance=
  |'doesnt_matter'
  |'preference'
  |'important';

type DiscoveryPreferences={
  uid:string;
  minAge:number;
  maxAge:number;
  locationPreference:'anywhere_uk'|'same_general_area';
  relationshipIntents:string[];
  requireRelocationOpen:boolean;
  professionPreferenceMode:string;
  preferredProfessionAreas:string[];
  educationPreference:string;
  preferredHeightMinCm:number|null;
  preferredHeightMaxCm:number|null;
  heightPreferenceImportance:string;
  introductionLocation:string;
  sharedInterestPreference:SharedInterestImportance;
  preferredSharedInterests:string[];
};

type DiscoveryPreferencesResponse={
  preferences:DiscoveryPreferences;
  membership:{
    entitlements?:{
      advancedIntroductionPreferences?:boolean;
    };
  };
};

type AgeRange='all'|'25-34'|'35-44'|'45+';

function compatibilityCopy(score?:number){
  if(score==null)
    return 'Atlas has not produced a compatibility signal yet.';

  if(score>=80)
    return 'Strong compatibility signal from the relationship information currently available.';

  if(score>=60)
    return 'Positive compatibility signal with some areas worth exploring together.';

  return 'Some shared signals are present. Use the introduction to learn what the score cannot tell you.';
}

export default function Discover(){
  const [atlasDailyOpen,setAtlasDailyOpen]=useState(false);
  const dailyThought=useMemo(()=>atlasDailyThought(),[]);
  const [readiness,setReadiness]=useState<ReadinessResponse|null>(null);
  const [d,setD]=useState<D|null>(null);
  const [err,setErr]=useState('');
  const [busy,setBusy]=useState(false);

  const [ageRange,setAgeRange]=useState<AgeRange>('all');
  const [location,setLocation]=useState('');
  const [filtersOpen,setFiltersOpen]=useState(false);

  const [preferencesOpen,setPreferencesOpen]=useState(false);
  const [preferencesBusy,setPreferencesBusy]=useState(false);
  const [preferencesSaving,setPreferencesSaving]=useState(false);
  const [preferencesError,setPreferencesError]=useState('');
  const [advancedPreferences,setAdvancedPreferences]=useState(false);
  const [discoveryPreferences,setDiscoveryPreferences]=
    useState<DiscoveryPreferences|null>(null);

  const [sharedInterestPreference,setSharedInterestPreference]=
    useState<SharedInterestImportance>('doesnt_matter');

  const [preferredSharedInterests,setPreferredSharedInterests]=
    useState<string[]>([]);

  const [atlasPreferenceReason,setAtlasPreferenceReason]=
    useState<{label:string;count:number}|null>(null);

  const [whyOpen,setWhyOpen]=useState(false);
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [failedPhotos,setFailedPhotos]=useState<Record<string,boolean>>({});
  const [photoAuthToken,setPhotoAuthToken]=useState<string|null>(null);
  const [matchMoment,setMatchMoment]=useState<MatchMoment|null>(null);
  const [choiceMessage,setChoiceMessage]=useState('');
  const [actingUid,setActingUid]=useState<string|null>(null);

  const [feedbackMoment,setFeedbackMoment]=
    useState<DiscoveryFeedbackMoment|null>(null);

  const [feedbackReasons,setFeedbackReasons]=useState<string[]>([]);
  const [feedbackBusy,setFeedbackBusy]=useState(false);
  const [restoreBusy,setRestoreBusy]=useState(false);

  const [atlasPatterns,setAtlasPatterns]=useState<AtlasPattern[]>([]);
  const [patternBusy,setPatternBusy]=useState(false);

  const [atlasInsights,setAtlasInsights]=useState<
    Record<string,AtlasDiscoveryInsight>
  >({});
  const [atlasInsightBusy,setAtlasInsightBusy]=useState<string|null>(null);
  const [atlasInsightError,setAtlasInsightError]=useState<
    Record<string,string>
  >({});

  const {colors}=useAppTheme();

  useEffect(()=>{
    let active=true;
    const user=auth?.currentUser;

    if(!user){
      setPhotoAuthToken(null);
      return ()=>{active=false;};
    }

    void user.getIdToken()
      .then(token=>{
        if(active)setPhotoAuthToken(token);
      })
      .catch(error=>{
        if(active)setPhotoAuthToken(null);
      });

    return ()=>{active=false;};
  },[]);

  const load=useCallback(async()=>{
    try{
      setBusy(true);
      setErr('');
      const result=await api<D>('/api/discovery');
      setD(result);

      const readinessResult=await api<ReadinessResponse>('/api/readiness');
      setReadiness(readinessResult);
      void loadAtlasPatterns();
    }catch(e){
      setErr(e instanceof Error?e.message:'Unable to load Discovery');
    }finally{
      setBusy(false);
    }
  },[]);

  useFocusEffect(
    useCallback(()=>{
      void load();
    },[load])
  );

  function confirmEnterDiscovery(){
    Alert.alert(
      'Enter Discovery?',
      'Your profile will become available for private introductions based on your preferences. You can turn Discovery off again from your account settings.',
      [
        {
          text:'Not yet',
          style:'cancel'
        },
        {
          text:'Enter Discovery',
          onPress:()=>void enterDiscovery()
        }
      ]
    );
  }

  async function enterDiscovery(){
    try{
      setErr('');

      await api<{ok:boolean}>('/api/account',{
        method:'PATCH',
        body:JSON.stringify({
          discoveryEnabled:true
        })
      });

      await load();
    }catch(e){
      setErr(
        e instanceof Error
          ?e.message
          :'Unable to enter Discovery right now.'
      );
    }
  }

  async function act(uid:string,action:string){
    if(actingUid)return;

    const candidate=d?.candidates.find(c=>c.uid===uid);

    try{
      setErr('');
      setChoiceMessage('');
      setActingUid(uid);

      const result=await api<InterestResponse>('/api/interests',{
        method:'POST',
        body:JSON.stringify({
          toUid:uid,
          action
        })
      });

      setD(current=>
        current
          ?{
              ...current,
              candidates:current.candidates.filter(c=>c.uid!==uid)
            }
          :current
      );

      if(
        candidate &&
        ['interested','saved','pass'].includes(action)
      ){
        setFeedbackReasons([]);
        setFeedbackMoment({
          candidateUid:uid,
          firstName:candidate.firstName,
          decision:action as DiscoveryDecision
        });
      }

      if(action==='interested'){
        if(
          result.matched &&
          result.matchId &&
          candidate
        ){
          setMatchMoment({
            candidate,
            matchId:result.matchId
          });
        }else{
          setChoiceMessage(
            'Interest sent privately. You’ll only be introduced if the interest becomes mutual.'
          );
        }
      }else if(action==='saved'){
        setChoiceMessage('Saved privately for later.');
      }
    }catch(e){
      setErr(e instanceof Error?e.message:'Unable to save choice');
    }finally{
      setActingUid(null);
    }
  }

  function toggleFeedbackReason(reason:string){
    setFeedbackReasons(current=>{
      if(current.includes(reason)){
        return current.filter(item=>item!==reason);
      }

      if(current.length>=3){
        return current;
      }

      return [...current,reason];
    });
  }

  async function submitDiscoveryFeedback(){
    if(
      !feedbackMoment ||
      feedbackBusy ||
      feedbackReasons.length===0
    )return;

    try{
      setFeedbackBusy(true);

      await api<DiscoveryFeedbackResponse>(
        '/api/discovery-feedback',
        {
          method:'POST',
          body:JSON.stringify({
            candidateUid:feedbackMoment.candidateUid,
            decision:feedbackMoment.decision,
            reasons:feedbackReasons
          })
        }
      );

      setFeedbackMoment(null);
      setFeedbackReasons([]);

      setChoiceMessage(
        'Thanks — Atlas will keep this feedback for future Discovery improvements.'
      );

      void loadAtlasPatterns();
    }catch(e){
      setErr(
        e instanceof Error
          ?e.message
          :'Unable to save Atlas feedback.'
      );
    }finally{
      setFeedbackBusy(false);
    }
  }

  async function loadAtlasPatterns(){
    try{
      const result=await api<AtlasPatternsResponse>(
        '/api/discovery-patterns'
      );

      setAtlasPatterns(
        Array.isArray(result.patterns)
          ?result.patterns
          :[]
      );
    }catch{
      // Atlas Patterns must never prevent Discovery loading.
      setAtlasPatterns([]);
    }
  }

  async function dismissAtlasPattern(reason:AtlasPattern['reason']){
    if(patternBusy)return;

    try{
      setPatternBusy(true);

      await api<{ok:boolean}>(
        '/api/discovery-patterns',
        {
          method:'POST',
          body:JSON.stringify({
            reason,
            action:'dismiss'
          })
        }
      );

      setAtlasPatterns(current=>
        current.filter(item=>item.reason!==reason)
      );
    }catch(e){
      setErr(
        e instanceof Error
          ?e.message
          :'Unable to dismiss this Atlas pattern.'
      );
    }finally{
      setPatternBusy(false);
    }
  }

  async function loadAtlasInsight(uid:string){
    if(atlasInsightBusy)return;

    if(atlasInsights[uid]){
      setAtlasInsights(current=>{
        const next={...current};
        delete next[uid];
        return next;
      });
      return;
    }

    try{
      setAtlasInsightBusy(uid);

      setAtlasInsightError(current=>({
        ...current,
        [uid]:''
      }));

      const result=await api<AtlasDiscoveryResponse>(
        `/api/atlas-ai/discovery/${encodeURIComponent(uid)}`,
        {
          method:'POST',
          body:JSON.stringify({
            consent:true
          })
        }
      );

      setAtlasInsights(current=>({
        ...current,
        [uid]:result.insight
      }));
    }catch(e){
      const raw=
        e instanceof Error
          ?e.message
          :'Atlas insight is unavailable right now.';

      let message=raw;

      if(
        raw.includes('AI_DISCOVERY_OPT_IN_REQUIRED')||
        raw.includes('AI_CONSENT_REQUIRED')
      ){
        message=
          'Atlas can only explain this introduction when both people have opted in to AI Discovery.';
      }else if(raw.includes('ATLAS_AI_TEMPORARILY_UNAVAILABLE')){
        message=
          'Atlas is temporarily unavailable. Try again shortly.';
      }else if(raw.includes('RECOMMENDATION_NOT_AVAILABLE')){
        message=
          'This introduction is no longer available for an Atlas explanation.';
      }

      setAtlasInsightError(current=>({
        ...current,
        [uid]:message
      }));
    }finally{
      setAtlasInsightBusy(null);
    }
  }

  async function restoreDiscoveryCandidates(){
    if(restoreBusy)return;

    try{
      setRestoreBusy(true);
      setErr('');
      setChoiceMessage('');

      const result=await api<{
        ok:boolean;
        reset:number;
        skippedMutual:number;
        notice:string;
      }>('/api/demo/recommendations/reset',{
        method:'POST'
      });

      setChoiceMessage(
        result.reset>0
          ?`Restored ${result.reset} Discovery ${
              result.reset===1?'profile':'profiles'
            } for testing.`
          :result.notice
      );

      await load();
    }catch(e){
      const raw=
        e instanceof Error
          ?e.message
          :'Unable to restore Discovery profiles.';

      setErr(
        raw.includes('TEST_PROFILE_REQUIRED')
          ?'Discovery test tools are only available for test profiles.'
          :raw
      );
    }finally{
      setRestoreBusy(false);
    }
  }

  const candidates=useMemo(()=>{
    const q=location.trim().toLowerCase();

    return (d?.candidates??[]).filter(c=>{
      const age=c.age??0;

      const ageOk=
        ageRange==='all' ||
        (ageRange==='25-34' && age>=25 && age<=34) ||
        (ageRange==='35-44' && age>=35 && age<=44) ||
        (ageRange==='45+' && age>=45);

      const locationOk=
        !q ||
        (c.generalLocation??'')
          .toLowerCase()
          .includes(q);

      return ageOk && locationOk;
    });
  },[d,ageRange,location]);

  const ageOptions:AgeRange[]=[
    'all',
    '25-34',
    '35-44',
    '45+'
  ];

  const filtersActive=
    ageRange!=='all' ||
    Boolean(location.trim());

  function clearFilters(){
    setAgeRange('all');
    setLocation('');
  }

  const sharedInterestOptions=[
    ['travel','Travel'],
    ['food','Food'],
    ['family','Family'],
    ['fitness','Fitness'],
    ['cinema','Cinema'],
    ['sports','Sports'],
    ['socialising','Socialising'],
    ['reading','Reading'],
    ['outdoors','Outdoors'],
    ['arts','Arts'],
    ['volunteering','Volunteering']
  ] as const;

  async function openDiscoveryPreferences(
    atlasReason?:{label:string;count:number}
  ){
    try{
      setPreferencesError('');
      setPreferencesBusy(true);

      if(atlasReason){
        setAtlasPreferenceReason(atlasReason);
      }else{
        setAtlasPreferenceReason(null);
      }

      setPreferencesOpen(true);

      const result=await api<DiscoveryPreferencesResponse>(
        '/api/discovery-preferences'
      );

      setDiscoveryPreferences(result.preferences);

      setAdvancedPreferences(
        result.membership?.entitlements
          ?.advancedIntroductionPreferences===true
      );

      setSharedInterestPreference(
        result.preferences.sharedInterestPreference ??
          'doesnt_matter'
      );

      setPreferredSharedInterests(
        Array.isArray(result.preferences.preferredSharedInterests)
          ?result.preferences.preferredSharedInterests
          :[]
      );
    }catch(e){
      setPreferencesError(
        e instanceof Error
          ?e.message
          :'Unable to load Discovery preferences.'
      );
    }finally{
      setPreferencesBusy(false);
    }
  }

  function togglePreferredSharedInterest(value:string){
    setPreferredSharedInterests(current=>
      current.includes(value)
        ?current.filter(item=>item!==value)
        :[...current,value]
    );
  }

  async function saveDiscoveryPreferences(){
    if(
      !discoveryPreferences ||
      preferencesSaving
    )return;

    if(
      sharedInterestPreference!=='doesnt_matter' &&
      preferredSharedInterests.length===0
    ){
      setPreferencesError(
        'Choose at least one interest, or select Doesn’t matter.'
      );
      return;
    }

    try{
      setPreferencesError('');
      setPreferencesSaving(true);

      await api<{ok:boolean}>(
        '/api/discovery-preferences',
        {
          method:'POST',
          body:JSON.stringify({
            ...discoveryPreferences,
            sharedInterestPreference,
            preferredSharedInterests:
              sharedInterestPreference==='doesnt_matter'
                ?[]
                :preferredSharedInterests
          })
        }
      );

      setPreferencesOpen(false);
      setAtlasPreferenceReason(null);

      setChoiceMessage(
        'Your Discovery preferences have been updated.'
      );

      await load();
    }catch(e){
      setPreferencesError(
        e instanceof Error
          ?e.message
          :'Unable to save Discovery preferences.'
      );
    }finally{
      setPreferencesSaving(false);
    }
  }

  useEffect(()=>{
    let active=true;

    async function checkAtlasDaily(){
      try{
        const today=atlasDailyDateKey();

        // Development only: show Atlas Daily again after a fresh launch.
        if (__DEV__) {
          await AsyncStorage.removeItem('atlasDailyLastShown');
        }

        const [lastShown,enabled]=await Promise.all([
          AsyncStorage.getItem('atlasDailyLastShown'),
          AsyncStorage.getItem('atlasDailyEnabled')
        ]);

        if(
          active &&
          enabled!=='false' &&
          lastShown!==today
        ){
          setAtlasDailyOpen(true);
        }
      }catch{
        // Atlas Daily should never block Discovery.
      }
    }

    void checkAtlasDaily();

    return ()=>{active=false;};
  },[]);

  async function closeAtlasDaily(){
    try{
      await AsyncStorage.setItem(
        'atlasDailyLastShown',
        atlasDailyDateKey()
      );
    }finally{
      setAtlasDailyOpen(false);
    }
  }

  async function disableAtlasDaily(){
    try{
      await Promise.all([
        AsyncStorage.setItem('atlasDailyEnabled','false'),
        AsyncStorage.setItem(
          'atlasDailyLastShown',
          atlasDailyDateKey()
        )
      ]);
    }finally{
      setAtlasDailyOpen(false);
    }
  }

  return (
    <Screen eyebrow="ATLAS DAILY DISCOVERY">
      <Modal
        visible={atlasDailyOpen}
        transparent
        animationType="fade"
        onRequestClose={()=>void closeAtlasDaily()}
      >
        <View style={{
          flex:1,
          backgroundColor:'rgba(0,0,25,0.82)',
          justifyContent:'center',
          padding:24
        }}>
          <View style={{
            backgroundColor:colors.card,
            borderWidth:1,
            borderColor:colors.blue,
            borderRadius:28,
            padding:24
          }}>
            <View style={{
              width:54,
              height:54,
              borderRadius:27,
              backgroundColor:colors.blue,
              alignItems:'center',
              justifyContent:'center',
              marginBottom:20
            }}>
              <Text style={{
                color:'#FFFFFF',
                fontSize:25,
                fontWeight:'900'
              }}>
                ✦
              </Text>
            </View>

            <Text style={{
              color:colors.blue,
              fontSize:11,
              fontWeight:'900',
              letterSpacing:1.4,
              marginBottom:8
            }}>
              ATLAS DAILY
            </Text>

            <Text style={{
              color:colors.ink,
              fontSize:25,
              lineHeight:31,
              fontWeight:'900',
              marginBottom:20
            }}>
              One thought for better connections.
            </Text>

            <Text style={{
              color:colors.ink,
              fontSize:19,
              lineHeight:29,
              fontWeight:'700',
              marginBottom:24
            }}>
              “{dailyThought.thought}”
            </Text>

            <View style={{
              backgroundColor:colors.blue+'10',
              borderRadius:18,
              padding:16,
              marginBottom:22
            }}>
              <Text style={{
                color:colors.blue,
                fontSize:10,
                fontWeight:'900',
                letterSpacing:1.2,
                marginBottom:6
              }}>
                FOR TODAY
              </Text>

              <Text style={{
                color:colors.ink,
                fontSize:15,
                lineHeight:22,
                fontWeight:'700'
              }}>
                {dailyThought.today}
              </Text>
            </View>

            <Pressable
              onPress={()=>void closeAtlasDaily()}
              style={{
                backgroundColor:colors.blue,
                borderRadius:16,
                paddingVertical:15,
                alignItems:'center'
              }}
            >
              <Text style={{
                color:'#FFFFFF',
                fontSize:16,
                fontWeight:'900'
              }}>
                Continue
              </Text>
            </Pressable>

            <Pressable
              onPress={()=>void disableAtlasDaily()}
              style={{
                paddingVertical:15,
                alignItems:'center'
              }}
            >
              <Text style={{
                color:colors.muted,
                fontSize:12,
                fontWeight:'700'
              }}>
                Don't show these daily
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={preferencesOpen}
        transparent
        animationType="slide"
        onRequestClose={()=>{
          if(!preferencesSaving){
            setPreferencesOpen(false);
            setAtlasPreferenceReason(null);
          }
        }}
      >
        <View style={{
          flex:1,
          backgroundColor:'rgba(0,0,0,0.55)',
          justifyContent:'flex-end'
        }}>
          <View style={{
            backgroundColor:colors.card,
            borderTopLeftRadius:28,
            borderTopRightRadius:28,
            maxHeight:'88%',
            paddingTop:8
          }}>
            <ScrollView
              contentContainerStyle={{
                padding:22,
                paddingBottom:40
              }}
            >
              <View style={{
                flexDirection:'row',
                alignItems:'center',
                marginBottom:8
              }}>
                <View style={{flex:1}}>
                  <Text style={{
                    color:colors.blue,
                    fontSize:11,
                    fontWeight:'900',
                    letterSpacing:1.1
                  }}>
                    DISCOVERY PREFERENCES
                  </Text>

                  <Text style={{
                    color:colors.ink,
                    fontSize:22,
                    fontWeight:'900',
                    marginTop:3
                  }}>
                    What matters to you
                  </Text>
                </View>

                <Pressable
                  disabled={preferencesSaving}
                  onPress={()=>{
                    setPreferencesOpen(false);
                    setAtlasPreferenceReason(null);
                  }}
                  style={{padding:8}}
                >
                  <Text style={{
                    color:colors.muted,
                    fontSize:24
                  }}>
                    ×
                  </Text>
                </Pressable>
              </View>

              <Text style={{
                color:colors.muted,
                fontSize:13,
                lineHeight:19,
                marginBottom:18
              }}>
                These preferences influence future Discovery introductions. You stay in control of what Atlas uses.
              </Text>

              {atlasPreferenceReason?(
                <View style={{
                  backgroundColor:colors.bg,
                  borderWidth:1,
                  borderColor:colors.blue,
                  borderRadius:18,
                  padding:14,
                  marginBottom:20
                }}>
                  <Text style={{
                    color:colors.blue,
                    fontSize:11,
                    fontWeight:'900',
                    letterSpacing:1
                  }}>
                    ✦ SUGGESTED BY ATLAS
                  </Text>

                  <Text style={{
                    color:colors.ink,
                    fontSize:14,
                    fontWeight:'800',
                    marginTop:6
                  }}>
                    {atlasPreferenceReason.label} has stood out in{' '}
                    {atlasPreferenceReason.count} positive Discovery decisions.
                  </Text>

                  <Text style={{
                    color:colors.muted,
                    fontSize:12,
                    lineHeight:18,
                    marginTop:5
                  }}>
                    Atlas noticed the pattern, but it hasn't changed this preference for you.
                  </Text>
                </View>
              ):null}

              {preferencesBusy?(
                <Text style={{
                  color:colors.muted,
                  fontSize:14,
                  paddingVertical:20
                }}>
                  Loading preferences...
                </Text>
              ):(
                <>
                  <Text style={{
                    color:colors.ink,
                    fontSize:17,
                    fontWeight:'900',
                    marginBottom:5
                  }}>
                    Shared interests
                  </Text>

                  <Text style={{
                    color:colors.muted,
                    fontSize:13,
                    lineHeight:19,
                    marginBottom:14
                  }}>
                    Tell Atlas whether sharing particular interests should add weight when explaining an introduction.
                  </Text>

                      <Text style={{
                        color:colors.muted,
                        fontSize:12,
                        fontWeight:'800',
                        marginBottom:9
                      }}>
                        HOW MUCH SHOULD THIS MATTER?
                      </Text>

                      <View style={{
                        flexDirection:'row',
                        flexWrap:'wrap',
                        gap:8,
                        marginBottom:20
                      }}>
                        {([
                          ['doesnt_matter',"Doesn't matter"],
                          ['preference','Preference'],
                          ['important','Important']
                        ] as const).map(([value,label])=>{
                          const selected=
                            sharedInterestPreference===value;

                          return(
                            <Pressable
                              key={value}
                              onPress={()=>
                                setSharedInterestPreference(value)
                              }
                              style={{
                                borderWidth:1,
                                borderColor:selected
                                  ?colors.blue
                                  :colors.line,
                                backgroundColor:selected
                                  ?colors.bg
                                  :colors.card,
                                borderRadius:18,
                                paddingVertical:10,
                                paddingHorizontal:13
                              }}
                            >
                              <Text style={{
                                color:selected
                                  ?colors.blue
                                  :colors.ink,
                                fontSize:13,
                                fontWeight:selected?'900':'700'
                              }}>
                                {selected?'✓ ':''}{label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {sharedInterestPreference!=='doesnt_matter'?(
                        <>
                          <Text style={{
                            color:colors.muted,
                            fontSize:12,
                            fontWeight:'800',
                            marginBottom:5
                          }}>
                            WHICH INTERESTS MATTER?
                          </Text>

                          <Text style={{
                            color:colors.muted,
                            fontSize:12,
                            lineHeight:17,
                            marginBottom:10
                          }}>
                            Choose the interests where shared enthusiasm would be meaningful to you.
                          </Text>

                          <View style={{
                            flexDirection:'row',
                            flexWrap:'wrap',
                            gap:8,
                            marginBottom:20
                          }}>
                            {sharedInterestOptions.map(
                              ([value,label])=>{
                                const selected=
                                  preferredSharedInterests
                                    .includes(value);

                                return(
                                  <Pressable
                                    key={value}
                                    onPress={()=>
                                      togglePreferredSharedInterest(value)
                                    }
                                    style={{
                                      borderWidth:1,
                                      borderColor:selected
                                        ?colors.blue
                                        :colors.line,
                                      backgroundColor:selected
                                        ?colors.bg
                                        :colors.card,
                                      borderRadius:18,
                                      paddingVertical:9,
                                      paddingHorizontal:12
                                    }}
                                  >
                                    <Text style={{
                                      color:selected
                                        ?colors.blue
                                        :colors.ink,
                                      fontSize:13,
                                      fontWeight:selected?'800':'600'
                                    }}>
                                      {selected?'✓ ':''}{label}
                                    </Text>
                                  </Pressable>
                                );
                              }
                            )}
                          </View>
                        </>
                      ):null}
                  {preferencesError?(
                    <Text style={{
                      color:colors.ink,
                      fontSize:12,
                      lineHeight:17,
                      marginBottom:12
                    }}>
                      {preferencesError}
                    </Text>
                  ):null}

                  <Button
                      title={
                        preferencesSaving
                          ?'Saving...'
                          :'Apply preferences'
                      }
                      disabled={preferencesSaving}
                      onPress={()=>
                        void saveDiscoveryPreferences()
                      }
                    />

                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(feedbackMoment)}
        transparent
        animationType="fade"
        onRequestClose={()=>{
          if(!feedbackBusy){
            setFeedbackMoment(null);
            setFeedbackReasons([]);
          }
        }}
      >
        <View style={{
          flex:1,
          backgroundColor:'rgba(0,0,0,0.55)',
          justifyContent:'flex-end'
        }}>
          <View style={{
            backgroundColor:colors.card,
            borderTopLeftRadius:28,
            borderTopRightRadius:28,
            padding:22,
            paddingBottom:34
          }}>
            <View style={{
              flexDirection:'row',
              alignItems:'center',
              marginBottom:8
            }}>
              <View style={{
                width:38,
                height:38,
                borderRadius:19,
                backgroundColor:colors.blue,
                alignItems:'center',
                justifyContent:'center',
                marginRight:11
              }}>
                <Text style={{
                  color:'#fff',
                  fontSize:19,
                  fontWeight:'900'
                }}>
                  ✦
                </Text>
              </View>

              <View style={{flex:1}}>
                <Text style={{
                  color:colors.blue,
                  fontSize:11,
                  fontWeight:'900',
                  letterSpacing:1.1
                }}>
                  ATLAS DISCOVERY
                </Text>

                <Text style={{
                  color:colors.ink,
                  fontSize:20,
                  fontWeight:'900',
                  marginTop:2
                }}>
                  Help Atlas understand
                </Text>
              </View>
            </View>

            <Text style={{
              color:colors.muted,
              fontSize:14,
              lineHeight:20,
              marginBottom:18
            }}>
              {feedbackMoment?.decision==='pass'
                ?`What made ${feedbackMoment?.firstName ?? 'this introduction'} feel less suitable?`
                :feedbackMoment?.decision==='saved'
                  ?`What made you want to keep ${feedbackMoment?.firstName ?? 'this introduction'} for later?`
                  :`What stood out about ${feedbackMoment?.firstName ?? 'this introduction'}?`}
            </Text>

            <Text style={{
              color:colors.muted,
              fontSize:12,
              marginBottom:10
            }}>
              Choose up to 3. This is optional.
            </Text>

            <View style={{
              flexDirection:'row',
              flexWrap:'wrap',
              gap:8,
              marginBottom:20
            }}>
              {(
                feedbackMoment?.decision==='pass'
                  ?[
                      ['lifestyle_alignment','Lifestyle felt different'],
                      ['different_priorities','Different relationship priorities'],
                      ['practical_reasons','Location or practical reasons'],
                      ['not_enough_shared_interests','Not enough shared interests'],
                      ['just_not_for_me',"Just wasn't for me"]
                    ]
                  :[
                      ['shared_values','Shared values'],
                      ['relationship_goals','Relationship goals'],
                      ['lifestyle_alignment','Lifestyle compatibility'],
                      ['shared_interests','Shared interests'],
                      ['profile_stood_out','Their profile stood out']
                    ]
              ).map(([value,label])=>{
                const selected=feedbackReasons.includes(value);

                return(
                  <Pressable
                    key={value}
                    onPress={()=>toggleFeedbackReason(value)}
                    style={{
                      borderWidth:1,
                      borderColor:selected
                        ?colors.blue
                        :colors.line,
                      backgroundColor:selected
                        ?colors.bg
                        :colors.card,
                      borderRadius:18,
                      paddingVertical:9,
                      paddingHorizontal:12
                    }}
                  >
                    <Text style={{
                      color:selected
                        ?colors.blue
                        :colors.ink,
                      fontSize:13,
                      fontWeight:selected?'800':'600'
                    }}>
                      {selected?'✓ ':''}{label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              title={
                feedbackBusy
                  ?'Saving...'
                  :'Share with Atlas'
              }
              disabled={
                feedbackBusy ||
                feedbackReasons.length===0
              }
              onPress={()=>void submitDiscoveryFeedback()}
            />

            <Pressable
              disabled={feedbackBusy}
              onPress={()=>{
                setFeedbackMoment(null);
                setFeedbackReasons([]);
              }}
              style={{
                alignItems:'center',
                paddingVertical:14
              }}
            >
              <Text style={{
                color:colors.muted,
                fontSize:13,
                fontWeight:'700'
              }}>
                Not now
              </Text>
            </Pressable>

            <Text style={{
              color:colors.muted,
              fontSize:11,
              lineHeight:16,
              textAlign:'center'
            }}>
              This feedback does not change your compatibility score or Discovery preferences.
            </Text>
          </View>
        </View>
      </Modal>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={load}
            tintColor={colors.blue}
          />
        }

      >
        {choiceMessage?(
          <Pressable
            onPress={()=>setChoiceMessage('')}
            style={{
              backgroundColor:colors.card,
              borderColor:colors.line,
              borderWidth:1,
              borderRadius:14,
              padding:12,
              marginBottom:12
            }}
          >
            <Text
              style={{
                color:colors.ink,
                fontSize:13,
                lineHeight:19,
                fontWeight:'700'
              }}
            >
              {choiceMessage}
            </Text>
          </Pressable>
        ):null}

        <Modal
          visible={Boolean(matchMoment)}
          transparent
          animationType="fade"
          onRequestClose={()=>setMatchMoment(null)}
        >
          <View
            style={{
              flex:1,
              backgroundColor:'rgba(0,0,0,0.72)',
              justifyContent:'center',
              padding:24
            }}
          >
            <View
              style={{
                backgroundColor:colors.card,
                borderRadius:28,
                padding:24,
                gap:16,
                borderWidth:1,
                borderColor:colors.line
              }}
            >
              <View style={{alignItems:'center',gap:8}}>
                <Text
                  style={{
                    color:colors.blue,
                    fontSize:12,
                    fontWeight:'900',
                    letterSpacing:1.2
                  }}
                >
                  MUTUAL INTRODUCTION
                </Text>

                <Text
                  style={{
                    color:colors.ink,
                    fontSize:30,
                    fontWeight:'900',
                    textAlign:'center'
                  }}
                >
                  You matched ♥
                </Text>

                <Text
                  style={{
                    color:colors.muted,
                    fontSize:15,
                    lineHeight:21,
                    textAlign:'center'
                  }}
                >
                  You and {matchMoment?.candidate.firstName ?? 'this person'} independently chose each other.
                </Text>
              </View>

              {matchMoment?(
                <View
                  style={{
                    alignItems:'center',
                    gap:10,
                    paddingVertical:8
                  }}
                >
                  {failedPhotos[matchMoment.candidate.uid]?(
                    <View
                      style={{
                        width:112,
                        height:112,
                        borderRadius:56,
                        backgroundColor:colors.photo,
                        alignItems:'center',
                        justifyContent:'center'
                      }}
                    >
                      <Text
                        style={{
                          color:colors.ink,
                          fontSize:42,
                          fontWeight:'900'
                        }}
                      >
                        {matchMoment.candidate.firstName?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                  ):(
                    <Image
                      source={{
                        uri:profilePhoto(matchMoment.candidate.uid),
                        headers:photoAuthToken
                          ?{Authorization:`Bearer ${photoAuthToken}`}
                          :undefined
                      }}
                      onError={()=>
                        setFailedPhotos(current=>({
                          ...current,
                          [matchMoment.candidate.uid]:true
                        }))
                      }
                      style={{
                        width:112,
                        height:112,
                        borderRadius:56,
                        backgroundColor:colors.photo
                      }}
                    />
                  )}

                  <Text
                    style={{
                      color:colors.ink,
                      fontSize:21,
                      fontWeight:'900'
                    }}
                  >
                    {matchMoment.candidate.firstName}
                    {matchMoment.candidate.age
                      ?`, ${matchMoment.candidate.age}`
                      :''}
                  </Text>
                </View>
              ):null}

              <Button
                title="Start conversation"
                onPress={()=>{
                  const matchId=matchMoment?.matchId;
                  setMatchMoment(null);

                  if(matchId){
                    router.push(`/chat/${matchId}` as any);
                  }
                }}
              />

              <Button
                title="Keep discovering"
                secondary
                onPress={()=>setMatchMoment(null)}
              />

              <Text
                style={{
                  color:colors.muted,
                  fontSize:11,
                  lineHeight:16,
                  textAlign:'center'
                }}
              >
                Your connection is private. Messaging is available because the interest was mutual.
              </Text>
            </View>
          </View>
        </Modal>
        <Text style={{
          color:colors.ink,
          fontSize:30,
          lineHeight:36,
          fontWeight:'800',
          marginBottom:16
        }}>
          Discover
        </Text>

        {d?.eligible?(
          <Pressable
            onPress={()=>setFiltersOpen(v=>!v)}
            style={({pressed})=>({
              backgroundColor:pressed
                ?colors.blue+'16'
                :colors.blue+'0A',
              borderWidth:1,
              borderColor:filtersActive
                ?colors.blue
                :colors.line,
              borderRadius:20,
              paddingHorizontal:17,
              paddingVertical:15,
              marginBottom:16,
              flexDirection:'row',
              alignItems:'center',
              gap:12
            })}
          >
            <View style={{
              width:40,
              height:40,
              borderRadius:14,
              backgroundColor:colors.blue+'18',
              alignItems:'center',
              justifyContent:'center'
            }}>
              <Text style={{
                color:colors.blue,
                fontSize:18,
                fontWeight:'900'
              }}>
                ≡
              </Text>
            </View>

            <View style={{flex:1,minWidth:0}}>
              <Text style={{
                color:colors.ink,
                fontSize:15,
                fontWeight:'900'
              }}>
                Discovery preferences
              </Text>


            </View>

            <Text style={{
              color:colors.blue,
              fontSize:13,
              fontWeight:'900'
            }}>
              {filtersOpen?'Close':'Adjust ›'}
            </Text>
          </Pressable>
        ):null}

        {d?.eligible&&filtersOpen?(
          <Card>
            <H2>Refine discovery</H2>

            <Body>Age</Body>

            <View style={{
              flexDirection:'row',
              gap:8,
              flexWrap:'wrap'
            }}>
              {ageOptions.map(x=>(
                <Pressable
                  key={x}
                  onPress={()=>setAgeRange(x)}
                  style={{
                    paddingVertical:9,
                    paddingHorizontal:13,
                    borderRadius:18,
                    borderWidth:1,
                    borderColor:ageRange===x
                      ?colors.blue
                      :colors.muted,
                    backgroundColor:ageRange===x
                      ?colors.blue
                      :colors.card
                  }}
                >
                  <Text style={{
                    color:ageRange===x
                      ?'#fff'
                      :colors.text,
                    fontWeight:'700'
                  }}>
                    {x==='all'?'Any age':x}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Body>Location</Body>

            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. London"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              style={{
                borderWidth:1,
                borderColor:colors.muted,
                borderRadius:12,
                paddingHorizontal:14,
                paddingVertical:12,
                color:colors.text,
                backgroundColor:colors.card
              }}
            />

            {filtersActive?(
              <Button
                title="Clear filters"
                secondary
                onPress={clearFilters}
              />
            ):null}
          </Card>
        ):null}

        {err?(
          <Card>
            <Body error>{err}</Body>
          </Card>
        ):null}

        {d&&!d.eligible?(
          <View
            style={{
              backgroundColor:colors.card,
              borderWidth:1,
              borderColor:colors.line,
              borderRadius:24,
              padding:20,
              marginTop:8
            }}
          >
            <View
              style={{
                flexDirection:'row',
                alignItems:'center',
                marginBottom:18
              }}
            >
              <View
                style={{
                  width:46,
                  height:46,
                  borderRadius:23,
                  backgroundColor:colors.blue,
                  alignItems:'center',
                  justifyContent:'center',
                  marginRight:13
                }}
              >
                <Text
                  style={{
                    color:'#fff',
                    fontSize:22,
                    fontWeight:'900'
                  }}
                >
                  ✦
                </Text>
              </View>

              <View style={{flex:1}}>
                <Text
                  style={{
                    color:colors.blue,
                    fontSize:11,
                    fontWeight:'900',
                    letterSpacing:1.2,
                    marginBottom:4
                  }}
                >
                  ATLAS · GETTING STARTED
                </Text>

                <Text
                  style={{
                    color:colors.ink,
                    fontSize:22,
                    lineHeight:27,
                    fontWeight:'900'
                  }}
                >
                  Let's get you ready
                </Text>
              </View>
            </View>

            <Text
              style={{
                color:colors.muted,
                fontSize:14,
                lineHeight:21,
                marginBottom:22
              }}
            >
              Complete your setup so Atlas can understand you and
              start finding considered introductions.
            </Text>

            <View
              style={{
                flexDirection:'row',
                alignItems:'center',
                justifyContent:'space-between',
                marginBottom:12
              }}
            >
              <Text
                style={{
                  color:colors.muted,
                  fontSize:11,
                  fontWeight:'900',
                  letterSpacing:1
                }}
              >
                YOUR JOURNEY
              </Text>

              {readiness?(
                <Text
                  style={{
                    color:colors.muted,
                    fontSize:11,
                    fontWeight:'800'
                  }}
                >
                  {readiness.steps.filter(step=>step.complete).length} complete
                </Text>
              ):null}
            </View>

            {readiness?(
              <>
                {[
                  {
                    id:'profile',
                    number:'1',
                    title:'Build your profile',
                    detail:'Add your basic details and tell people a little about yourself.',
                    complete:Boolean(
                      readiness.steps.find(step=>step.id==='profile')?.complete
                    ),
                    action:'Continue setup',
                    onPress:()=>router.push('/(tabs)/profile')
                  },
                  {
                    id:'verification',
                    number:'2',
                    title:'Face Verification',
                    detail:readiness.faceVerified
                      ? 'Your live face has been matched to your profile photo.'
                      : 'Confirm your live face matches your profile photo.',
                    complete:readiness.faceVerified===true,
                    action:'Open verification',
                    onPress:()=>router.push('/verification')
                  },
                  {
                    id:'atlas',
                    number:'3',
                    title:'Tell Atlas what matters',
                    detail:'Complete your relationship profile so Atlas can understand your relationship signals.',
                    complete:Boolean(
                      readiness.steps.find(step=>step.id==='atlas')?.complete
                    ),
                    action:'Continue setup',
                    onPress:()=>router.push('/(tabs)/atlas')
                  },
                  {
                    id:'preferences',
                    number:'4',
                    title:'Discovery preferences',
                    detail:"Tell Atlas what's important when considering introductions.",
                    complete:Boolean(
                      readiness.steps.find(step=>step.id==='preferences')?.complete
                    ),
                    action:'Set preferences',
                    onPress:()=>void openDiscoveryPreferences()
                  },
                  {
                    id:'discovery',
                    number:'5',
                    title:'Enter Discovery',
                    detail:'Make your profile available for considered private introductions.',
                    complete:Boolean(
                      readiness.steps.find(step=>step.id==='discovery')?.complete
                    ),
                    action:'Enter Discovery',
                    onPress:()=>confirmEnterDiscovery()
                  }
                ].map((step,index,journey)=>{
                  const firstIncomplete=
                    journey.findIndex(item=>!item.complete);

                  const isNext=
                    !step.complete &&
                    index===firstIncomplete;

                  return (
                    <Pressable
                      key={step.id}
                      onPress={step.complete?undefined:step.onPress}
                      style={{
                        borderWidth:1,
                        borderColor:isNext?colors.blue:colors.line,
                        borderRadius:18,
                        padding:15,
                        marginBottom:10
                      }}
                    >
                      <View
                        style={{
                          flexDirection:'row',
                          alignItems:'flex-start'
                        }}
                      >
                        <View
                          style={{
                            width:30,
                            height:30,
                            borderRadius:15,
                            backgroundColor:
                              step.complete||isNext
                                ?colors.blue
                                :'transparent',
                            borderWidth:
                              step.complete||isNext
                                ?0
                                :1,
                            borderColor:colors.muted,
                            alignItems:'center',
                            justifyContent:'center',
                            marginRight:12
                          }}
                        >
                          <Text
                            style={{
                              color:
                                step.complete||isNext
                                  ?'#fff'
                                  :colors.text,
                              fontWeight:'900'
                            }}
                          >
                            {step.complete?'✓':step.number}
                          </Text>
                        </View>

                        <View style={{flex:1}}>
                          <View
                            style={{
                              flexDirection:'row',
                              alignItems:'center',
                              justifyContent:'space-between'
                            }}
                          >
                            <Text
                              style={{
                                color:colors.ink,
                                fontSize:14,
                                fontWeight:'900',
                                marginBottom:3,
                                flex:1
                              }}
                            >
                              {step.title}
                            </Text>

                            {isNext?(
                              <Text
                                style={{
                                  color:colors.blue,
                                  fontSize:10,
                                  fontWeight:'900',
                                  letterSpacing:.8,
                                  marginLeft:8
                                }}
                              >
                                NEXT
                              </Text>
                            ):null}
                          </View>

                          <Text
                            style={{
                              color:colors.muted,
                              fontSize:12,
                              lineHeight:17
                            }}
                          >
                            {step.detail}
                          </Text>

                          {step.complete?(
                            <Text
                              style={{
                                color:colors.blue,
                                fontSize:11,
                                fontWeight:'900',
                                marginTop:7
                              }}
                            >
                              Complete
                            </Text>
                          ):null}
                        </View>

                        {!step.complete?(
                          <Text
                            style={{
                              color:colors.blue,
                              fontSize:18,
                              fontWeight:'900',
                              marginLeft:8
                            }}
                          >
                            ›
                          </Text>
                        ):null}
                      </View>

                      {isNext?(
                        <View style={{marginTop:14}}>
                          <Button
                            title={step.action}
                            onPress={step.onPress}
                          />
                        </View>
                      ):null}
                    </Pressable>
                  );
                })}
              </>
            ):(
              <Text
                style={{
                  color:colors.muted,
                  fontSize:13,
                  marginBottom:12
                }}
              >
                Checking your setup…
              </Text>
            )}

            <View
              style={{
                marginTop:8,
                paddingTop:16,
                borderTopWidth:1,
                borderTopColor:colors.line
              }}
            >
              <Text
                style={{
                  color:colors.muted,
                  fontSize:12,
                  lineHeight:18
                }}
              >
                Atlas uses the information you choose to share,
                together with your preferences and relationship
                signals, to explain considered introductions.
              </Text>
            </View>
          </View>
        ):null}

        {d?.eligible&&d.candidates.length===0?(
          <View>
            <View
              style={{
                backgroundColor:colors.card,
                borderWidth:1,
                borderColor:colors.line,
                borderRadius:22,
                padding:20,
                marginBottom:18
              }}
            >
              <View
                style={{
                  flexDirection:'row',
                  alignItems:'center',
                  marginBottom:18
                }}
              >
                <View
                  style={{
                    width:46,
                    height:46,
                    borderRadius:23,
                    backgroundColor:colors.blue,
                    alignItems:'center',
                    justifyContent:'center',
                    marginRight:13
                  }}
                >
                  <Text
                    style={{
                      color:'#fff',
                      fontSize:22,
                      fontWeight:'900'
                    }}
                  >
                    ✦
                  </Text>
                </View>

                <View style={{flex:1}}>
                  <Text
                    style={{
                      color:colors.blue,
                      fontSize:12,
                      fontWeight:'900',
                      letterSpacing:1.2,
                      marginBottom:3
                    }}
                  >
                    ATLAS IS LOOKING
                  </Text>

                  <Text
                    style={{
                      color:colors.ink,
                      fontSize:20,
                      lineHeight:24,
                      fontWeight:'900'
                    }}
                  >
                    No suitable introductions right now
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color:colors.muted,
                  fontSize:15,
                  lineHeight:22,
                  marginBottom:18
                }}
              >
                Atlas is using your preferences and relationship signals to look for people worth considering.
              </Text>

              {[
                ['✓','Your profile is active'],
                ['✓','Your preferences are being used']
              ].map(([icon,label])=>(
                <View
                  key={label}
                  style={{
                    flexDirection:'row',
                    alignItems:'center',
                    marginBottom:10
                  }}
                >
                  <View
                    style={{
                      width:25,
                      height:25,
                      borderRadius:13,
                      backgroundColor:colors.bg,
                      alignItems:'center',
                      justifyContent:'center',
                      marginRight:10
                    }}
                  >
                    <Text
                      style={{
                        color:colors.blue,
                        fontWeight:'900',
                        fontSize:12
                      }}
                    >
                      {icon}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color:colors.ink,
                      fontSize:14,
                      fontWeight:'700'
                    }}
                  >
                    {label}
                  </Text>
                </View>
              ))}

              <View
                style={{
                  height:1,
                  backgroundColor:colors.line,
                  marginVertical:12
                }}
              />

              <Text
                style={{
                  color:colors.muted,
                  fontSize:13,
                  lineHeight:19
                }}
              >
                We won't show filler profiles just to keep your feed busy.
              </Text>
            </View>

            {__DEV__?(
              <Pressable
                disabled={restoreBusy}
                onPress={()=>void restoreDiscoveryCandidates()}
                style={{
                  borderWidth:1,
                  borderColor:colors.blue,
                  borderRadius:16,
                  paddingVertical:13,
                  paddingHorizontal:14,
                  alignItems:'center',
                  marginBottom:20,
                  opacity:restoreBusy?0.6:1
                }}
              >
                <Text
                  style={{
                    color:colors.blue,
                    fontSize:13,
                    fontWeight:'900'
                  }}
                >
                  {restoreBusy
                    ?'Restoring test profiles...'
                    :'Restore Discovery test profiles'}
                </Text>
              </Pressable>
            ):null}

            <Text
              style={{
                color:colors.blue,
                fontSize:12,
                fontWeight:'900',
                letterSpacing:1.2,
                marginBottom:10
              }}
            >
              YOUR DISCOVERY
            </Text>

            <Pressable
              onPress={()=>void openDiscoveryPreferences()}
              style={{
                backgroundColor:colors.card,
                borderWidth:1,
                borderColor:colors.line,
                borderRadius:18,
                padding:16,
                marginBottom:12
              }}
            >
              <View
                style={{
                  flexDirection:'row',
                  alignItems:'center'
                }}
              >
                <View
                  style={{
                    width:38,
                    height:38,
                    borderRadius:19,
                    backgroundColor:colors.bg,
                    alignItems:'center',
                    justifyContent:'center',
                    marginRight:12
                  }}
                >
                  <Text
                    style={{
                      color:colors.blue,
                      fontSize:19,
                      fontWeight:'900'
                    }}
                  >
                    ◎
                  </Text>
                </View>

                <View style={{flex:1}}>
                  <Text
                    style={{
                      color:colors.ink,
                      fontSize:15,
                      fontWeight:'800',
                      marginBottom:3
                    }}
                  >
                    Discovery preferences
                  </Text>

                  <Text
                    style={{
                      color:colors.muted,
                      fontSize:13,
                      lineHeight:18
                    }}
                  >
                    Review or change who you're looking to meet
                  </Text>
                </View>

                <Text
                  style={{
                    color:colors.blue,
                    fontSize:22,
                    fontWeight:'700',
                    marginLeft:8
                  }}
                >
                  ›
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={()=>setWhyOpen(v=>!v)}
              style={{
                backgroundColor:colors.card,
                borderWidth:1,
                borderColor:colors.line,
                borderRadius:18,
                padding:16,
                marginBottom:16
              }}
            >
              <View
                style={{
                  flexDirection:'row',
                  alignItems:'center',
                  justifyContent:'space-between'
                }}
              >
                <View
                  style={{
                    flexDirection:'row',
                    alignItems:'center',
                    flex:1
                  }}
                >
                  <View
                    style={{
                      width:30,
                      height:30,
                      borderRadius:15,
                      backgroundColor:colors.bg,
                      alignItems:'center',
                      justifyContent:'center',
                      marginRight:10
                    }}
                  >
                    <Text
                      style={{
                        color:colors.blue,
                        fontWeight:'900'
                      }}
                    >
                      ?
                    </Text>
                  </View>

                  <Text
                    style={{
                      color:colors.ink,
                      fontSize:14,
                      fontWeight:'800'
                    }}
                  >
                    Why don't I have any introductions?
                  </Text>
                </View>

                <Text
                  style={{
                    color:colors.blue,
                    fontSize:20,
                    fontWeight:'700',
                    marginLeft:8
                  }}
                >
                  {whyOpen?'−':'›'}
                </Text>
              </View>

              {whyOpen?(
                <Text
                  style={{
                    color:colors.muted,
                    fontSize:13,
                    lineHeight:19,
                    marginTop:12
                  }}
                >
                  AutoFace does not fill your discovery feed with random profiles. Atlas waits until there is someone who meets your current discovery criteria and has meaningful compatibility signals.
                </Text>
              ):null}
            </Pressable>
          </View>
        ):null}

        {d?.eligible&&d.candidates.length>0&&candidates.length===0?(
          <Card>
            <H2>No one matches these filters</H2>
            <Body>
              Try widening the age range or clearing the location filter. Your original Atlas candidates are still available.
            </Body>
            <Button
              title="Clear filters"
              secondary
              onPress={clearFilters}
            />
          </Card>
        ):null}

        {atlasPatterns.length>0?(
          <View
            style={{
              backgroundColor:colors.card,
              borderWidth:1,
              borderColor:colors.line,
              borderRadius:22,
              padding:18,
              marginBottom:18
            }}
          >
            <View
              style={{
                flexDirection:'row',
                alignItems:'center',
                gap:12
              }}
            >
              <View
                style={{
                  width:42,
                  height:42,
                  borderRadius:21,
                  backgroundColor:colors.blue,
                  alignItems:'center',
                  justifyContent:'center'
                }}
              >
                <Text style={{
                  color:'#fff',
                  fontSize:19,
                  fontWeight:'900'
                }}>
                  ✦
                </Text>
              </View>

              <View style={{flex:1,minWidth:0}}>
                <Text style={{
                  color:colors.ink,
                  fontSize:15,
                  fontWeight:'900',
                  marginTop:2
                }}>
                  Atlas noticed a pattern
                </Text>

                <Text
                  style={{
                    color:colors.muted,
                    fontSize:12,
                    lineHeight:17,
                    fontWeight:'600',
                    marginTop:3
                  }}
                >
                  {atlasPatterns[0].label} is standing out.
                </Text>
              </View>

              {atlasPatterns[0].actionable?(
                <Pressable
                  onPress={()=>
                    void openDiscoveryPreferences({
                      label:atlasPatterns[0].label,
                      count:atlasPatterns[0].count
                    })
                  }
                  style={{
                    paddingVertical:10,
                    paddingLeft:8
                  }}
                >
                  <Text style={{
                    color:colors.blue,
                    fontSize:13,
                    fontWeight:'900'
                  }}>
                    Review ›
                  </Text>
                </Pressable>
              ):(
                <Pressable
                  disabled={patternBusy}
                  onPress={()=>
                    void dismissAtlasPattern(
                      atlasPatterns[0].reason
                    )
                  }
                  style={{
                    paddingVertical:10,
                    paddingLeft:8,
                    opacity:patternBusy?0.6:1
                  }}
                >
                  <Text style={{
                    color:colors.muted,
                    fontSize:12,
                    fontWeight:'800'
                  }}>
                    {patternBusy?'...':'Dismiss'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ):null}

        {candidates.map((c,index)=>(
          <Card key={c.uid}>
            <View style={{
              position:'relative'
            }}>
              {failedPhotos[c.uid]?(
                <View
                  style={{
                    height:330,
                    borderRadius:20,
                    backgroundColor:colors.photo,
                    alignItems:'center',
                    justifyContent:'center'
                  }}
                >
                  <View
                    style={{
                      width:108,
                      height:108,
                      borderRadius:54,
                      borderWidth:2,
                      borderColor:colors.muted,
                      alignItems:'center',
                      justifyContent:'center'
                    }}
                  >
                    <Text
                      style={{
                        color:colors.text,
                        fontSize:48,
                        fontWeight:'800'
                      }}
                    >
                      {(c.firstName||'?').slice(0,1).toUpperCase()}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color:colors.muted,
                      fontSize:13,
                      fontWeight:'700',
                      marginTop:14
                    }}
                  >
                    Profile photo unavailable
                  </Text>
                </View>
              ):(
                <Image
                  source={{
                    uri:profilePhoto(c.uid),
                    headers:photoAuthToken
                      ?{Authorization:`Bearer ${photoAuthToken}`}
                      :undefined
                  }}
                  style={{
                    height:330,
                    borderRadius:20,
                    backgroundColor:colors.photo
                  }}
                  resizeMode="cover"
                  onError={()=>{
                    setFailedPhotos(current=>({
                      ...current,
                      [c.uid]:true
                    }));
                  }}
                />
              )}

              <View style={{
                position:'absolute',
                top:14,
                left:14,
                paddingHorizontal:11,
                paddingVertical:7,
                borderRadius:16,
                backgroundColor:'rgba(0,0,0,0.68)'
              }}>
                <Text style={{
                  color:'#fff',
                  fontWeight:'800',
                  fontSize:12
                }}>
                  {index+1} of {candidates.length}
                </Text>
              </View>

              {c.faceVerified?(
                <View style={{
                  position:'absolute',
                  top:14,
                  right:14,
                  paddingHorizontal:11,
                  paddingVertical:7,
                  borderRadius:16,
                  backgroundColor:'rgba(0,0,0,0.72)'
                }}>
                  <Text style={{
                    color:'#fff',
                    fontWeight:'800',
                    fontSize:12
                  }}>
                    ✓ Face Verified
                  </Text>
                </View>
              ):null}
            </View>

            <View style={{gap:4}}>
              <View style={{
                flexDirection:'row',
                alignItems:'center',
                flexWrap:'wrap',
                gap:8
              }}>
                <H2>
                  {c.firstName}
                  {c.age?`, ${c.age}`:''}
                </H2>

                {c.faceVerified?(
                  <Text style={{
                    color:colors.blue,
                    fontWeight:'900',
                    fontSize:16
                  }}>
                    ✓
                  </Text>
                ):null}
              </View>

              <Body>
                {[c.generalLocation,c.occupation]
                  .filter(Boolean)
                  .join(' · ') ||
                  'Profile details available after introduction'}
              </Body>
            </View>

            {c.aboutMe?(
              <View style={{
                borderLeftWidth:3,
                borderLeftColor:colors.blue,
                paddingLeft:12
              }}>
                <Text style={{
                  color:colors.text,
                  fontSize:15,
                  lineHeight:22
                }}>
                  {c.aboutMe}
                </Text>
              </View>
            ):null}

            {c.hobbies?.length?(
              <View style={{
                flexDirection:'row',
                gap:7,
                flexWrap:'wrap'
              }}>
                {c.hobbies.slice(0,5).map(hobby=>(
                  <View
                    key={hobby}
                    style={{
                      paddingVertical:7,
                      paddingHorizontal:10,
                      borderRadius:15,
                      borderWidth:1,
                      borderColor:colors.muted
                    }}
                  >
                    <Text style={{
                      color:colors.text,
                      fontSize:12,
                      fontWeight:'700'
                    }}>
                      {hobby.replaceAll('_',' ')}
                    </Text>
                  </View>
                ))}
              </View>
            ):null}

            <View style={{
              flexDirection:'row',
              gap:8,
              flexWrap:'wrap'
            }}>
              <View style={{
                paddingVertical:8,
                paddingHorizontal:11,
                borderRadius:15,
                borderWidth:1,
                borderColor:colors.muted
              }}>
                <Text style={{
                  color:colors.text,
                  fontWeight:'800'
                }}>
                  ✓ Authenticity {c.authenticityScore??'-'}%
                </Text>
              </View>

              <View style={{
                paddingVertical:8,
                paddingHorizontal:11,
                borderRadius:15,
                borderWidth:1,
                borderColor:colors.blue
              }}>
                <Text style={{
                  color:colors.blue,
                  fontWeight:'800'
                }}>
                  ✦ Atlas {c.compatibilityScore??'-'}%
                </Text>
              </View>
            </View>

            {c.strongestAlignments?.length?(
              <View style={{gap:5}}>
                <Text style={{
                  color:colors.muted,
                  fontSize:12,
                  fontWeight:'800',
                  textTransform:'uppercase'
                }}>
                  Shared signals
                </Text>

                <Text style={{
                  color:colors.text,
                  fontSize:14,
                  lineHeight:20
                }}>
                  {c.strongestAlignments
                    .slice(0,3)
                    .join(' · ')}
                </Text>
              </View>
            ):null}

            <Pressable
              onPress={()=>
                setExpanded(x=>({
                  ...x,
                  [c.uid]:!x[c.uid]
                }))
              }
            >
              <Text style={{
                color:colors.blue,
                fontWeight:'800'
              }}>
                {expanded[c.uid]
                  ?'Hide Atlas explanation'
                  :'Why this Atlas signal?'}
              </Text>
            </Pressable>

            {expanded[c.uid]?(
              <View style={{
                borderLeftWidth:3,
                borderLeftColor:colors.blue,
                paddingLeft:12,
                gap:6
              }}>
                <Body>
                  {compatibilityCopy(c.compatibilityScore)}
                </Body>

                {c.conversationPoints?.length?(
                  <Text style={{
                    color:colors.muted,
                    fontSize:13,
                    lineHeight:18
                  }}>
                    Worth exploring: {c.conversationPoints
                      .slice(0,2)
                      .join(' · ')}
                  </Text>
                ):null}

                <Text style={{
                  color:colors.muted,
                  fontSize:12,
                  lineHeight:17
                }}>
                  Compatibility is guidance from available profile signals, not a judgement about whether two people should be together.
                </Text>

                <View style={{
                  height:1,
                  backgroundColor:colors.muted,
                  opacity:0.25,
                  marginVertical:8
                }}/>

                <Pressable
                  disabled={atlasInsightBusy===c.uid}
                  onPress={()=>void loadAtlasInsight(c.uid)}
                  style={{
                    paddingVertical:6
                  }}
                >
                  <Text style={{
                    color:colors.blue,
                    fontSize:14,
                    fontWeight:'900'
                  }}>
                    {atlasInsightBusy===c.uid
                      ?'✦ Atlas is looking deeper...'
                      :atlasInsights[c.uid]
                        ?'Hide why Atlas chose this introduction'
                        :'✦ Why did Atlas choose this introduction?'}
                  </Text>
                </Pressable>

                {atlasInsightError[c.uid]?(
                  <Text style={{
                    color:colors.muted,
                    fontSize:12,
                    lineHeight:18
                  }}>
                    {atlasInsightError[c.uid]}
                  </Text>
                ):null}

                {atlasInsights[c.uid]?(
                  <View style={{
                    backgroundColor:colors.card,
                    borderWidth:1,
                    borderColor:colors.blue,
                    borderRadius:18,
                    padding:15,
                    gap:13,
                    marginTop:4
                  }}>
                    <View>
                      <Text style={{
                        color:colors.blue,
                        fontSize:11,
                        fontWeight:'900',
                        letterSpacing:1.1,
                        marginBottom:5
                      }}>
                        WHY THIS INTRODUCTION
                      </Text>

                      <Text style={{
                        color:colors.text,
                        fontSize:18,
                        lineHeight:23,
                        fontWeight:'900'
                      }}>
                        {atlasInsights[c.uid].headline}
                      </Text>
                    </View>

                    <Text style={{
                      color:colors.muted,
                      fontSize:13,
                      lineHeight:19
                    }}>
                      {atlasInsights[c.uid].summary}
                    </Text>

                    {atlasInsights[c.uid].sharedThemes.length?(
                      <View style={{gap:9}}>
                        <Text style={{
                          color:colors.muted,
                          fontSize:11,
                          fontWeight:'900',
                          letterSpacing:1,
                          textTransform:'uppercase'
                        }}>
                          You both seem aligned on
                        </Text>

                        {atlasInsights[c.uid].sharedThemes.map(
                          (item,index)=>(
                            <View
                              key={`${item.theme}-${index}`}
                              style={{
                                flexDirection:'row',
                                gap:9
                              }}
                            >
                              <Text style={{
                                color:colors.blue,
                                fontSize:14,
                                fontWeight:'900'
                              }}>
                                ✓
                              </Text>

                              <View style={{flex:1}}>
                                <Text style={{
                                  color:colors.text,
                                  fontSize:14,
                                  fontWeight:'800',
                                  marginBottom:2
                                }}>
                                  {item.theme}
                                </Text>

                                <Text style={{
                                  color:colors.muted,
                                  fontSize:12,
                                  lineHeight:17
                                }}>
                                  {item.explanation}
                                </Text>
                              </View>
                            </View>
                          )
                        )}
                      </View>
                    ):null}

                    {atlasInsights[c.uid].discussionPoints.length?(
                      <View style={{
                        backgroundColor:colors.bg,
                        borderRadius:14,
                        padding:12,
                        gap:7
                      }}>
                        <Text style={{
                          color:colors.blue,
                          fontSize:11,
                          fontWeight:'900',
                          letterSpacing:1,
                          textTransform:'uppercase'
                        }}>
                          Worth exploring
                        </Text>

                        {atlasInsights[c.uid].discussionPoints.map(
                          (item,index)=>(
                            <View key={`${item.theme}-${index}`}>
                              <Text style={{
                                color:colors.text,
                                fontSize:13,
                                fontWeight:'800'
                              }}>
                                {item.theme}
                              </Text>

                              <Text style={{
                                color:colors.muted,
                                fontSize:12,
                                lineHeight:17,
                                marginTop:2
                              }}>
                                {item.explanation}
                              </Text>
                            </View>
                          )
                        )}
                      </View>
                    ):null}

                    <Text style={{
                      color:colors.muted,
                      fontSize:11,
                      lineHeight:16
                    }}>
                      Atlas explains relationship signals you both chose to share. It does not predict whether a relationship will succeed.
                    </Text>
                  </View>
                ):null}
              </View>
            ):null}

            <Button
              title={actingUid===c.uid?'Sending...':'Interested ♥'}
              pink
              disabled={Boolean(actingUid)}
              onPress={()=>act(c.uid,'interested')}
            />

            <View style={{
              flexDirection:'row',
              gap:10
            }}>
              <View style={{flex:1}}>
                <Button
                  title="Save"
                  secondary
                  onPress={()=>act(c.uid,'saved')}
                />
              </View>

              <View style={{flex:1}}>
                <Button
                  title="Pass"
                  secondary
                  onPress={()=>act(c.uid,'pass')}
                />
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
