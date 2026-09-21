import React,{useCallback,useState} from 'react';
import {Image,Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {router,useFocusEffect} from 'expo-router';
import {api,profilePhoto} from '@/src/lib/api';
import {Body,Button,Card,H2,Loading,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';

type Mutual={uid:string;firstName?:string;name?:string;age?:number;generalLocation?:string;matchId?:string;id?:string;state?:string;chatStatus?:{locked?:boolean;remaining?:number|null;unlimited?:boolean}};
type IntroResponse={mutual?:Mutual[];introductions?:Mutual[]};
type Message={id:string;senderUid:string;text:string;createdAt?:string|null};
type Conversation={messages?:Message[]};
type Row=Mutual&{lastMessage?:Message;unread?:boolean};
const openedKey=(id:string)=>`autoface:last-opened:${id}`;
function when(value?:string|null){if(!value)return '';const d=new Date(value);const now=new Date();if(d.toDateString()===now.toDateString())return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});return d.toLocaleDateString([],{day:'numeric',month:'short'});}

export default function Messages(){
 const {colors}=useAppTheme();const [items,setItems]=useState<Row[]>([]),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{setBusy(true);setErr('');const x=await api<IntroResponse>('/api/introductions');const base=x.mutual??x.introductions??[];const rows=await Promise.all(base.map(async item=>{const id=item.matchId||item.id;if(!id)return item;try{const [conversation,lastOpened]=await Promise.all([api<Conversation>(`/api/messages?matchId=${encodeURIComponent(id)}`),AsyncStorage.getItem(openedKey(id))]);const msgs=conversation.messages??[];const last=msgs[msgs.length-1];const unread=Boolean(last?.createdAt&&(!lastOpened||new Date(last.createdAt).getTime()>new Date(lastOpened).getTime()));return {...item,lastMessage:last,unread};}catch{return item;}}));setItems(rows)}catch(e){setErr(e instanceof Error?e.message:'Unable to load conversations')}finally{setBusy(false)}},[]);
 useFocusEffect(useCallback(()=>{void load()},[load]));
 const unreadCount=items.filter(x=>x.unread).length;
 return <Screen eyebrow="MESSAGES" title="Private conversations"><ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={load}/>}>
  <View style={s.intro}><Body>Only mutual introductions can message you.</Body>{unreadCount>0?<View style={[s.count,{backgroundColor:colors.blue}]}><Text style={s.countText}>{unreadCount} new</Text></View>:null}</View>
  {err?<Card><Body error>{err}</Body></Card>:null}{busy&&!items.length?<Loading/>:null}
  {!busy&&!items.length?<Card><H2>No conversations yet</H2><Body>Your conversations appear here when an introduction becomes mutual.</Body><Button title="View introductions" onPress={()=>router.push('/(tabs)/introductions')}/></Card>:items.map((x,i)=>{const id=x.matchId||x.id;return <Pressable key={id||x.uid||String(i)} onPress={()=>id&&router.push(`/chat/${id}` as any)}><Card><View style={s.row}><View><Image source={{uri:profilePhoto(x.uid)}} style={[s.photo,{backgroundColor:colors.photo}]}/>{x.unread?<View style={[s.dot,{backgroundColor:colors.blue,borderColor:colors.card}]}/>:null}</View><View style={s.copy}><View style={s.nameRow}><H2>{x.firstName||x.name||'Introduction'}{x.age?`, ${x.age}`:''}</H2>{x.lastMessage?.createdAt?<Text style={[s.time,{color:colors.muted}]}>{when(x.lastMessage.createdAt)}</Text>:null}</View><Text numberOfLines={1} style={[s.preview,{color:x.unread?colors.text:colors.muted,fontWeight:x.unread?'800':'500'}]}>{x.lastMessage?.text||'Your private conversation is ready.'}</Text><Text style={[s.status,{color:x.chatStatus?.locked?colors.rose:colors.muted}]}>{x.chatStatus?.locked?'Read-only':x.chatStatus?.unlimited?'Unlimited messaging':x.chatStatus?.remaining!=null?`${x.chatStatus.remaining} free messages remaining`:'Private conversation'}</Text></View></View></Card></Pressable>})}
 </ScrollView></Screen>;
}
const s=StyleSheet.create({content:{gap:12,paddingBottom:110},intro:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},count:{borderRadius:999,paddingHorizontal:10,paddingVertical:5},countText:{color:'#fff',fontSize:12,fontWeight:'800'},row:{flexDirection:'row',alignItems:'center',gap:12},photo:{width:62,height:62,borderRadius:31},dot:{position:'absolute',right:0,bottom:1,width:15,height:15,borderRadius:8,borderWidth:2},copy:{flex:1,gap:4},nameRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},time:{fontSize:11},preview:{fontSize:14},status:{fontSize:11}});
