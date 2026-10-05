import React,{useCallback,useMemo,useState} from 'react';
import {Pressable,ScrollView,Switch,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {doc,getDoc,serverTimestamp,setDoc} from 'firebase/firestore';
import {api} from '@/src/lib/api';
import {auth,db} from '@/src/lib/firebase';
import {Body,Button,Card,H2,Input,Loading,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';

type Pace='slow'|'balanced'|'intentional';
type Profile={familyOrientation:number;communicationDirectness:number;socialEnergy:number;careerPriority:number;routineVsAdventure:number;relocationFlexibility:number;sharedInterestsImportance:number;independencePreference:number;relationshipPace:Pace;weekendPreferences:string[];relationshipPriorities:string[];nonNegotiablePreferences:string[];relationshipContext:string;consentForCompatibility:boolean;consentForAiDiscovery:boolean;consentForAiReflection:boolean};
const initial:Profile={familyOrientation:3,communicationDirectness:3,socialEnergy:3,careerPriority:3,routineVsAdventure:3,relocationFlexibility:3,sharedInterestsImportance:3,independencePreference:3,relationshipPace:'balanced',weekendPreferences:[],relationshipPriorities:[],nonNegotiablePreferences:[],relationshipContext:'',consentForCompatibility:false,consentForAiDiscovery:false,consentForAiReflection:false};
const weekends=['Quiet time','Family time','Friends & social','Outdoors','Travel & exploring','Food & culture'];
const priorities=['Family','Communication','Career','Faith & values','Lifestyle','Emotional connection'];
const nonNegotiables=['Trust','Respect','Honesty','Family values','Shared goals','Healthy communication'];

export default function Atlas(){
 const {colors}=useAppTheme();const [form,setForm]=useState<Profile>(initial);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(false);const [message,setMessage]=useState('');const [reflection,setReflection]=useState('');const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const user=auth?.currentUser;if(!user||!db){setLoading(false);return}try{setLoading(true);setMessage('');const snap=await getDoc(doc(db,'relationshipProfiles',user.uid));if(snap.exists()){const d=snap.data() as Partial<Profile>;setForm({...initial,...d,weekendPreferences:Array.isArray(d.weekendPreferences)?d.weekendPreferences:[],relationshipPriorities:Array.isArray(d.relationshipPriorities)?d.relationshipPriorities:[],nonNegotiablePreferences:Array.isArray(d.nonNegotiablePreferences)?d.nonNegotiablePreferences:[]});setSaved(true)}}catch(e){setMessage(friendly(e))}finally{setLoading(false)}},[]);
 useFocusEffect(useCallback(()=>{void load()},[load]));
 const complete=useMemo(()=>{let n=0;if(form.weekendPreferences.length)n++;if(form.relationshipPriorities.length)n++;if(form.nonNegotiablePreferences.length)n++;if(form.relationshipContext.trim())n++;if(form.consentForCompatibility)n++;return Math.round(n/5*100)},[form]);
 function set<K extends keyof Profile>(k:K,v:Profile[K]){setForm(x=>({...x,[k]:v}))}
 function toggle(k:'weekendPreferences'|'relationshipPriorities'|'nonNegotiablePreferences',v:string){setForm(x=>({...x,[k]:x[k].includes(v)?x[k].filter(y=>y!==v):[...x[k],v]}))}
 async function save(){const user=auth?.currentUser;if(!user||!db||saving)return;if(!form.weekendPreferences.length||!form.relationshipPriorities.length||!form.nonNegotiablePreferences.length){setMessage('Choose at least one option in each relationship section.');return}if(!form.consentForCompatibility){setMessage('Please allow AutoFace to use these answers for compatibility recommendations.');return}try{setSaving(true);setMessage('');await setDoc(doc(db,'relationshipProfiles',user.uid),{uid:user.uid,...form,idealWeekend:form.weekendPreferences.join(', '),whatMattersMost:form.relationshipPriorities.join(', '),nonNegotiables:form.nonNegotiablePreferences.join(', '),relationshipContext:form.relationshipContext.trim(),updatedAt:serverTimestamp()},{merge:true});setSaved(true);setMessage(form.consentForAiDiscovery?'Atlas profile saved. Compatibility and optional AI Discovery are enabled.':'Atlas profile saved. Compatibility is enabled; optional AI Discovery remains off.')}catch(e){setMessage(friendly(e))}finally{setSaving(false)}}
 async function reflect(){if(!saved){setMessage('Save your Atlas relationship profile first.');return}if(!form.consentForAiReflection){setMessage('Enable optional Atlas AI Reflection first.');return}try{setBusy(true);setMessage('');const x:any=await api('/api/atlas-ai',{method:'POST',body:JSON.stringify({mode:'profile',consent:true})});setReflection((x.insight||x.reflection||x.message||'').trim()||'Atlas could not create a reflection right now.')}catch(e){setMessage(friendly(e))}finally{setBusy(false)}}
 if(loading)return <Screen eyebrow="ATLAS" title="Relationship intelligence"><Loading/></Screen>;
 return <Screen eyebrow="ATLAS" title="Relationship intelligence"><ScrollView contentContainerStyle={{gap:12,paddingBottom:110}} keyboardShouldPersistTaps="handled">
  <View style={{
   backgroundColor:colors.blue+'10',
   borderWidth:1,
   borderColor:colors.blue,
   borderRadius:20,
   padding:18,
   gap:12
 }}>
   <View style={{
     alignSelf:'flex-start',
     backgroundColor:colors.blue,
     paddingHorizontal:12,
     paddingVertical:6,
     borderRadius:999
   }}>
     <Text style={{
       color:'#FFFFFF',
       fontSize:11,
       fontWeight:'900',
       letterSpacing:.8
     }}>
       ✦ ATLAS PROFILE
     </Text>
   </View>

   <H2>Your Atlas relationship profile</H2>

   <Body>
     Tell Atlas what matters to you. Compatibility remains deterministic; AI features are optional.
   </Body>

   <View style={{
     height:12,
     borderRadius:999,
     backgroundColor:colors.blue+'20',
     overflow:'hidden'
   }}>
     <View style={{
       height:12,
       width:`${complete}%`,
       borderRadius:999,
       backgroundColor:colors.blue
     }}/>
   </View>

   <Text style={{
     color:colors.blue,
     fontWeight:'900',
     fontSize:16
   }}>
     {complete}% complete
   </Text>
 </View>

  <Text style={{
    color:colors.blue,
    fontSize:12,
    fontWeight:'900',
    letterSpacing:1.2,
    marginTop:6
  }}>
    ATLAS TOOLS
  </Text>

  <View style={{
    flexDirection:'row',
    gap:10
  }}>
    <AtlasTool
      icon="✦"
      title="Reflection"
      description={
        saved
          ?'Understand what your relationship preferences say about you.'
          :'Complete your Atlas profile to unlock reflection.'
      }
      active={saved&&form.consentForAiReflection}
      colors={colors}
      onPress={()=>{
        if(!saved){
          setMessage('Complete and save your Atlas relationship profile first.');
          return;
        }
        if(!form.consentForAiReflection){
          setMessage('Enable optional Atlas AI Reflection first.');
          return;
        }
        void reflect();
      }}
    />

    <AtlasTool
      icon="◎"
      title="Discovery"
      description="Use compatibility and Atlas insights while discovering people."
      active={form.consentForCompatibility}
      colors={colors}
      onPress={()=>router.push('/(tabs)' as any)}
    />
  </View>

  <View style={{
    flexDirection:'row',
    gap:10
  }}>
    <AtlasTool
      icon="◌"
      title="Conversation Coach"
      description="Get personalised conversation starters after you connect."
      active={form.consentForAiDiscovery}
      colors={colors}
      onPress={()=>router.push('/(tabs)/messages' as any)}
    />

    <AtlasTool
      icon="↗"
      title="Reply Coach"
      description="Get help replying naturally inside your conversations."
      active={form.consentForAiDiscovery}
      colors={colors}
      onPress={()=>router.push('/(tabs)/messages' as any)}
    />
  </View>

  <View style={{
    backgroundColor:colors.card,
    borderWidth:1,
    borderColor:colors.line,
    borderRadius:20,
    padding:16,
    gap:10
  }}>
    <View style={{
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'space-between'
    }}>
      <Text style={{
        color:colors.ink,
        fontSize:16,
        fontWeight:'900'
      }}>
        Atlas readiness
      </Text>

      <View style={{
        backgroundColor:complete===100
          ?colors.blue
          :colors.blue+'18',
        borderRadius:999,
        paddingHorizontal:10,
        paddingVertical:5
      }}>
        <Text style={{
          color:complete===100?'#FFFFFF':colors.blue,
          fontSize:11,
          fontWeight:'900'
        }}>
          {complete===100?'READY':`${complete}%`}
        </Text>
      </View>
    </View>

    <AtlasStatus
      label="Compatibility"
      enabled={form.consentForCompatibility}
      colors={colors}
    />
    <AtlasStatus
      label="AI Discovery"
      enabled={form.consentForAiDiscovery}
      colors={colors}
    />
    <AtlasStatus
      label="AI Reflection"
      enabled={form.consentForAiReflection}
      colors={colors}
    />
  </View>

  <Text style={{
    color:colors.blue,
    fontSize:12,
    fontWeight:'900',
    letterSpacing:1.2,
    marginTop:8
  }}>
    YOUR RELATIONSHIP PROFILE
  </Text>

  <Card><H2>Relationship style</H2><Scale label="Family orientation" value={form.familyOrientation} onChange={v=>set('familyOrientation',v)} colors={colors}/><Scale label="Communication directness" value={form.communicationDirectness} onChange={v=>set('communicationDirectness',v)} colors={colors}/><Scale label="Social energy" value={form.socialEnergy} onChange={v=>set('socialEnergy',v)} colors={colors}/><Scale label="Career priority" value={form.careerPriority} onChange={v=>set('careerPriority',v)} colors={colors}/><Scale label="Routine vs adventure" value={form.routineVsAdventure} onChange={v=>set('routineVsAdventure',v)} colors={colors}/><Scale label="Relocation flexibility" value={form.relocationFlexibility} onChange={v=>set('relocationFlexibility',v)} colors={colors}/><Scale label="Shared interests importance" value={form.sharedInterestsImportance} onChange={v=>set('sharedInterestsImportance',v)} colors={colors}/><Scale label="Independence preference" value={form.independencePreference} onChange={v=>set('independencePreference',v)} colors={colors}/><Body>Relationship pace</Body><Chips values={['slow','balanced','intentional']} selected={[form.relationshipPace]} single onPress={v=>set('relationshipPace',v as Pace)} colors={colors}/></Card>
  <Card><H2>Your preferences</H2><Body>Ideal weekends</Body><Chips values={weekends} selected={form.weekendPreferences} onPress={v=>toggle('weekendPreferences',v)} colors={colors}/><Body>What matters most</Body><Chips values={priorities} selected={form.relationshipPriorities} onPress={v=>toggle('relationshipPriorities',v)} colors={colors}/><Body>Non-negotiables</Body><Chips values={nonNegotiables} selected={form.nonNegotiablePreferences} onPress={v=>toggle('nonNegotiablePreferences',v)} colors={colors}/><Input multiline placeholder="Anything else Atlas should understand about the relationship you want?" value={form.relationshipContext} onChangeText={v=>set('relationshipContext',v)} style={{minHeight:100,textAlignVertical:'top'}}/></Card>
  <Card><H2>Compatibility & AI</H2><Toggle label="Use my Atlas answers for compatibility recommendations" value={form.consentForCompatibility} onChange={v=>set('consentForCompatibility',v)}/><Toggle label="Enable optional AI Discovery insights" value={form.consentForAiDiscovery} onChange={v=>set('consentForAiDiscovery',v)}/><Toggle label="Enable optional Atlas AI Reflection" value={form.consentForAiReflection} onChange={v=>set('consentForAiReflection',v)}/><Body>AI does not change your compatibility or authenticity score.</Body><Button title={saving?'Saving...':'Save Atlas profile'} disabled={saving} onPress={save}/>{message?<Body error={message.toLowerCase().includes('required')||message.toLowerCase().includes('unable')}>{message}</Body>:null}</Card>
  {saved?<Card><H2>Atlas Reflection</H2><Body>{reflection||'Ask Atlas for an optional explanation based on your saved relationship answers.'}</Body><Button title={busy?'Thinking...':'Ask Atlas for a reflection'} disabled={busy||!form.consentForAiReflection} onPress={reflect}/></Card>:null}
 </ScrollView></Screen>
}
function AtlasTool({
  icon,
  title,
  description,
  active,
  colors,
  onPress
}:{
  icon:string;
  title:string;
  description:string;
  active:boolean;
  colors:any;
  onPress:()=>void;
}){
  return(
    <Pressable
      onPress={onPress}
      style={{
        flex:1,
        minHeight:150,
        backgroundColor:active
          ?colors.blue+'0D'
          :colors.card,
        borderWidth:1,
        borderColor:active
          ?colors.blue
          :colors.line,
        borderRadius:20,
        padding:15
      }}
    >
      <View style={{
        width:38,
        height:38,
        borderRadius:19,
        alignItems:'center',
        justifyContent:'center',
        backgroundColor:active
          ?colors.blue
          :colors.photo,
        marginBottom:12
      }}>
        <Text style={{
          color:active?'#FFFFFF':colors.blue,
          fontSize:18,
          fontWeight:'900'
        }}>
          {icon}
        </Text>
      </View>

      <Text style={{
        color:colors.ink,
        fontSize:15,
        fontWeight:'900',
        marginBottom:6
      }}>
        {title}
      </Text>

      <Text style={{
        color:colors.muted,
        fontSize:12,
        lineHeight:17,
        fontWeight:'600'
      }}>
        {description}
      </Text>
    </Pressable>
  );
}

