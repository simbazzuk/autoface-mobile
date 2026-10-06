import React,{useMemo} from 'react';
import {
  Modal,
  Pressable,
  Text,
  View
} from 'react-native';
import {useAppTheme} from '@/src/context/Theme';

export type AtlasDailyThought={
  thought:string;
  today:string;
};

export const ATLAS_DAILY_THOUGHTS:AtlasDailyThought[]=[
  {
    thought:"Compatibility can start a connection. Curiosity is what helps it grow.",
    today:"Ask something you genuinely want to know."
  },
  {
    thought:"Being understood often begins with taking the time to understand.",
    today:"Listen for what someone means, not only what they say."
  },
  {
    thought:"The best connections don't require perfect people. They require honest ones.",
    today:"Let one conversation be a little more genuine."
  },
  {
    thought:"A meaningful connection grows through small moments of attention.",
    today:"Notice something worth asking about."
  },
  {
    thought:"You don't have to impress the right person. Give them the chance to know you.",
    today:"Share something real about yourself."
  },
  {
    thought:"Chemistry can catch your attention. Character is what keeps it.",
    today:"Be curious about the person behind the profile."
  },
  {
    thought:"Sometimes the most attractive thing you can bring to a conversation is presence.",
    today:"Give someone your full attention."
  },
  {
    thought:"Good relationships aren't discovered fully formed. They're built conversation by conversation.",
    today:"Start with one thoughtful question."
  },
  {
    thought:"A good connection leaves room for two people to be themselves.",
    today:"Notice whether you feel comfortable being yourself."
  },
  {
    thought:"Listening is more than waiting for your turn to speak.",
    today:"Ask one follow-up question before changing the subject."
  },
  {
    thought:"The strongest first impression may simply be making someone feel heard.",
    today:"Listen for the detail they hoped you would notice."
  },
  {
    thought:"You can be interested in someone without rushing to decide where it will lead.",
    today:"Let curiosity come before conclusions."
  },
  {
    thought:"Confidence doesn't need to be loud. Sometimes it's simply being comfortable with who you are.",
    today:"Bring your real personality into the conversation."
  },
  {
    thought:"A boundary isn't a wall. It's a way of showing someone how to meet you well.",
    today:"Be clear about something that matters to you."
  },
  {
    thought:"A connection becomes meaningful when both people have room to contribute.",
    today:"Make space for their story as well as your own."
  },
  {
    thought:"The right pace is the one where both people still feel comfortable.",
    today:"Don't mistake urgency for connection."
  },
  {
    thought:"Kindness is easy to overlook because it rarely asks to be noticed.",
    today:"Pay attention to how someone treats other people."
  },
  {
    thought:"Shared interests give you something to talk about. Shared values can give you something to build on.",
    today:"Ask about something that genuinely matters to them."
  },
  {
    thought:"A thoughtful question can reveal more than a perfect opening line.",
    today:"Ask about a story, not just a fact."
  },
  {
    thought:"Not every good conversation needs to become a relationship to have been worthwhile.",
    today:"Enjoy discovering someone without forcing an outcome."
  },
  {
    thought:"Attraction may be immediate. Trust usually takes its time.",
    today:"Let consistency tell you what chemistry cannot."
  },
  {
    thought:"Someone showing interest in your world is often more meaningful than someone trying to impress you with theirs.",
    today:"Notice where curiosity flows both ways."
  },
  {
    thought:"Vulnerability isn't telling someone everything. It's allowing them to see something real.",
    today:"Share one thing that matters to you."
  },
  {
    thought:"Good communication isn't about always agreeing. It's about feeling safe enough to disagree.",
    today:"Be curious when you encounter a different point of view."
  },
  {
    thought:"Sometimes compatibility is found in similarities. Sometimes it's found in how differences are handled.",
    today:"Notice how a difference makes you feel."
  },
  {
    thought:"The person worth knowing may not be the person with the perfect profile.",
    today:"Leave a little room for surprise."
  },
  {
    thought:"You learn a lot about someone from what they make time for.",
    today:"Notice what seems genuinely important to them."
  },
  {
    thought:"Healthy interest feels like an invitation, not an obligation.",
    today:"Choose connection without abandoning your own pace."
  },
  {
    thought:"There is confidence in saying what you mean with kindness.",
    today:"Be clear rather than trying to say the perfect thing."
  },
  {
    thought:"A relationship isn't only about finding someone interesting. It's about becoming interested in each other's lives.",
    today:"Ask about something they care about."
  },
  {
    thought:"Silence doesn't always need filling. Comfort can live there too.",
    today:"Don't rush every pause."
  },
  {
    thought:"Someone can look right on paper and still not feel right in conversation. Both kinds of information matter.",
    today:"Pay attention to how the interaction actually feels."
  },
  {
    thought:"A small act of consistency can say more than a large promise.",
    today:"Notice actions as much as words."
  },
  {
    thought:"The goal isn't to be liked by everyone. It's to be known by someone compatible with the real you.",
    today:"Choose authenticity over performance."
  },
  {
    thought:"A good conversation doesn't need an impressive destination. Sometimes wandering is the interesting part.",
    today:"Follow the question that makes you both curious."
  },
  {
    thought:"Connection grows differently for everyone. Comparison can make you rush something that deserves time.",
    today:"Let your own experience set the pace."
  },
  {
    thought:"Two people can see the world differently and still make each other feel understood.",
    today:"Explore a difference instead of trying to resolve it."
  },
  {
    thought:"Some connections arrive loudly. Others become important quietly.",
    today:"Don't overlook the conversation that simply feels easy."
  },
  {
    thought:"Between hello and knowing, there are a thousand small moments where trust can grow.",
    today:"Make one of those moments kind."
  },
  {
    thought:"You don't need to know where a connection is going to appreciate where it is today.",
    today:"Stay present for the conversation you're actually having."
  }
];

