import React,{useCallback,useMemo,useState} from 'react';
import {Image,Pressable,RefreshControl,ScrollView,Text,TextInput,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {api,profilePhoto} from '@/src/lib/api';
import {Body,Button,Card,H2,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';

type Candidate={uid:string;firstName:string;age?:number;generalLocation?:string;occupation?:string;authenticityScore?:number;compatibilityScore?:number};
type D={eligible:boolean;candidates:Candidate[]};
type AgeRange='all'|'25-34'|'35-44'|'45+';

function compatibilityCopy(score?:number){
  if(score==null) return 'Atlas has not produced a compatibility signal yet.';
  if(score>=80) return 'Strong compatibility signal from the relationship information currently available.';
  if(score>=60) return 'Positive compatibility signal with some areas worth exploring together.';
  return 'Some shared signals are present. Use the introduction to learn what the score cannot tell you.';
}

export default function Discover(){
  const [d,setD]=useState<D|null>(null),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  const [ageRange,setAgeRange]=useState<AgeRange>('all'),[location,setLocation]=useState(''),[expanded,setExpanded]=useState<Record<string,boolean>>({});
  const {colors}=useAppTheme();
  const load=useCallback(async()=>{try{setBusy(true);setErr('');setD(await api<D>('/api/discovery'))}catch(e){setErr(e instanceof Error?e.message:'Unable to load Discovery')}finally{setBusy(false)}},[]);
  useFocusEffect(useCallback(()=>{void load()},[load]));
  async function act(uid:string,action:string){try{setErr('');await api('/api/interests',{method:'POST',body:JSON.stringify({toUid:uid,action})});setD(current=>current?{...current,candidates:current.candidates.filter(c=>c.uid!==uid)}:current)}catch(e){setErr(e instanceof Error?e.message:'Unable to save choice')}}
  const candidates=useMemo(()=>{const q=location.trim().toLowerCase();return (d?.candidates??[]).filter(c=>{const ageOk=ageRange==='all'||(ageRange==='25-34'&&(c.age??0)>=25&&(c.age??0)<=34)||(ageRange==='35-44'&&(c.age??0)>=35&&(c.age??0)<=44)||(ageRange==='45+'&&(c.age??0)>=45);const locationOk=!q||(c.generalLocation??'').toLowerCase().includes(q);return ageOk&&locationOk})},[d,ageRange,location]);
  const ageOptions:AgeRange[]=['all','25-34','35-44','45+'];
  return <Screen eyebrow="ATLAS DAILY DISCOVERY" title="People worth considering">
    <ScrollView refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.blue}/>} contentContainerStyle={{gap:14,paddingBottom:100}} keyboardShouldPersistTaps="handled">
      <Body>Considered introductions, not an endless swipe queue. Filters only narrow the candidates Atlas has already returned.</Body>
      <Card>
        <H2>Refine discovery</H2>
        <Body>Age</Body>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{ageOptions.map(x=><Pressable key={x} onPress={()=>setAgeRange(x)} style={{paddingVertical:9,paddingHorizontal:13,borderRadius:18,borderWidth:1,borderColor:ageRange===x?colors.blue:colors.muted,backgroundColor:ageRange===x?colors.blue:colors.card}}><Text style={{color:ageRange===x?'#fff':colors.text,fontWeight:'700'}}>{x==='all'?'Any age':x}</Text></Pressable>)}</View>
        <Body>Location</Body>
        <TextInput value={location} onChangeText={setLocation} placeholder="e.g. London" placeholderTextColor={colors.muted} autoCapitalize="words" style={{borderWidth:1,borderColor:colors.muted,borderRadius:12,paddingHorizontal:14,paddingVertical:12,color:colors.text,backgroundColor:colors.card}}/>
        {(ageRange!=='all'||location)?<Button title="Clear filters" secondary onPress={()=>{setAgeRange('all');setLocation('')}}/>:null}
      </Card>
      {err?<Card><Body error>{err}</Body></Card>:null}
      {d&&!d.eligible?<Card><H2>Complete your journey</H2><Body>Discovery opens when your profile, authenticity and Atlas relationship signals are ready.</Body></Card>:null}
      {d?.eligible&&d.candidates.length===0?<Card><H2>Atlas is looking</H2><Body>Your profile is live. No filler profiles are shown while there is no suitable introduction.</Body></Card>:null}
      {d?.eligible&&d.candidates.length>0&&candidates.length===0?<Card><H2>No one matches these filters</H2><Body>Try widening the age range or clearing the location filter. Your original Atlas candidates are still available.</Body><Button title="Clear filters" secondary onPress={()=>{setAgeRange('all');setLocation('')}}/></Card>:null}
      {candidates.map(c=><Card key={c.uid}>
        <Image source={{uri:profilePhoto(c.uid)}} style={{height:300,borderRadius:18,backgroundColor:colors.photo}}/>
        <H2>{c.firstName}{c.age?`, ${c.age}`:''}</H2>
        <Body>{[c.generalLocation,c.occupation].filter(Boolean).join(' · ')||'Profile details available after introduction'}</Body>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
          <View style={{paddingVertical:7,paddingHorizontal:10,borderRadius:14,borderWidth:1,borderColor:colors.muted}}><Text style={{color:colors.text,fontWeight:'700'}}>✓ Authenticity {c.authenticityScore??'-'}%</Text></View>
          <View style={{paddingVertical:7,paddingHorizontal:10,borderRadius:14,borderWidth:1,borderColor:colors.muted}}><Text style={{color:colors.text,fontWeight:'700'}}>✦ Atlas {c.compatibilityScore??'-'}%</Text></View>
        </View>
        <Pressable onPress={()=>setExpanded(x=>({...x,[c.uid]:!x[c.uid]}))}><Text style={{color:colors.blue,fontWeight:'700'}}>{expanded[c.uid]?'Hide Atlas explanation':'Why this Atlas signal?'}</Text></Pressable>
        {expanded[c.uid]?<View style={{borderLeftWidth:3,borderLeftColor:colors.blue,paddingLeft:12}}><Body>{compatibilityCopy(c.compatibilityScore)}</Body><Text style={{color:colors.muted,fontSize:12,lineHeight:17}}>Compatibility is guidance from available profile signals, not a judgement about whether two people should be together.</Text></View>:null}
        <Button title="Interested" onPress={()=>act(c.uid,'interested')}/>
        <View style={{flexDirection:'row',gap:10}}><View style={{flex:1}}><Button title="Save" secondary onPress={()=>act(c.uid,'saved')}/></View><View style={{flex:1}}><Button title="Pass" secondary onPress={()=>act(c.uid,'pass')}/></View></View>
      </Card>)}
    </ScrollView>
  </Screen>
}
