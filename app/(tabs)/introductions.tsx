import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {auth} from '@/src/lib/firebase';
import {api,profilePhoto} from '@/src/lib/api';
import {Body,Button,Card,H2,Loading,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';

type ChatStatus={
  unlimited?:boolean;
  freeLimit?:number;
  sentCount?:number;
  remaining?:number|null;
  locked?:boolean;
};

type Person={
  uid:string;
  firstName?:string;
  name?:string;
  age?:number;
  generalLocation?:string;
  occupation?:string;
  compatibilityScore?:number;
  authenticityScore?:number;
  faceVerified?:boolean;
  interestId?:string;
  matchId?:string;
  id?:string;
  state?:string;
  createdAt?:string;
  updatedAt?:string;
  chatStatus?:ChatStatus;
};

type Response={
  waiting?:Person[];
  mutual?:Person[];
  saved?:Person[];
  introductions?:Person[];
  counts?:{
    waiting:number;
    mutual:number;
    saved:number;
  };
};

type Tab='mutual'|'waiting'|'saved';

function signalCopy(score?:number){
  if(score==null)return 'Atlas signal pending';
  if(score>=80)return 'Strong Atlas alignment';
  if(score>=60)return 'Positive Atlas alignment';
  return 'Some shared signals';
}

function statusFor(tab:Tab,locked:boolean){
  if(tab==='mutual')return locked?'CONVERSATION PAUSED':'♥ MUTUAL CONNECTION';
  if(tab==='waiting')return 'INTEREST SENT · PRIVATE';
  return 'SAVED FOR LATER';
}

function InitialPhoto({
  person,
  token,
  size=78
}:{
  person:Person;
  token:string|null;
  size?:number;
}){
  const {colors}=useAppTheme();
  const [failed,setFailed]=useState(false);
  const initial=(person.firstName||person.name||'?').trim().charAt(0).toUpperCase();

  if(failed){
    return(
      <View
        style={[
          s.photoFallback,
          {
            width:size,
            height:size,
            borderRadius:size/2,
            backgroundColor:colors.photo
          }
        ]}
      >
        <Text
          style={{
            color:colors.ink,
            fontSize:size*.38,
            fontWeight:'800'
          }}
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
      style={{
        width:size,
        height:size,
        borderRadius:size/2,
        backgroundColor:colors.photo
      }}
      onError={()=>setFailed(true)}
    />
  );
}

export default function Introductions(){
  const {colors}=useAppTheme();

  const [data,setData]=useState<Response|null>(null);
  const [tab,setTab]=useState<Tab>('mutual');
  const [err,setErr]=useState('');
  const [busy,setBusy]=useState(false);
  const [photoAuthToken,setPhotoAuthToken]=useState<string|null>(null);

  useEffect(()=>{
    let active=true;

    const user=auth?.currentUser;
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
  },[]);

  const load=useCallback(async()=>{
    try{
      setBusy(true);
      setErr('');
      setData(await api<Response>('/api/introductions'));
    }catch(e){
      setErr(e instanceof Error?e.message:'Unable to load introductions');
    }finally{
      setBusy(false);
    }
  },[]);

  useFocusEffect(
    useCallback(()=>{
      void load();
    },[load])
  );

  const mutual=data?.mutual??data?.introductions??[];
  const waiting=data?.waiting??[];
  const saved=data?.saved??[];

  const counts=data?.counts??{
    mutual:mutual.length,
    waiting:waiting.length,
    saved:saved.length
  };

  const items=useMemo(
    ()=>tab==='mutual'?mutual:tab==='waiting'?waiting:saved,
    [tab,mutual,waiting,saved]
  );

  const tabs:[Tab,string,number][]=[
    ['mutual','Connected',counts.mutual],
    ['waiting','Waiting',counts.waiting],
    ['saved','Saved',counts.saved]
  ];

  return(
    <Screen eyebrow="PRIVATE INTRODUCTIONS" title="Your connections">
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={load}
            tintColor={colors.blue}
          />
        }
      >
        <Card>
          <H2>Private by design</H2>

          <View style={s.journey}>
            {['Interested','Private waiting','Mutual','Chat'].map((x,i)=>(
              <React.Fragment key={x}>
                <View
                  style={[
                    s.step,
                    {backgroundColor:i===3?colors.blue:colors.photo}
                  ]}
                >
                  <Text
                    style={{
                      color:i===3?'#fff':colors.ink,
                      fontWeight:'800',
                      fontSize:10
                    }}
                  >
                    {x}
                  </Text>
                </View>

                {i<3?(
                  <Text style={{color:colors.muted}}>›</Text>
                ):null}
              </React.Fragment>
            ))}
          </View>

          <Body>
            Your interest stays private. A conversation opens only when
            you independently choose each other.
          </Body>
        </Card>

        <View style={s.tabs}>
          {tabs.map(([key,label,count])=>(
            <Pressable
              key={key}
              onPress={()=>setTab(key)}
              style={[
                s.tab,
                {
                  backgroundColor:tab===key?colors.blue:colors.card,
                  borderColor:tab===key?colors.blue:colors.line
                }
              ]}
            >
              <Text
                style={[
                  s.tabText,
                  {color:tab===key?'#fff':colors.ink}
                ]}
              >
                {label}
              </Text>

              <Text
                style={[
                  s.count,
                  {color:tab===key?'#fff':colors.muted}
                ]}
              >
                {count}
              </Text>
            </Pressable>
          ))}
        </View>

        {err?(
          <Card>
            <Body error>{err}</Body>
          </Card>
        ):null}

        {!data&&busy?<Loading/>:null}

        {data&&items.length===0?(
          <Card>
            <H2>
              {tab==='mutual'
                ?'No mutual connections yet'
                :tab==='waiting'
                  ?'No interests waiting'
                  :'Nothing saved for later'}
            </H2>

            <Body>
              {tab==='mutual'
                ?'When someone you are interested in independently chooses you too, your connection will appear here.'
                :tab==='waiting'
                  ?'Profiles you mark Interested appear here while the choice remains private.'
                  :'Save someone from Discover when you want more time to consider their profile.'}
            </Body>

            <Button
              title="Open Discover"
              onPress={()=>router.push('/(tabs)/discover')}
            />
          </Card>
        ):null}

        {items.map((item,i)=>{
          const id=item.matchId||item.id;
          const locked=Boolean(item.chatStatus?.locked);
          const name=item.firstName||item.name||'Introduction';

          if(tab==='mutual'){
            return(
              <Card key={id||item.uid||String(i)}>
                <View style={s.mutualHeader}>
                  <View
                    style={[
                      s.mutualBadge,
                      {backgroundColor:locked?colors.photo:colors.blue}
                    ]}
                  >
                    <Text
                      style={{
                        color:locked?colors.ink:'#fff',
                        fontWeight:'800',
                        fontSize:11
                      }}
                    >
                      {statusFor(tab,locked)}
                    </Text>
                  </View>
                </View>

                <View style={s.hero}>
                  <View>
                    <InitialPhoto
                      person={item}
                      token={photoAuthToken}
                      size={116}
                    />

                    {item.faceVerified?(
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

                  <View style={s.heroNameRow}>
                    <Text
                      style={[
                        s.heroName,
                        {color:colors.ink}
                      ]}
                    >
                      {name}{item.age?`, ${item.age}`:''}
                    </Text>

                    {item.faceVerified?(
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

                  <Text
                    style={[
                      s.location,
                      {color:colors.muted}
                    ]}
                  >
                    {[
                      item.generalLocation,
                      item.occupation
                    ].filter(Boolean).join(' · ')||'Location hidden'}
                  </Text>

                  {item.faceVerified?(
                    <Text
                      style={[
                        s.faceVerified,
                        {color:colors.blue}
                      ]}
                    >
                      ✓ Face Verified
                    </Text>
                  ):null}
                </View>

                <View
                  style={[
                    s.matchMessage,
                    {
                      backgroundColor:colors.photo,
                      borderColor:colors.line
                    }
                  ]}
                >
                  <Text
                    style={[
                      s.matchTitle,
                      {color:colors.ink}
                    ]}
                  >
                    You both chose each other
                  </Text>

                  <Text
                    style={[
                      s.matchBody,
                      {color:colors.muted}
                    ]}
                  >
                    Your interest was private until it became mutual.
                    Your conversation is now ready.
                  </Text>
                </View>

                <View style={s.signals}>
                  <View
                    style={[
                      s.signal,
                      {backgroundColor:colors.photo}
                    ]}
                  >
                    <Text
                      style={[
                        s.signalValue,
                        {color:colors.ink}
                      ]}
                    >
                      {item.compatibilityScore??'-'}%
                    </Text>
                    <Text
                      style={[
                        s.signalLabel,
                        {color:colors.muted}
                      ]}
                    >
                      Atlas
                    </Text>
                  </View>

                  <View
                    style={[
                      s.signal,
                      {backgroundColor:colors.photo}
                    ]}
                  >
                    <Text
                      style={[
                        s.signalValue,
                        {color:colors.ink}
                      ]}
                    >
                      {item.authenticityScore??'-'}%
                    </Text>
                    <Text
                      style={[
                        s.signalLabel,
                        {color:colors.muted}
                      ]}
                    >
                      Authenticity
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color:colors.muted,
                    fontSize:12,
                    fontWeight:'700',
                    textAlign:'center'
                  }}
                >
                  {signalCopy(item.compatibilityScore)}
                </Text>

                <Body>
                  {locked
                    ?'This conversation is paused, but your message history remains available.'
                    :item.chatStatus?.unlimited
                      ?'Unlimited messaging is available for this connection.'
                      :item.chatStatus?.remaining!=null
                        ?`${item.chatStatus.remaining} free messages remaining.`
                        :'Your private conversation is ready.'}
                </Body>

                {id?(
                  <Button
                    title={locked?'View conversation':'Start conversation'}
                    onPress={()=>router.push(`/chat/${id}` as any)}
                  />
                ):(
                  <Body error>
                    Conversation is being prepared. Pull to refresh shortly.
                  </Body>
                )}
              </Card>
            );
          }

          return(
            <Card key={id||item.interestId||item.uid||String(i)}>
              <View style={s.topRow}>
                <View
                  style={[
                    s.status,
                    {backgroundColor:colors.photo}
                  ]}
                >
                  <Text
                    style={{
                      color:colors.ink,
                      fontWeight:'800',
                      fontSize:10
                    }}
                  >
                    {statusFor(tab,locked)}
                  </Text>
                </View>
              </View>

              <View style={s.identity}>
                <InitialPhoto
                  person={item}
                  token={photoAuthToken}
                />

                <View style={s.identityText}>
                  <View style={s.nameRow}>
                    <H2>
                      {name}{item.age?`, ${item.age}`:''}
                    </H2>

                    {item.faceVerified?(
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

                  <Body>
                    {item.generalLocation||'Location hidden'}
                  </Body>

                  {item.faceVerified?(
                    <Text
                      style={[
                        s.smallVerified,
                        {color:colors.blue}
                      ]}
                    >
                      ✓ Face Verified
                    </Text>
                  ):null}
                </View>
              </View>

              <View style={s.signals}>
                <View
                  style={[
                    s.signal,
                    {backgroundColor:colors.photo}
                  ]}
                >
                  <Text
                    style={[
                      s.signalValue,
                      {color:colors.ink}
                    ]}
                  >
                    {item.compatibilityScore??'-'}%
                  </Text>
                  <Text
                    style={[
                      s.signalLabel,
                      {color:colors.muted}
                    ]}
                  >
                    Atlas
                  </Text>
                </View>

                <View
                  style={[
                    s.signal,
                    {backgroundColor:colors.photo}
                  ]}
                >
                  <Text
                    style={[
                      s.signalValue,
                      {color:colors.ink}
                    ]}
                  >
                    {item.authenticityScore??'-'}%
                  </Text>
                  <Text
                    style={[
                      s.signalLabel,
                      {color:colors.muted}
                    ]}
                  >
                    Authenticity
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color:colors.muted,
                  fontSize:12,
                  fontWeight:'700'
                }}
              >
                {signalCopy(item.compatibilityScore)}
              </Text>

              {tab==='waiting'?(
                <>
                  <Body>
                    You have expressed interest. They are not told unless
                    they independently choose you too.
                  </Body>

                  <View
                    style={[
                      s.notice,
                      {borderColor:colors.line}
                    ]}
                  >
                    <Text
                      style={{
                        color:colors.ink,
                        fontWeight:'800'
                      }}
                    >
                      What happens next?
                    </Text>

                    <Text
                      style={{
                        color:colors.muted,
                        fontSize:13,
                        lineHeight:18
                      }}
                    >
                      If the interest becomes mutual, this profile moves
                      automatically to Connected and messaging opens.
                    </Text>
                  </View>
                </>
              ):(
                <>
                  <Body>
                    Saved privately. No interest has been sent.
                  </Body>

                  <Button
                    title="Return to Discover"
                    secondary
                    onPress={()=>router.push('/(tabs)/discover')}
                  />
                </>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const s=StyleSheet.create({
  content:{
    gap:12,
    paddingBottom:110
  },
  journey:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    gap:3
  },
  step:{
    paddingVertical:7,
    paddingHorizontal:7,
    borderRadius:12
  },
  tabs:{
    flexDirection:'row',
    gap:8
  },
  tab:{
    flex:1,
    borderWidth:1,
    borderRadius:14,
    paddingVertical:10,
    paddingHorizontal:8,
    alignItems:'center'
  },
  tabText:{
    fontSize:12,
    fontWeight:'800'
  },
  count:{
    fontSize:12,
    marginTop:2
  },
  mutualHeader:{
    alignItems:'center'
  },
  mutualBadge:{
    paddingVertical:7,
    paddingHorizontal:12,
    borderRadius:14
  },
  hero:{
    alignItems:'center',
    gap:5,
    paddingVertical:4
  },
  heroNameRow:{
    flexDirection:'row',
    alignItems:'center',
    gap:6,
    marginTop:4
  },
  heroName:{
    fontSize:24,
    lineHeight:30,
    fontWeight:'800'
  },
  location:{
    fontSize:14,
    textAlign:'center'
  },
  faceVerified:{
    fontSize:12,
    fontWeight:'800',
    marginTop:2
  },
  verifiedDot:{
    position:'absolute',
    right:2,
    bottom:2,
    width:28,
    height:28,
    borderRadius:14,
    borderWidth:3,
    alignItems:'center',
    justifyContent:'center'
  },
  verifiedDotText:{
    color:'#fff',
    fontSize:14,
    fontWeight:'900'
  },
  blueCheck:{
    fontSize:17,
    fontWeight:'900'
  },
  smallVerified:{
    fontSize:11,
    fontWeight:'800',
    marginTop:2
  },
  matchMessage:{
    borderWidth:1,
    borderRadius:16,
    padding:14,
    gap:5,
    alignItems:'center'
  },
  matchTitle:{
    fontSize:16,
    fontWeight:'800',
    textAlign:'center'
  },
  matchBody:{
    fontSize:14,
    lineHeight:20,
    textAlign:'center'
  },
  topRow:{
    flexDirection:'row',
    justifyContent:'flex-end'
  },
  status:{
    paddingVertical:6,
    paddingHorizontal:10,
    borderRadius:12
  },
  identity:{
    flexDirection:'row',
    gap:12,
    alignItems:'center'
  },
  identityText:{
    flex:1,
    gap:2
  },
  nameRow:{
    flexDirection:'row',
    alignItems:'center',
    gap:6,
    flexWrap:'wrap'
  },
  photoFallback:{
    alignItems:'center',
    justifyContent:'center'
  },
  signals:{
    flexDirection:'row',
    gap:10
  },
  signal:{
    flex:1,
    borderRadius:14,
    padding:12
  },
  signalValue:{
    fontSize:20,
    fontWeight:'800'
  },
  signalLabel:{
    fontSize:12,
    marginTop:2
  },
  notice:{
    borderWidth:1,
    borderRadius:14,
    padding:12,
    gap:4
  }
});
