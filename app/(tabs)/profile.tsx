import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Image,Pressable,ScrollView,Switch,Text,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {signOut} from 'firebase/auth';
import {doc,getDoc,serverTimestamp,updateDoc} from 'firebase/firestore';
import {router,useFocusEffect} from 'expo-router';
import {auth,db} from '@/src/lib/firebase';
import {useAuth} from '@/src/context/Auth';
import {Body,Button,Card,H2,Input,Loading,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';
import {ThemeMode} from '@/src/lib/theme';
import {api,profilePhoto} from '@/src/lib/api';
import {enablePushNotifications,notificationPermissionStatus} from '@/src/lib/notifications';

type Account={
  privacy?:{
    discoveryEnabled?:boolean;
    showAge?:boolean;
    showLocation?:boolean;
    showOccupation?:boolean;
  };
  verification?:{
    identityVerified?:boolean;
    livenessVerified?:boolean;
    photoVerified?:boolean;
  };
};

type Form={
  firstName:string;
  preferredName:string;
  age:string;
  generalLocation:string;
  occupation:string;
  aboutMe:string;
};

const empty:Form={
  firstName:'',
  preferredName:'',
  age:'',
  generalLocation:'',
  occupation:'',
  aboutMe:''
};

const API_BASE=(
  process.env.EXPO_PUBLIC_API_BASE_URL||
  'https://mip.chat'
).replace(/\/$/,'');

export default function Profile(){
  const {user}=useAuth();
  const {mode,setMode,colors}=useAppTheme();

  const [form,setForm]=useState<Form>(empty);
  const [account,setAccount]=useState<Account|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const [pushStatus,setPushStatus]=useState('Checking...');
  const [verificationBusy,setVerificationBusy]=useState(false);
  const [pushBusy,setPushBusy]=useState(false);
  const [photoBusy,setPhotoBusy]=useState(false);
  const [photoVersion,setPhotoVersion]=useState(Date.now());
  const [photoAuthToken,setPhotoAuthToken]=useState<string|null>(null);

  useEffect(()=>{
    let active=true;

    if(!user){
      setPhotoAuthToken(null);
      return ()=>{active=false;};
    }

    void user.getIdToken()
      .then(token=>{
        if(active)setPhotoAuthToken(token);
      })
      .catch(error=>{
        console.warn('[ProfilePhoto] unable to get image auth token',error);
        if(active)setPhotoAuthToken(null);
      });

    return ()=>{active=false;};
  },[user,photoVersion]);

  useEffect(()=>{
    void notificationPermissionStatus()
      .then(x=>setPushStatus(
        x==='granted'
          ?'Enabled'
          :x==='denied'
          ?'Blocked in iOS Settings'
          :'Not enabled'
      ))
      .catch(()=>setPushStatus('Not enabled'));
  },[]);

  const load=useCallback(async()=>{
    if(!user||!db)return;

    try{
      setLoading(true);
      setMessage('');

      const [snap,a]=await Promise.all([
        getDoc(doc(db,'profiles',user.uid)),
        api<Account>('/api/account')
      ]);

      if(snap.exists()){
        const p=snap.data();

        setForm({
          firstName:p.firstName??'',
          preferredName:p.preferredName??'',
          age:p.age?String(p.age):'',
          generalLocation:p.generalLocation??'',
          occupation:p.occupation??'',
          aboutMe:p.aboutMe??''
        });
      }

      setAccount(a);
      setPhotoVersion(Date.now());
    }catch(e){
      setMessage(
        e instanceof Error
          ?e.message
          :'Unable to load profile.'
      );
    }finally{
      setLoading(false);
    }
  },[user]);

  useFocusEffect(
    useCallback(()=>{
      void load();
    },[load])
  );

  const verified=useMemo(
    ()=>[
      account?.verification?.identityVerified,
      account?.verification?.livenessVerified,
      account?.verification?.photoVerified
    ].filter(Boolean).length,
    [account]
  );

  const profileComplete=useMemo(
    ()=>[
      form.firstName,
      form.age,
      form.generalLocation,
      form.occupation,
      form.aboutMe
    ].filter(x=>String(x).trim()).length,
    [form]
  );

  function change(k:keyof Form,v:string){
    setForm(x=>({...x,[k]:v}));
  }

  async function changeProfilePhoto(){
    if(!user||photoBusy)return;

    try{
      console.log('[ProfilePhoto] changeProfilePhoto started');

      setPhotoBusy(true);
      setMessage('');

      console.log('[ProfilePhoto] requesting photo permission');

      const permission=
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      console.log('[ProfilePhoto] permission:',permission.granted);

      if(!permission.granted){
        setMessage(
          'Photo library access is required to choose a profile photo.'
        );
        return;
      }

      console.log('[ProfilePhoto] opening image picker');

      const result=await ImagePicker.launchImageLibraryAsync({
        mediaTypes:['images'],
        allowsEditing:true,
        aspect:[1,1],
        quality:0.85
      });

      console.log('[ProfilePhoto] picker returned',{
        canceled:result.canceled,
        assetCount:result.assets?.length||0
      });

      if(result.canceled||!result.assets?.length){
        console.log('[ProfilePhoto] selection cancelled');
        return;
      }

      const asset=result.assets[0];

      console.log('[ProfilePhoto] selected asset',{
        uri:asset.uri,
        fileName:asset.fileName,
        mimeType:asset.mimeType,
        width:asset.width,
        height:asset.height,
        fileSize:asset.fileSize
      });

      if(!asset.uri){
        throw new Error('PHOTO_SELECTION_FAILED');
      }

      console.log('[ProfilePhoto] getting Firebase token');

      const token=auth?.currentUser
        ?await auth.currentUser.getIdToken()
        :null;

      if(!token){
        throw new Error('AUTH_REQUIRED');
      }

      console.log('[ProfilePhoto] Firebase token acquired');

      const filename=
        asset.fileName||
        `profile-${Date.now()}.jpg`;

      const mimeType=
        asset.mimeType||
        (filename.toLowerCase().endsWith('.png')
          ?'image/png'
          :filename.toLowerCase().endsWith('.webp')
          ?'image/webp'
          :'image/jpeg');

      console.log('[ProfilePhoto] reading selected image');

      const imageResponse=await fetch(asset.uri);

      if(!imageResponse.ok){
        throw new Error('PHOTO_READ_FAILED');
      }

      const imageBlob=await imageResponse.blob();

      console.log('[ProfilePhoto] image blob created',{
        size:imageBlob.size,
        type:imageBlob.type
      });

      const formData=new FormData();

      formData.append(
        'photo',
        imageBlob,
        filename
      );

      const uploadUrl=
        `${API_BASE}/api/profile-photo/${encodeURIComponent(user.uid)}`;

      console.log('[ProfilePhoto] starting upload',{
        url:uploadUrl,
        filename,
        mimeType
      });

      const response=await fetch(
        uploadUrl,
        {
          method:'POST',
          headers:{
            Authorization:`Bearer ${token}`
          },
          body:formData
        }
      );

      console.log(
        '[ProfilePhoto] server responded with status:',
        response.status
      );

      const responseText=await response.text();

      console.log(
        '[ProfilePhoto] upload response:',
        responseText
      );

      let body:any={};

      try{
        body=responseText
          ?JSON.parse(responseText)
          :{};
      }catch{
        body={
          message:responseText
        };
      }

      if(!response.ok){
        throw new Error(
          body?.message||
          body?.error||
          `PHOTO_UPLOAD_FAILED_${response.status}`
        );
      }

      console.log('[ProfilePhoto] upload successful',body);

      setMessage(
        body?.verificationReset
          ?'Profile photo updated. Face verification has been reset because your primary photo changed.'
          :'Profile photo updated successfully.'
      );

      setPhotoVersion(Date.now());

      await load();

      console.log('[ProfilePhoto] profile refreshed');

    }catch(error){
      console.error('[ProfilePhoto] upload failed:',error);

      const raw=
        error instanceof Error
          ?error.message
          :'Unable to upload profile photo.';

      if(raw==='AUTH_REQUIRED'){
        setMessage(
          'Please sign in again before changing your profile photo.'
        );
      }else if(raw==='PHOTO_SELECTION_FAILED'){
        setMessage(
          'The selected photo could not be read. Please choose another photo.'
        );
      }else if(raw==='PROFILE_PHOTO_REQUIRED'){
        setMessage(
          'The profile photo could not be stored. Please try again.'
        );
      }else{
        setMessage(
          `Photo upload failed: ${raw}`
        );
      }

    }finally{
      setPhotoBusy(false);
      console.log('[ProfilePhoto] changeProfilePhoto finished');
    }
  }

  async function save(){
    if(!user||!db||saving)return;

    const age=Number(form.age);

    if(
      !form.firstName.trim()||
      !form.generalLocation.trim()||
      !form.aboutMe.trim()
    ){
      setMessage(
        'First name, location and About me are required.'
      );
      return;
    }

    if(!Number.isInteger(age)||age<18||age>100){
      setMessage('Enter an age between 18 and 100.');
      return;
    }

    try{
      setSaving(true);
      setMessage('');

      await updateDoc(
        doc(db,'profiles',user.uid),
        {
          firstName:form.firstName.trim(),
          preferredName:form.preferredName.trim(),
          age,
          generalLocation:form.generalLocation.trim(),
          occupation:form.occupation.trim(),
          aboutMe:form.aboutMe.trim(),
          updatedAt:serverTimestamp()
        }
      );

      setMessage('Profile saved.');
    }catch(e){
      setMessage(
        e instanceof Error
          ?e.message
          :'Unable to save profile.'
      );
    }finally{
      setSaving(false);
    }
  }

  async function privacy(
    key:
      |'discoveryEnabled'
      |'showAge'
      |'showLocation'
      |'showOccupation',
    value:boolean
  ){
    try{
      setMessage('');

      await api('/api/account',{
        method:'PATCH',
        body:JSON.stringify({[key]:value})
      });

      setAccount(a=>({
        ...a,
        privacy:{
          ...a?.privacy,
          [key]:value
        }
      }));
    }catch(e){
      setMessage(
        e instanceof Error
          ?e.message
          :'Unable to update privacy setting.'
      );
    }
  }

  async function enableNotifications(){
    try{
      setPushBusy(true);
      setMessage('');

      await enablePushNotifications();

      setPushStatus('Enabled');
      setMessage(
        'Mobile notifications enabled on this device.'
      );
    }catch(e){
      const raw=
        e instanceof Error
          ?e.message
          :'Unable to enable notifications.';

      setMessage(
        raw==='NOTIFICATION_PERMISSION_DENIED'
          ?'Notifications are blocked. Enable them for AutoFace in iOS Settings.'
          :raw==='EAS_PROJECT_ID_MISSING'
          ?'Push notifications need an EAS project ID.'
          :raw
      );
    }finally{
      setPushBusy(false);
    }
  }

  async function startVerification(){
    if(verificationBusy)return;

    setVerificationBusy(true);
    setMessage('');
    router.push('/verification');
    setVerificationBusy(false);
  }

  async function refreshVerification(){
    await load();
    setMessage('Verification status refreshed.');
  }

  async function out(){
    if(auth)await signOut(auth);
    router.replace('/(auth)/sign-in');
  }

  const choices:ThemeMode[]=[
    'system',
    'light',
    'dark'
  ];

  if(loading){
    return (
      <Screen eyebrow="MY AUTOFACE" title="Profile">
        <Loading/>
      </Screen>
    );
  }

  return (
    <Screen eyebrow="MY AUTOFACE" title="Profile">
      <ScrollView
        contentContainerStyle={{
          gap:12,
          paddingBottom:110
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <View
            style={{
              flexDirection:'row',
              gap:14,
              alignItems:'center'
            }}
          >
            {user?(
              <Image
                source={{
                  uri:`${profilePhoto(user.uid)}?v=${photoVersion}`,
                  headers:photoAuthToken
                    ?{Authorization:`Bearer ${photoAuthToken}`}
                    :undefined
                }}
                style={{
                  width:82,
                  height:82,
                  borderRadius:41,
                  backgroundColor:colors.photo
                }}
              />
            ):null}

            <View style={{flex:1,gap:3}}>
              <H2>
                {form.preferredName||
                 form.firstName||
                 user?.displayName||
                 'Your account'}
              </H2>

              <Body>{user?.email}</Body>

              <Text
                style={{
                  color:colors.blue,
                  fontWeight:'800'
                }}
              >
                {profileComplete}/5 profile details complete
              </Text>
            </View>
          </View>

          <Button
            title={
              photoBusy
                ?'Uploading photo...'
                :'Choose / change profile photo'
            }
            disabled={photoBusy}
            onPress={changeProfilePhoto}
          />

          <Body>
            Your primary profile photo is also used as the reference
            image when you choose Face Verification.
          </Body>
        </Card>

        <Card>
          <H2>Authenticity & verification</H2>

          <Body>
            Verification helps other members understand which
            authenticity checks your account has completed.
          </Body>

          <View
            style={{
              flexDirection:'row',
              alignItems:'center',
              justifyContent:'space-between'
            }}
          >
            <Text
              style={{
                color:colors.text,
                fontWeight:'800',
                fontSize:16
              }}
            >
              {verified} of 3 checks complete
            </Text>

            <Text
              style={{
                color:verified===3
                  ?colors.green
                  :colors.blue,
                fontWeight:'800'
              }}
            >
              {verified===3
                ?'Complete'
                :`${Math.round(verified/3*100)}%`}
            </Text>
          </View>

          <View
            style={{
              height:8,
              borderRadius:999,
              backgroundColor:colors.line,
              overflow:'hidden'
            }}
          >
            <View
              style={{
                height:8,
                width:`${Math.round(verified/3*100)}%`,
                backgroundColor:verified===3
                  ?colors.green
                  :colors.blue
              }}
            />
          </View>

          <VerificationRow
            title="Photo"
            detail="Profile photo authenticity check"
            ok={account?.verification?.photoVerified}
          />

          <VerificationRow
            title="Liveness"
            detail="Amazon Rekognition check for a live person"
            ok={account?.verification?.livenessVerified}
          />

          <VerificationRow
            title="Identity"
            detail="AutoFace identity/authenticity status"
            ok={account?.verification?.identityVerified}
          />

          <Body>
            {verified===3
              ?'Your available authenticity checks are complete.'
              :'Pending checks remain visible as pending; AutoFace does not treat them as completed until the backend verifies them.'}
          </Body>

          <Button
            title={
              verificationBusy
                ?'Opening secure check...'
                :verified===3
                ?'Verify again'
                :verified>0
                ?'Continue face verification'
                :'Start face verification'
            }
            disabled={verificationBusy}
            onPress={startVerification}
          />

          <Button
            title="Refresh verification"
            secondary
            onPress={refreshVerification}
          />

          <Body>
            Face verification compares a live check with your profile
            photo. AutoFace displays the trusted backend outcome rather
            than calculating a verification result on the phone.
          </Body>
        </Card>

        <Card>
          <H2>Profile details</H2>

          <Body>
            Edit the key details used across your AutoFace profile.
          </Body>

          <Input
            placeholder="First name"
            value={form.firstName}
            onChangeText={v=>change('firstName',v)}
          />

          <Input
            placeholder="Preferred name (optional)"
            value={form.preferredName}
            onChangeText={v=>change('preferredName',v)}
          />

          <Input
            placeholder="Age"
            keyboardType="number-pad"
            value={form.age}
            onChangeText={v=>change('age',v)}
          />

          <Input
            placeholder="General location"
            value={form.generalLocation}
            onChangeText={v=>change('generalLocation',v)}
          />

          <Input
            placeholder="Occupation"
            value={form.occupation}
            onChangeText={v=>change('occupation',v)}
          />

          <Input
            placeholder="About me"
            multiline
            value={form.aboutMe}
            onChangeText={v=>change('aboutMe',v)}
            style={{
              minHeight:110,
              textAlignVertical:'top'
            }}
          />

          <Button
            title={saving?'Saving...':'Save profile'}
            disabled={saving}
            onPress={save}
          />

          {message?(
            <Body error>{message}</Body>
          ):null}
        </Card>

        <Card>
          <H2>Privacy & discovery</H2>

          <Body>
            Control whether you can be considered for introductions
            and what other members can see.
          </Body>

          <Toggle
            label="Appear in Discovery"
            value={account?.privacy?.discoveryEnabled??false}
            onChange={v=>privacy('discoveryEnabled',v)}
          />

          <Toggle
            label="Show age"
            value={account?.privacy?.showAge??true}
            onChange={v=>privacy('showAge',v)}
          />

          <Toggle
            label="Show location"
            value={account?.privacy?.showLocation??true}
            onChange={v=>privacy('showLocation',v)}
          />

          <Toggle
            label="Show occupation"
            value={account?.privacy?.showOccupation??true}
            onChange={v=>privacy('showOccupation',v)}
          />
        </Card>

        <Card>
          <H2>Appearance</H2>

          <Body>
            Choose how AutoFace looks on this device.
          </Body>

          <View
            style={{
              flexDirection:'row',
              gap:8,
              flexWrap:'wrap'
            }}
          >
            {choices.map(x=>(
              <Pressable
                key={x}
                onPress={()=>setMode(x)}
                style={{
                  paddingVertical:10,
                  paddingHorizontal:14,
                  borderRadius:12,
                  borderWidth:1,
                  borderColor:mode===x
                    ?colors.blue
                    :colors.line,
                  backgroundColor:mode===x
                    ?colors.pale
                    :colors.card
                }}
              >
                <Text
                  style={{
                    color:mode===x
                      ?colors.blue
                      :colors.text,
                    fontWeight:'700',
                    textTransform:'capitalize'
                  }}
                >
                  {x}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <H2>Mobile notifications</H2>

          <Body>
            Get an iPhone notification for new introductions,
            messages and connection updates.
          </Body>

          <Body>Status: {pushStatus}</Body>

          <Button
            title={
              pushBusy
                ?'Enabling...'
                :pushStatus==='Enabled'
                ?'Notifications enabled'
                :'Enable notifications'
            }
            disabled={
              pushBusy||
              pushStatus==='Enabled'
            }
            onPress={enableNotifications}
          />
        </Card>

        <Button
          title="Sign out"
          secondary
          onPress={out}
        />
      </ScrollView>
    </Screen>
  );
}

function Toggle({
  label,
  value,
  onChange
}:{
  label:string;
  value:boolean;
  onChange:(v:boolean)=>void;
}){
  const {colors}=useAppTheme();

  return (
    <View
      style={{
        flexDirection:'row',
        alignItems:'center',
        justifyContent:'space-between',
        gap:12
      }}
    >
      <Text
        style={{
          color:colors.text,
          fontSize:16,
          flex:1
        }}
      >
        {label}
      </Text>

      <Switch
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

function VerificationRow({
  title,
  detail,
  ok
}:{
  title:string;
  detail:string;
  ok?:boolean;
}){
  const {colors}=useAppTheme();

  return (
    <View
      style={{
        flexDirection:'row',
        alignItems:'center',
        gap:12,
        paddingVertical:7
      }}
    >
      <View
        style={{
          width:34,
          height:34,
          borderRadius:17,
          alignItems:'center',
          justifyContent:'center',
          backgroundColor:ok
            ?colors.pale
            :colors.card,
          borderWidth:1,
          borderColor:ok
            ?colors.green
            :colors.line
        }}
      >
        <Text
          style={{
            color:ok
              ?colors.green
              :colors.muted,
            fontWeight:'900'
          }}
        >
          {ok?'✓':'·'}
        </Text>
      </View>

      <View style={{flex:1}}>
        <Text
          style={{
            color:colors.text,
            fontWeight:'800'
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color:colors.muted,
            fontSize:13
          }}
        >
          {detail}
        </Text>
      </View>

      <Text
        style={{
          color:ok
            ?colors.green
            :colors.muted,
          fontWeight:'800'
        }}
      >
        {ok?'Verified':'Pending'}
      </Text>
    </View>
  );
}
