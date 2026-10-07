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
import Ionicons from '@expo/vector-icons/Ionicons';
import {api,profilePhoto} from '@/src/lib/api';
import {Body,Button,Card,H2,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';
import {auth} from '@/src/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AtlasDailyModal,atlasDailyDateKey} from '@/src/components/AtlasDaily';
import {DiscoveryLifestylePreferences} from '@/src/components/DiscoveryLifestylePreferences';




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
  introductionReasons?:string[];
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

type PreferenceImportance=
  |'doesnt_matter'
  |'preference'
  |'important'
  |'essential';

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

  preferredReligions:string[];
  religionImportance:PreferenceImportance;

  preferredDiets:string[];
  dietImportance:PreferenceImportance;

  preferredDrinking:string[];
  drinkingImportance:PreferenceImportance;

  preferredSmoking:string[];
  smokingImportance:PreferenceImportance;

  preferredChildren:string[];
  childrenImportance:PreferenceImportance;

  preferredWantsChildren:string[];
  wantsChildrenImportance:PreferenceImportance;
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

  const [preferredReligions,setPreferredReligions]=useState<string[]>([]);
  const [religionImportance,setReligionImportance]=
    useState<PreferenceImportance>('doesnt_matter');

  const [preferredDiets,setPreferredDiets]=useState<string[]>([]);
  const [dietImportance,setDietImportance]=
    useState<PreferenceImportance>('doesnt_matter');

  const [preferredDrinking,setPreferredDrinking]=useState<string[]>([]);
  const [drinkingImportance,setDrinkingImportance]=
    useState<PreferenceImportance>('doesnt_matter');

  const [preferredSmoking,setPreferredSmoking]=useState<string[]>([]);
  const [smokingImportance,setSmokingImportance]=
    useState<PreferenceImportance>('doesnt_matter');

  const [preferredChildren,setPreferredChildren]=useState<string[]>([]);
  const [childrenImportance,setChildrenImportance]=
    useState<PreferenceImportance>('doesnt_matter');

  const [preferredWantsChildren,setPreferredWantsChildren]=useState<string[]>([]);
  const [wantsChildrenImportance,setWantsChildrenImportance]=
    useState<PreferenceImportance>('doesnt_matter');

  const [expandedLifestylePreference,setExpandedLifestylePreference]=
    useState<string|null>(null);

  const [atlasPreferenceReason,setAtlasPreferenceReason]=
    useState<{label:string;count:number}|null>(null);

  const [whyOpen,setWhyOpen]=useState(false);

  // Lightweight, per-user explanation of the AutoFace Discovery journey.
  const [howAutoFaceOpen,setHowAutoFaceOpen]=useState(false);
  const [showHowAutoFace,setShowHowAutoFace]=useState(false);
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

  useEffect(()=>{
    let active=true;

    async function loadHowAutoFaceState(){
      try{
        const uid=auth?.currentUser?.uid;

        if(!uid){
          if(active)setShowHowAutoFace(false);
          return;
        }

        const dismissed=await AsyncStorage.getItem(
          `howAutoFaceWorksDismissed:${uid}`
        );

        if(active){
          setShowHowAutoFace(dismissed!=='true');
        }
      }catch{
        // Product guidance must never prevent Discovery loading.
        if(active)setShowHowAutoFace(true);
      }
    }

    void loadHowAutoFaceState();

    return ()=>{active=false;};
  },[]);

  async function dismissHowAutoFace(){
    const uid=auth?.currentUser?.uid;

    setHowAutoFaceOpen(false);
    setShowHowAutoFace(false);

    if(!uid)return;

    try{
      await AsyncStorage.setItem(
        `howAutoFaceWorksDismissed:${uid}`,
        'true'
      );
    }catch{
      // Dismissal persistence must never block Discovery.
    }
  }

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
        'Thanks — Atlas will use supported feedback to improve future Discovery personalisation.'
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
          'Available when both people have opted in to AI Discovery.';
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

      setPreferredReligions(
        Array.isArray(result.preferences.preferredReligions)
          ?result.preferences.preferredReligions
          :[]
      );
      setReligionImportance(
        result.preferences.religionImportance ?? 'doesnt_matter'
      );

      setPreferredDiets(
        Array.isArray(result.preferences.preferredDiets)
          ?result.preferences.preferredDiets
          :[]
      );
      setDietImportance(
        result.preferences.dietImportance ?? 'doesnt_matter'
      );

      setPreferredDrinking(
        Array.isArray(result.preferences.preferredDrinking)
          ?result.preferences.preferredDrinking
          :[]
      );
      setDrinkingImportance(
        result.preferences.drinkingImportance ?? 'doesnt_matter'
      );

      setPreferredSmoking(
        Array.isArray(result.preferences.preferredSmoking)
          ?result.preferences.preferredSmoking
          :[]
      );
      setSmokingImportance(
        result.preferences.smokingImportance ?? 'doesnt_matter'
      );

      setPreferredChildren(
        Array.isArray(result.preferences.preferredChildren)
          ?result.preferences.preferredChildren
          :[]
      );
      setChildrenImportance(
        result.preferences.childrenImportance ?? 'doesnt_matter'
      );

      setPreferredWantsChildren(
        Array.isArray(result.preferences.preferredWantsChildren)
          ?result.preferences.preferredWantsChildren
          :[]
      );
      setWantsChildrenImportance(
        result.preferences.wantsChildrenImportance ?? 'doesnt_matter'
      );

      setExpandedLifestylePreference(null);
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
                :preferredSharedInterests,

            preferredReligions,
            religionImportance:
              preferredReligions.length>0
                ?religionImportance
                :'doesnt_matter',

            preferredDiets,
            dietImportance:
              preferredDiets.length>0
                ?dietImportance
                :'doesnt_matter',

            preferredDrinking,
            drinkingImportance:
              preferredDrinking.length>0
                ?drinkingImportance
                :'doesnt_matter',

            preferredSmoking,
            smokingImportance:
              preferredSmoking.length>0
                ?smokingImportance
                :'doesnt_matter',

            preferredChildren,
            childrenImportance:
              preferredChildren.length>0
                ?childrenImportance
                :'doesnt_matter',

            preferredWantsChildren,
            wantsChildrenImportance:
              preferredWantsChildren.length>0
                ?wantsChildrenImportance
                :'doesnt_matter'
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

  useFocusEffect(
    useCallback(()=>{
      let active=true;

      async function checkAtlasDaily(){
        try{
          const today=atlasDailyDateKey();
          const uid=auth?.currentUser?.uid;

          if(!uid)return;

          const storageKey=`atlasDailyV2LastShown:${uid}`;

          // Development only: show Atlas Daily again on a fresh visit.
          if(__DEV__){
            await AsyncStorage.removeItem(storageKey);
          }

          const lastShown=await AsyncStorage.getItem(
            storageKey
          );

          if(
            active &&
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
    },[])
  );

  async function closeAtlasDaily(){
    try{
      const uid=auth?.currentUser?.uid;

      if(uid){
        await AsyncStorage.setItem(
          `atlasDailyV2LastShown:${uid}`,
          atlasDailyDateKey()
        );
      }
    }finally{
      setAtlasDailyOpen(false);
    }
  }


  return (
    <Screen eyebrow="ATLAS DAILY DISCOVERY">
      <AtlasDailyModal
        visible={atlasDailyOpen}
        onClose={()=>void closeAtlasDaily()}
      />

      <Modal
        visible={howAutoFaceOpen}
        transparent
        animationType="slide"
        onRequestClose={()=>setHowAutoFaceOpen(false)}
      >
        <View
          style={{
            flex:1,
            backgroundColor:'rgba(0,0,0,0.58)',
            justifyContent:'flex-end'
          }}
        >
          <View
            style={{
              backgroundColor:colors.card,
              borderTopLeftRadius:28,
              borderTopRightRadius:28,
              maxHeight:'88%'
            }}
          >
            <ScrollView
              contentContainerStyle={{
                padding:22,
                paddingBottom:38
              }}
            >
              <View
                style={{
                  flexDirection:'row',
                  alignItems:'flex-start',
                  marginBottom:8
                }}
              >
                <View style={{flex:1}}>
                  <Text
                    style={{
                      color:colors.blue,
                      fontSize:11,
                      fontWeight:'900',
                      letterSpacing:1.1
                    }}
                  >
                    HOW AUTOFACE WORKS
                  </Text>

                  <Text
                    style={{
                      color:colors.ink,
                      fontSize:24,
                      lineHeight:29,
                      fontWeight:'900',
                      marginTop:5
                    }}
                  >
                    Considered connections, not endless swiping
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={10}
                  onPress={()=>setHowAutoFaceOpen(false)}
                  style={{padding:6,marginLeft:8}}
                >
                  <Text
                    style={{
                      color:colors.muted,
                      fontSize:26,
                      lineHeight:28
                    }}
                  >
                    ×
                  </Text>
                </Pressable>
              </View>

              <Text
                style={{
                  color:colors.muted,
                  fontSize:14,
                  lineHeight:21,
                  marginBottom:20
                }}
              >
                AutoFace is designed to help you explore meaningful
                connections privately and at your own pace. Atlas uses
                the information you choose to share to provide
                explainable compatibility signals.
              </Text>

              <View
                style={{
                  backgroundColor:colors.bg,
                  borderWidth:1,
                  borderColor:colors.line,
                  borderRadius:18,
                  padding:15,
                  marginBottom:20
                }}
              >
                <Text
                  style={{
                    color:colors.blue,
                    fontSize:13,
                    lineHeight:20,
                    fontWeight:'900',
                    textAlign:'center'
                  }}
                >
                  Discover  →  Interest  →  Introduction  →  Conversation
                </Text>
              </View>

              {[
                {
                  number:'1',
                  title:'Discover thoughtfully',
                  text:'Atlas considers compatibility, your preferences and the relationship information you choose to share. A recommendation is a reason to explore, not a guarantee of compatibility.'
                },
                {
                  number:'2',
                  title:'Interest stays private',
                  text:'Expressing interest does not immediately start a conversation. Your interest remains private unless the connection becomes mutual.'
                },
                {
                  number:'3',
                  title:'Connect when it’s mutual',
                  text:'When interest is mutual, AutoFace creates an introduction so you can decide whether you want to start a conversation.'
                },
                {
                  number:'4',
                  title:'Atlas helps along the way',
                  text:'Atlas can explain compatibility signals, help you reflect on conversations and suggest useful next steps. You remain in control.'
                }
              ].map(item=>(
                <View
                  key={item.number}
                  style={{
                    flexDirection:'row',
                    marginBottom:18
                  }}
                >
                  <View
                    style={{
                      width:34,
                      height:34,
                      borderRadius:17,
                      backgroundColor:colors.bg,
                      borderWidth:1,
                      borderColor:colors.blue,
                      alignItems:'center',
                      justifyContent:'center',
                      marginRight:12
                    }}
                  >
                    <Text
                      style={{
                        color:colors.blue,
                        fontSize:13,
                        fontWeight:'900'
                      }}
                    >
                      {item.number}
                    </Text>
                  </View>

                  <View style={{flex:1}}>
                    <Text
                      style={{
                        color:colors.ink,
                        fontSize:15,
                        fontWeight:'900',
                        marginBottom:4
                      }}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={{
                        color:colors.muted,
                        fontSize:13,
                        lineHeight:19
                      }}
                    >
                      {item.text}
                    </Text>
                  </View>
                </View>
              ))}

              <View
                style={{
                  borderTopWidth:1,
                  borderTopColor:colors.line,
                  paddingTop:16,
                  marginTop:2,
                  marginBottom:18
                }}
              >
                <Text
                  style={{
                    color:colors.muted,
                    fontSize:12,
                    lineHeight:18
                  }}
                >
                  Atlas supports your decisions — it does not make them
                  for you. You can change your Discovery preferences at
                  any time.
                </Text>
              </View>

              <Button
                title="Got it"
                onPress={()=>void dismissHowAutoFace()}
              />

              <Pressable
                onPress={()=>setHowAutoFaceOpen(false)}
                style={{
                  alignItems:'center',
                  paddingVertical:14
                }}
              >
                <Text
                  style={{
                    color:colors.blue,
                    fontSize:13,
                    fontWeight:'800'
                  }}
                >
                  Close for now
                </Text>
              </Pressable>
            </ScrollView>
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
                  <DiscoveryLifestylePreferences
                    expanded={expandedLifestylePreference}
                    onExpandedChange={setExpandedLifestylePreference}

                    preferredReligions={preferredReligions}
                    setPreferredReligions={setPreferredReligions}
                    religionImportance={religionImportance}
                    setReligionImportance={setReligionImportance}

                    preferredDiets={preferredDiets}
                    setPreferredDiets={setPreferredDiets}
                    dietImportance={dietImportance}
                    setDietImportance={setDietImportance}

                    preferredDrinking={preferredDrinking}
                    setPreferredDrinking={setPreferredDrinking}
                    drinkingImportance={drinkingImportance}
                    setDrinkingImportance={setDrinkingImportance}

                    preferredSmoking={preferredSmoking}
                    setPreferredSmoking={setPreferredSmoking}
                    smokingImportance={smokingImportance}
                    setSmokingImportance={setSmokingImportance}

                    preferredChildren={preferredChildren}
                    setPreferredChildren={setPreferredChildren}
                    childrenImportance={childrenImportance}
                    setChildrenImportance={setChildrenImportance}

                    preferredWantsChildren={preferredWantsChildren}
                    setPreferredWantsChildren={setPreferredWantsChildren}
                    wantsChildrenImportance={wantsChildrenImportance}
                    setWantsChildrenImportance={setWantsChildrenImportance}
                  />

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

        {showHowAutoFace?(
          <View
            style={{
              backgroundColor:colors.card,
              borderWidth:2,
              borderColor:colors.pink,
              borderRadius:22,
              padding:18,
              marginBottom:18,
              overflow:'hidden'
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
                  width:42,
                  height:42,
                  borderRadius:21,
                  backgroundColor:`${colors.pink}18`,
                  alignItems:'center',
                  justifyContent:'center',
                  marginRight:13
                }}
              >
                <Ionicons
                  name="heart"
                  size={21}
                  color={colors.pink}
                />
              </View>

              <View style={{flex:1}}>
                <Text
                  style={{
                    color:colors.pink,
                    fontSize:11,
                    fontWeight:'900',
                    letterSpacing:1.1,
                    opacity:0.9
                  }}
                >
                  HOW AUTOFACE WORKS
                </Text>

                <Text
                  style={{
                    color:colors.ink,
                    fontSize:18,
                    lineHeight:23,
                    fontWeight:'900',
                    marginTop:4
                  }}
                >
                  A more considered way to connect
                </Text>

                <Text
                  style={{
                    color:colors.muted,
                    fontSize:13,
                    lineHeight:19,
                    marginTop:7,
                    opacity:0.9
                  }}
                >
                  Discover → Interest → Introduce → Chat
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection:'row',
                alignItems:'center',
                marginTop:16,
                paddingTop:14,
                borderTopWidth:1,
                borderTopColor:colors.line
              }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={()=>setHowAutoFaceOpen(true)}
                style={{
                  flex:1,
                  paddingVertical:3
                }}
              >
                <Text
                  style={{
                    color:colors.pink,
                    fontSize:13,
                    fontWeight:'900'
                  }}
                >
                  Learn how AutoFace works  ›
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss How AutoFace works"
                onPress={()=>void dismissHowAutoFace()}
                hitSlop={10}
                style={{
                  paddingVertical:4,
                  paddingLeft:14
                }}
              >
                <Text
                  style={{
                    color:colors.muted,
                    fontSize:12,
                    fontWeight:'800',
                    opacity:0.88
                  }}
                >
                  Got it
                </Text>
              </Pressable>
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

                {c.introductionReasons?.length?(
                  <View style={{
                    gap:8,
                    marginTop:4
                  }}>
                    <Text style={{
                      color:colors.blue,
                      fontSize:11,
                      fontWeight:'900',
                      letterSpacing:1
                    }}>
                      WHY THIS INTRODUCTION
                    </Text>

                    {c.introductionReasons.map((reason,index)=>(
                      <View
                        key={`${c.uid}-reason-${index}`}
                        style={{
                          flexDirection:'row',
                          alignItems:'flex-start',
                          gap:8
                        }}
                      >
                        <Text style={{
                          color:colors.blue,
                          fontSize:14,
                          fontWeight:'900'
                        }}>
                          ✓
                        </Text>

                        <Text style={{
                          color:colors.text,
                          fontSize:13,
                          lineHeight:19,
                          flex:1
                        }}>
                          {reason}
                        </Text>
                      </View>
                    ))}

                    <Text style={{
                      color:colors.muted,
                      fontSize:11,
                      lineHeight:16
                    }}>
                      Based only on relationship details and preferences you've chosen to share.
                    </Text>
                  </View>
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
                        ?'Hide deeper Atlas insight'
                        :'✦ Deeper Atlas insight'}
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
