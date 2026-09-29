import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {api,profilePhoto} from '@/src/lib/api';
import {Body,Button,Card,H2,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';
import {auth} from '@/src/lib/firebase';

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

type D={
  eligible:boolean;
  candidates:Candidate[];
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
  const [d,setD]=useState<D|null>(null);
  const [err,setErr]=useState('');
  const [busy,setBusy]=useState(false);

  const [ageRange,setAgeRange]=useState<AgeRange>('all');
  const [location,setLocation]=useState('');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [failedPhotos,setFailedPhotos]=useState<Record<string,boolean>>({});
  const [photoAuthToken,setPhotoAuthToken]=useState<string|null>(null);

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
      setD(await api<D>('/api/discovery'));
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

  async function act(uid:string,action:string){
    try{
      setErr('');

      await api('/api/interests',{
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
    }catch(e){
      setErr(e instanceof Error?e.message:'Unable to save choice');
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

  return (
    <Screen
      eyebrow="ATLAS DAILY DISCOVERY"
      title="People worth considering"
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={load}
            tintColor={colors.blue}
          />
        }
        contentContainerStyle={{
          gap:14,
          paddingBottom:110
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{
          flexDirection:'row',
          alignItems:'center',
          justifyContent:'space-between',
          gap:12
        }}>
          <View style={{flex:1}}>
            <Body>
              A considered set of introductions selected from your profile and Atlas relationship signals.
            </Body>
          </View>

          <Pressable
            onPress={()=>setFiltersOpen(v=>!v)}
            style={{
              borderWidth:1,
              borderColor:filtersActive?colors.blue:colors.muted,
              borderRadius:18,
              paddingHorizontal:13,
              paddingVertical:8,
              backgroundColor:filtersActive?colors.blue:colors.card
            }}
          >
            <Text style={{
              color:filtersActive?'#fff':colors.text,
              fontWeight:'800',
              fontSize:13
            }}>
              {filtersActive?'Filters •':'Filters'}
            </Text>
          </Pressable>
        </View>

        {filtersOpen?(
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
          <Card>
            <H2>Complete your journey</H2>
            <Body>
              Discovery opens when your profile, authenticity and Atlas relationship signals are ready.
            </Body>
          </Card>
        ):null}

        {d?.eligible&&d.candidates.length===0?(
          <Card>
            <H2>Atlas is looking</H2>
            <Body>
              Your profile is live. No filler profiles are shown while there is no suitable introduction.
            </Body>
          </Card>
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
              </View>
            ):null}

            <Button
              title="Interested ♥"
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