function AtlasStatus({
  label,
  enabled,
  colors
}:{
  label:string;
  enabled:boolean;
  colors:any;
}){
  return(
    <View style={{
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'space-between'
    }}>
      <Text style={{
        color:colors.text,
        fontSize:13,
        fontWeight:'700'
      }}>
        {label}
      </Text>

      <View style={{
        borderRadius:999,
        paddingHorizontal:9,
        paddingVertical:4,
        backgroundColor:enabled
          ?colors.blue+'18'
          :colors.photo
      }}>
        <Text style={{
          color:enabled?colors.blue:colors.muted,
          fontSize:10,
          fontWeight:'900'
        }}>
          {enabled?'ENABLED':'OFF'}
        </Text>
      </View>
    </View>
  );
}

function Scale({label,value,onChange,colors}:{label:string,value:number,onChange:(v:number)=>void,colors:any}){return <View style={{gap:7}}><Body>{label}</Body><View style={{flexDirection:'row',gap:7}}>{[1,2,3,4,5].map(n=><Pressable key={n} onPress={()=>onChange(n)} style={{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:value===n?colors.blue:colors.line,backgroundColor:value===n?colors.blue:colors.card}}><Text style={{fontWeight:'800',color:value===n?'#FFFFFF':colors.text}}>{n}</Text></Pressable>)}</View></View>}
function Chips({values,selected,onPress,colors}:{values:string[],selected:string[],onPress:(v:string)=>void,colors:any,single?:boolean}){return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{values.map(v=>{const on=selected.includes(v);return <Pressable key={v} onPress={()=>onPress(v)} style={{paddingVertical:9,paddingHorizontal:12,borderRadius:14,borderWidth:1,borderColor:on?colors.blue:colors.line,backgroundColor:on?colors.blue:colors.card}}><Text style={{color:on?'#FFFFFF':colors.text,fontWeight:'700'}}>{v}</Text></Pressable>})}</View>}
function Toggle({label,value,onChange}:{label:string,value:boolean,onChange:(v:boolean)=>void}){return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:14}}><View style={{flex:1}}><Body>{label}</Body></View><Switch value={value} onValueChange={onChange}/></View>}
function friendly(e:unknown){const raw=e instanceof Error?e.message:String(e);if(raw.includes('RELATIONSHIP_PROFILE_REQUIRED'))return 'Complete and save your Atlas relationship profile first.';if(raw.includes('COMPATIBILITY_CONSENT_REQUIRED'))return 'Compatibility consent is required before Atlas can create this reflection.';if(raw.includes('AI_CONSENT_REQUIRED'))return 'Atlas needs your permission for this optional AI request.';if(raw.includes('Missing or insufficient permissions'))return 'Your Atlas profile could not be updated. Please check the relationship-profile Firestore permissions.';return raw||'Atlas is unavailable right now.'}
