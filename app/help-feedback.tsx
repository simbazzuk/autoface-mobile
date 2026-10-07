import React,{useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import {router} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {Screen,Card,H2,Body,Button} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';
import {api} from '@/src/lib/api';

type Mode='feedback'|'support';

const feedbackTypes=[
  {id:'general',label:'General feedback'},
  {id:'bug',label:'Report a bug'},
  {id:'feature',label:'Suggest a feature'},
  {id:'safety',label:'Safety concern'}
];

const supportTypes=[
  {id:'account',label:'Account'},
  {id:'profile_verification',label:'Profile & verification'},
  {id:'discovery',label:'Discover & introductions'},
  {id:'messages',label:'Messages'},
  {id:'atlas',label:'Atlas'},
  {id:'membership',label:'Membership'},
  {id:'technical',label:'Technical problem'},
  {id:'other',label:'Something else'}
];

export default function HelpFeedback(){
  const {colors}=useAppTheme();

  const [mode,setMode]=useState<Mode>('feedback');
  const [category,setCategory]=useState('general');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  const options=
    mode==='feedback'
      ?feedbackTypes
      :supportTypes;

  function changeMode(next:Mode){
    setMode(next);
    setCategory(
      next==='feedback'
        ?'general'
        :'account'
    );
    setMessage('');
  }

  async function submit(){
    const trimmed=message.trim();

    if(trimmed.length<5){
      Alert.alert(
        'Add a little more detail',
        'Please tell us a little more so we can help.'
      );
      return;
    }

    try{
      setBusy(true);

      await api(
        mode==='feedback'
          ?'/api/feedback'
          :'/api/support',
        {
          method:'POST',
          body:JSON.stringify({
            category,
            message:trimmed,
            platform:'ios',
            appVersion:'0.1.20',
            buildNumber:'65'
          })
        }
      );

      Alert.alert(
        mode==='feedback'
          ?'Thank you'
          :'Request received',
        mode==='feedback'
          ?'Thanks for helping us improve AutoFace.'
          :'Your support request has been received.',
        [
          {
            text:'Done',
            onPress:()=>router.back()
          }
        ]
      );

      setMessage('');
    }catch(error){
      Alert.alert(
        'Unable to send',
        error instanceof Error
          ?error.message
          :'Please try again.'
      );
    }finally{
      setBusy(false);
    }
  }

  return(
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding:18,
          paddingBottom:32,
          gap:10
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection:'row',
            alignItems:'center',
            gap:12
          }}
        >
          <Pressable
            onPress={()=>router.back()}
            hitSlop={12}
            style={{
              width:40,
              height:40,
              alignItems:'center',
              justifyContent:'center',
              borderRadius:20,
              backgroundColor:colors.card
            }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.text}
            />
          </Pressable>

          <View style={{flex:1}}>
            <Text
              style={{
                color:colors.text,
                fontSize:24,
                fontWeight:'800'
              }}
            >
              Help & feedback
            </Text>

            <Text
              style={{
                color:colors.muted,
                marginTop:2
              }}
            >
              Tell us what you think or get help with AutoFace.
            </Text>
          </View>
        </View>

        <Card>
          <View
            style={{
              flexDirection:'row',
              gap:8
            }}
          >
            <ModeButton
              title="Send feedback"
              icon="chatbubble-ellipses-outline"
              selected={mode==='feedback'}
              onPress={()=>changeMode('feedback')}
              colors={colors}
            />

            <ModeButton
              title="Contact support"
              icon="help-circle-outline"
              selected={mode==='support'}
              onPress={()=>changeMode('support')}
              colors={colors}
            />
          </View>
        </Card>

        <Card>
          <H2>
            {mode==='feedback'
              ?'What would you like to share?'
              :'What can we help with?'}
          </H2>

          <Body>
            {mode==='feedback'
              ?'Your feedback helps us make AutoFace better.'
              :'Choose the area that best describes your question.'}
          </Body>

          <View
            style={{
              flexDirection:'row',
              flexWrap:'wrap',
              gap:8,
              marginTop:8
            }}
          >
            {options.map(option=>{
              const selected=category===option.id;

              return(
                <Pressable
                  key={option.id}
                  onPress={()=>setCategory(option.id)}
                  style={{
                    paddingVertical:9,
                    paddingHorizontal:12,
                    borderRadius:12,
                    borderWidth:1,
                    borderColor:selected
                      ?colors.blue
                      :colors.line,
                    backgroundColor:selected
                      ?colors.pale
                      :colors.card
                  }}
                >
                  <Text
                    style={{
                      color:selected
                        ?colors.blue
                        :colors.text,
                      fontWeight:'700'
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode==='feedback' && category==='safety' && (
            <View
              style={{
                marginTop:10,
                padding:12,
                borderRadius:12,
                backgroundColor:colors.pale
              }}
            >
              <Text
                style={{
                  color:colors.text,
                  fontSize:13,
                  lineHeight:19
                }}
              >
                If someone is in immediate danger, contact the
                appropriate emergency service. You can use this form
                to tell us about a safety concern involving AutoFace.
              </Text>
            </View>
          )}

          <Text
            style={{
              color:colors.text,
              fontWeight:'700',
              marginTop:12,
              marginBottom:8
            }}
          >
            {mode==='feedback'
              ?'Tell us more'
              :'Describe the problem'}
          </Text>

          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            placeholder={
              mode==='feedback'
                ?'Share your feedback...'
                :'Tell us what happened and how we can help...'
            }
            placeholderTextColor={colors.muted}
            style={{
              minHeight:120,
              borderWidth:1,
              borderColor:colors.line,
              borderRadius:14,
              padding:14,
              color:colors.text,
              backgroundColor:colors.card,
              fontSize:16
            }}
          />

          <Text
            style={{
              color:colors.muted,
              fontSize:12,
              textAlign:'right',
              marginTop:6
            }}
          >
            {message.length}/2000
          </Text>

          <Button
            title={
              busy
                ?'Sending...'
                :mode==='feedback'
                ?'Send feedback'
                :'Contact support'
            }
            disabled={busy}
            onPress={submit}
          />
        </Card>

        <Text
          style={{
            color:colors.muted,
            fontSize:12,
            lineHeight:18,
            textAlign:'center',
            paddingHorizontal:12
          }}
        >
          Your account identifier and app version are included
          automatically so we can investigate problems.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function ModeButton({
  title,
  icon,
  selected,
  onPress,
  colors
}:{
  title:string;
  icon:any;
  selected:boolean;
  onPress:()=>void;
  colors:any;
}){
  return(
    <Pressable
      onPress={onPress}
      style={{
        flex:1,
        minHeight:66,
        padding:10,
        borderRadius:14,
        borderWidth:1,
        borderColor:selected
          ?colors.blue
          :colors.line,
        backgroundColor:selected
          ?colors.pale
          :colors.card,
        justifyContent:'center',
        gap:6
      }}
    >
      <Ionicons
        name={icon}
        size={21}
        color={
          selected
            ?colors.blue
            :colors.text
        }
      />

      <Text
        style={{
          color:selected
            ?colors.blue
            :colors.text,
          fontWeight:'800'
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
