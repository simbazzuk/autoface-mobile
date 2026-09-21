import React,{useCallback,useMemo,useState} from 'react';
import {Image,Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {api,profilePhoto} from '@/src/lib/api';
import {Body,Button,Card,H2,Loading,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';

type ChatStatus={unlimited?:boolean;freeLimit?:number;sentCount?:number;remaining?:number|null;locked?:boolean};
type Person={uid:string;firstName?:string;name?:string;age?:number;generalLocation?:string;compatibilityScore?:number;authenticityScore?:number;interestId?:string;matchId?:string;id?:string;state?:string;createdAt?:string;updatedAt?:string;chatStatus?:ChatStatus};
type Response={waiting?:Person[];mutual?:Person[];saved?:Person[];introductions?:Person[];counts?:{waiting:number;mutual:number;saved:number}};
type Tab='mutual'|'waiting'|'saved';

function signalCopy(score?:number){
 if(score==null)return 'Atlas signal pending';
 if(score>=80)return 'Strong Atlas alignment';
 if(score>=60)return 'Positive Atlas alignment';
 return 'Some shared signals';
}
function statusFor(tab:Tab,locked:boolean){
 if(tab==='mutual')return locked?'Conversation paused':'Mutual connection';
 if(tab==='waiting')return 'Interest sent · private';
 return 'Saved for later';
}

export default function Introductions(){
 const {colors}=useAppTheme();
 const [data,setData]=useState<Response|null>(null),[tab,setTab]=useState<Tab>('mutual'),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{setBusy(true);setErr('');setData(await api<Response>('/api/introductions'))}catch(e){setErr(e instanceof Error?e.message:'Unable to load introductions')}finally{setBusy(false)}},[]);
 useFocusEffect(useCallback(()=>{void load()},[load]));
 const mutual=data?.mutual??data?.introductions??[]; const waiting=data?.waiting??[]; const saved=data?.saved??[];
 const counts=data?.counts??{mutual:mutual.length,waiting:waiting.length,saved:saved.length};
 const items=useMemo(()=>tab==='mutual'?mutual:tab==='waiting'?waiting:saved,[tab,mutual,waiting,saved]);
 const tabs:[Tab,string,number][]=[['mutual','Connected',counts.mutual],['waiting','Waiting',counts.waiting],['saved','Saved',counts.saved]];
 return <Screen eyebrow="PRIVATE INTRODUCTIONS" title="Your connections">
  <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={colors.blue}/> }>
   <Card>
    <H2>How introductions work</H2>
    <View style={s.journey}>
     {['Interested','Private waiting','Mutual','Chat'].map((x,i)=><React.Fragment key={x}><View style={[s.step,{backgroundColor:i===3?colors.blue:colors.photo}]}><Text style={{color:i===3?'#fff':colors.ink,fontWeight:'800',fontSize:11}}>{x}</Text></View>{i<3?<Text style={{color:colors.muted}}>›</Text>:null}</React.Fragment>)}
    </View>
    <Body>Your interest is private. A conversation opens only when interest becomes mutual.</Body>
   </Card>
   <View style={s.tabs}>{tabs.map(([key,label,count])=><Pressable key={key} onPress={()=>setTab(key)} style={[s.tab,{backgroundColor:tab===key?colors.blue:colors.card,borderColor:tab===key?colors.blue:colors.line}]}><Text style={[s.tabText,{color:tab===key?'#fff':colors.ink}]}>{label}</Text><Text style={[s.count,{color:tab===key?'#fff':colors.muted}]}>{count}</Text></Pressable>)}</View>
   {err?<Card><Body error>{err}</Body></Card>:null}
   {!data&&busy?<Loading/>:null}
   {data&&items.length===0?<Card><H2>{tab==='mutual'?'No mutual connections yet':tab==='waiting'?'No interests waiting':'Nothing saved for later'}</H2><Body>{tab==='mutual'?'When someone you are interested in independently chooses you too, your connection will appear here.':tab==='waiting'?'Profiles you mark Interested appear here while the choice remains private.':'Save someone from Discover when you want more time to consider their profile.'}</Body><Button title="Open Discover" onPress={()=>router.push('/(tabs)/discover')}/></Card>:null}
   {items.map((item,i)=>{const id=item.matchId||item.id; const locked=Boolean(item.chatStatus?.locked); return <Card key={id||item.interestId||item.uid||String(i)}>
    <View style={s.topRow}><View style={[s.status,{backgroundColor:tab==='mutual'?colors.blue:colors.photo}]}><Text style={{color:tab==='mutual'?'#fff':colors.ink,fontWeight:'800',fontSize:11}}>{statusFor(tab,locked)}</Text></View></View>
    <View style={s.identity}><Image source={{uri:profilePhoto(item.uid)}} style={[s.photo,{backgroundColor:colors.photo}]}/><View style={s.identityText}><H2>{item.firstName||item.name||'Introduction'}{item.age?`, ${item.age}`:''}</H2><Body>{item.generalLocation||'Location hidden'}</Body></View></View>
    <View style={s.signals}><View style={[s.signal,{backgroundColor:colors.photo}]}><Text style={[s.signalValue,{color:colors.ink}]}>{item.compatibilityScore??'-'}%</Text><Text style={[s.signalLabel,{color:colors.muted}]}>Atlas</Text></View><View style={[s.signal,{backgroundColor:colors.photo}]}><Text style={[s.signalValue,{color:colors.ink}]}>{item.authenticityScore??'-'}%</Text><Text style={[s.signalLabel,{color:colors.muted}]}>Authenticity</Text></View></View>
    <Text style={{color:colors.muted,fontSize:12,fontWeight:'700'}}>{signalCopy(item.compatibilityScore)}</Text>
    {tab==='mutual'?<><Body>{locked?'This conversation is paused, but your message history remains available.':item.chatStatus?.unlimited?'You are mutually connected. Unlimited messaging is available.':item.chatStatus?.remaining!=null?`You are mutually connected. ${item.chatStatus.remaining} free messages remaining.`:'You are mutually connected. Your private conversation is ready.'}</Body>{id?<Button title={locked?'View conversation':'Start conversation'} onPress={()=>router.push(`/chat/${id}` as any)}/>:<Body error>Conversation is being prepared. Pull to refresh shortly.</Body>}</>:tab==='waiting'?<><Body>You have expressed interest. They are not told unless they independently choose you too.</Body><View style={[s.notice,{borderColor:colors.line}]}><Text style={{color:colors.ink,fontWeight:'800'}}>What happens next?</Text><Text style={{color:colors.muted,fontSize:13,lineHeight:18}}>If the interest becomes mutual, this profile moves automatically to Connected and messaging opens.</Text></View></>:<><Body>Saved privately. No interest has been sent.</Body><Button title="Return to Discover" secondary onPress={()=>router.push('/(tabs)/discover')}/></>}
   </Card>})}
  </ScrollView>
 </Screen>
}
const s=StyleSheet.create({content:{gap:12,paddingBottom:110},journey:{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'},step:{paddingVertical:7,paddingHorizontal:9,borderRadius:12},tabs:{flexDirection:'row',gap:8},tab:{flex:1,borderWidth:1,borderRadius:14,paddingVertical:10,paddingHorizontal:8,alignItems:'center'},tabText:{fontSize:12,fontWeight:'800'},count:{fontSize:12,marginTop:2},topRow:{flexDirection:'row',justifyContent:'flex-end'},status:{paddingVertical:6,paddingHorizontal:10,borderRadius:12},identity:{flexDirection:'row',gap:12,alignItems:'center'},identityText:{flex:1,gap:2},photo:{width:78,height:78,borderRadius:39},signals:{flexDirection:'row',gap:10},signal:{flex:1,borderRadius:14,padding:12},signalValue:{fontSize:20,fontWeight:'800'},signalLabel:{fontSize:12,marginTop:2},notice:{borderWidth:1,borderRadius:14,padding:12,gap:4}});