export function atlasDailyDateKey(){
  const now=new Date();

  return [
    now.getFullYear(),
    String(now.getMonth()+1).padStart(2,'0'),
    String(now.getDate()).padStart(2,'0')
  ].join('-');
}

export function getAtlasDailyThought(){
  const now=new Date();
  const start=new Date(now.getFullYear(),0,0);

  const day=Math.floor(
    (now.getTime()-start.getTime())/86400000
  );

  return ATLAS_DAILY_THOUGHTS[
    day%ATLAS_DAILY_THOUGHTS.length
  ];
}

export function AtlasDailyModal({
  visible,
  onClose
}:{
  visible:boolean;
  onClose:()=>void;
}){
  const {colors}=useAppTheme();
  const thought=useMemo(()=>getAtlasDailyThought(),[]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex:1,
        backgroundColor:'rgba(0,0,25,0.82)',
        justifyContent:'center',
        padding:24
      }}>
        <View style={{
          backgroundColor:colors.card,
          borderWidth:1,
          borderColor:colors.blue,
          borderRadius:28,
          padding:24
        }}>

          <View style={{
            width:54,
            height:54,
            borderRadius:27,
            backgroundColor:colors.blue,
            alignItems:'center',
            justifyContent:'center',
            marginBottom:20
          }}>
            <Text style={{
              color:'#FFFFFF',
              fontSize:25,
              fontWeight:'900'
            }}>
              ✦
            </Text>
          </View>

          <Text style={{
            color:colors.blue,
            fontSize:11,
            fontWeight:'900',
            letterSpacing:1.4,
            marginBottom:8
          }}>
            ATLAS DAILY
          </Text>

          <Text style={{
            color:colors.ink,
            fontSize:25,
            lineHeight:31,
            fontWeight:'900',
            marginBottom:20
          }}>
            One thought for better connections.
          </Text>

          <Text style={{
            color:colors.ink,
            fontSize:19,
            lineHeight:29,
            fontWeight:'700',
            marginBottom:24
          }}>
            “{thought.thought}”
          </Text>

          <View style={{
            backgroundColor:colors.blue+'10',
            borderRadius:18,
            padding:16,
            marginBottom:22
          }}>
            <Text style={{
              color:colors.blue,
              fontSize:10,
              fontWeight:'900',
              letterSpacing:1.2,
              marginBottom:6
            }}>
              FOR TODAY
            </Text>

            <Text style={{
              color:colors.ink,
              fontSize:15,
              lineHeight:22,
              fontWeight:'700'
            }}>
              {thought.today}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            style={{
              backgroundColor:colors.blue,
              borderRadius:16,
              paddingVertical:15,
              alignItems:'center'
            }}
          >
            <Text style={{
              color:'#FFFFFF',
              fontSize:16,
              fontWeight:'900'
            }}>
              Continue
            </Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}
