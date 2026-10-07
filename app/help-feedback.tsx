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

type FaqItem={
  id:string;
  question:string;
  answer:string;
};

const faqItems:FaqItem[]=[
  {
    id:'about',
    question:'What is AutoFace?',
    answer:'AutoFace is designed around considered, private introductions rather than endless swiping. Your profile, preferences and Atlas information help create more meaningful introductions.'
  },
  {
    id:'verification',
    question:'What is Face Verification?',
    answer:'Face Verification helps confirm that a real, live person matches the profile photo on their AutoFace account. A verified profile is shown with the Face Verified status.'
  },
  {
    id:'biometric',
    question:'Why do I need to give biometric consent?',
    answer:'Consent is requested before AutoFace performs a new face verification check. The check uses camera liveness and compares the resulting reference image with your profile photo. If your current profile is already Face Verified, you do not need to complete another biometric check.'
  },
  {
    id:'atlas',
    question:'What is Atlas?',
    answer:'Atlas helps you describe what matters to you in a relationship, including values, preferences and relationship expectations. It supports explainable compatibility and optional AI insights. Atlas does not change your Face Verification status.'
  },
  {
    id:'discovery',
    question:'How does Discovery work?',
    answer:'Discovery uses your profile, introduction preferences and compatibility information to help surface suitable people. Your preferences guide recommendations rather than simply creating a public swipe-style list.'
  },
  {
    id:'introductions',
    question:'How do Introductions work?',
    answer:'You can express interest in someone suggested through Discovery. A private connection becomes available when interest is mutual, allowing both people to start a conversation.'
  },
  {
    id:'block',
    question:'What happens when I block someone?',
    answer:'Blocking ends the connection and prevents that person from contacting you through the existing conversation. You can review people you have blocked from Profile under Privacy & discovery.'
  },
  {
    id:'unblock',
    question:'What happens if I unblock someone?',
    answer:'Unblocking removes the block but does not restore the previous connection or conversation. You may become eligible to discover each other again, and both people would need to express interest again to create a new connection.'
  },
  {
    id:'report',
    question:'How do I report someone?',
    answer:'Open the conversation and choose Safety, then Report. You can select the reason for the report and choose to block the person at the same time.'
  },
  {
    id:'support',
    question:'How do I contact AutoFace?',
    answer:'Use Contact support below for help with your account, verification, Discovery, messages, Atlas, membership or a technical problem. You can also use Send feedback to suggest improvements or report a bug.'
  }
];

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
  const [openFaq,setOpenFaq]=useState<string|null>(null);
  const [aboutOpen,setAboutOpen]=useState(false);

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
            buildNumber:'68'
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

        <Pressable
          accessibilityRole="button"
          accessibilityState={{expanded:aboutOpen}}
          onPress={()=>setAboutOpen(v=>!v)}
          style={{
            backgroundColor:colors.pink,
            borderRadius:24,
            padding:20,
            marginTop:8,
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
                width:46,
                height:46,
                borderRadius:23,
                backgroundColor:'rgba(255,255,255,0.18)',
                alignItems:'center',
                justifyContent:'center',
                marginRight:14
              }}
            >
              <Ionicons
                name="heart"
                size={23}
                color="#FFFFFF"
              />
            </View>

            <View style={{flex:1}}>
              <Text
                style={{
                  color:'#FFFFFF',
                  fontSize:11,
                  fontWeight:'900',
                  letterSpacing:1.2,
                  opacity:0.9
                }}
              >
                ABOUT AUTOFACE
              </Text>

              <Text
                style={{
                  color:'#FFFFFF',
                  fontSize:21,
                  lineHeight:26,
                  fontWeight:'900',
                  marginTop:4
                }}
              >
                A more considered way to connect
              </Text>

              {!aboutOpen?(
                <Text
                  style={{
                    color:'#FFFFFF',
                    fontSize:13,
                    lineHeight:19,
                    marginTop:7,
                    opacity:0.9
                  }}
                >
                  Compatibility, mutual interest and meaningful introductions.
                </Text>
              ):null}
            </View>

            <Ionicons
              name={aboutOpen?'chevron-up':'chevron-down'}
              size={20}
              color="#FFFFFF"
              style={{marginLeft:8,marginTop:3}}
            />
          </View>

          {aboutOpen?(
            <View
              style={{
                marginTop:18,
                paddingTop:17,
                borderTopWidth:1,
                borderTopColor:'rgba(255,255,255,0.28)'
              }}
            >
              <Text
                style={{
                  color:'#FFFFFF',
                  fontSize:14,
                  lineHeight:21,
                  fontWeight:'600'
                }}
              >
                AutoFace is designed around considered connections rather
                than endless swiping. Discovery brings together your profile,
                preferences and compatibility signals to help you find people
                who may be worth getting to know.
              </Text>

              <View
                style={{
                  marginTop:16,
                  backgroundColor:'rgba(255,255,255,0.14)',
                  borderRadius:16,
                  padding:14
                }}
              >
                <Text
                  style={{
                    color:'#FFFFFF',
                    fontSize:13,
                    lineHeight:20,
                    fontWeight:'900',
                    textAlign:'center'
                  }}
                >
                  Discover → Interest → Introduction → Conversation
                </Text>
              </View>

              {[
                {
                  icon:'sparkles-outline',
                  title:'Considered Discovery',
                  text:'Discover people using your preferences and meaningful compatibility signals.'
                },
                {
                  icon:'heart-outline',
                  title:'Private interest',
                  text:'Express interest privately. A connection only moves forward when interest becomes mutual.'
                },
                {
                  icon:'people-outline',
                  title:'Meaningful introductions',
                  text:'Mutual interest creates an introduction and gives both people the choice to start a conversation.'
                },
                {
                  icon:'compass-outline',
                  title:'Atlas',
                  text:'Atlas helps explain compatibility and supports you along the journey while keeping you in control.'
                }
              ].map(item=>(
                <View
                  key={item.title}
                  style={{
                    flexDirection:'row',
                    alignItems:'flex-start',
                    marginTop:16
                  }}
                >
                  <View
                    style={{
                      width:34,
                      height:34,
                      borderRadius:17,
                      backgroundColor:'rgba(255,255,255,0.16)',
                      alignItems:'center',
                      justifyContent:'center',
                      marginRight:11
                    }}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={17}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={{flex:1}}>
                    <Text
                      style={{
                        color:'#FFFFFF',
                        fontSize:14,
                        fontWeight:'900'
                      }}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={{
                        color:'#FFFFFF',
                        fontSize:12,
                        lineHeight:18,
                        marginTop:3,
                        opacity:0.88
                      }}
                    >
                      {item.text}
                    </Text>
                  </View>
                </View>
              ))}

              <Text
                style={{
                  color:'#FFFFFF',
                  fontSize:12,
                  lineHeight:18,
                  marginTop:18,
                  opacity:0.82
                }}
              >
                AutoFace and Atlas support your decisions — they don't make
                relationship decisions for you.
              </Text>
            </View>
          ):null}

          <View
            style={{
              flexDirection:'row',
              alignItems:'center',
              marginTop:16
            }}
          >
            <Text
              style={{
                color:'#FFFFFF',
                fontSize:13,
                fontWeight:'900'
              }}
            >
              {aboutOpen?'Show less':'Learn about AutoFace'}
            </Text>

            <Ionicons
              name={aboutOpen?'chevron-up':'chevron-forward'}
              size={16}
              color="#FFFFFF"
              style={{marginLeft:3}}
            />
          </View>
        </Pressable>

        <Card>
          <View
            style={{
              flexDirection:'row',
              alignItems:'center',
              gap:10,
              marginBottom:4
            }}
          >
            <Ionicons
              name="help-circle-outline"
              size={22}
              color={colors.blue}
            />

            <View style={{flex:1}}>
              <H2>Frequently asked questions</H2>
            </View>
          </View>

          <Body>
            Quick answers about AutoFace, verification, privacy and safety.
          </Body>

          <View
            style={{
              marginTop:8,
              gap:2
            }}
          >
            {faqItems.map((item,index)=>{
              const open=openFaq===item.id;

              return(
                <View
                  key={item.id}
                  style={{
                    borderTopWidth:index===0?0:1,
                    borderTopColor:colors.line
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{expanded:open}}
                    onPress={()=>
                      setOpenFaq(current=>
                        current===item.id
                          ?null
                          :item.id
                      )
                    }
                    style={{
                      flexDirection:'row',
                      alignItems:'center',
                      gap:10,
                      paddingVertical:14
                    }}
                  >
                    <Text
                      style={{
                        flex:1,
                        color:colors.text,
                        fontSize:15,
                        fontWeight:'700',
                        lineHeight:21
                      }}
                    >
                      {item.question}
                    </Text>

                    <Ionicons
                      name={
                        open
                          ?'chevron-up'
                          :'chevron-down'
                      }
                      size={18}
                      color={colors.blue}
                    />
                  </Pressable>

                  {open?(
                    <Text
                      style={{
                        color:colors.muted,
                        fontSize:14,
                        lineHeight:21,
                        paddingRight:24,
                        paddingBottom:14
                      }}
                    >
                      {item.answer}
                    </Text>
                  ):null}
                </View>
              );
            })}
          </View>
        </Card>

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
