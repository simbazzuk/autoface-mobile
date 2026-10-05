import React,{useCallback,useState} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View
} from 'react-native';
import {
  router,
  useFocusEffect,
  useLocalSearchParams
} from 'expo-router';

import {api} from '@/src/lib/api';
import {Loading,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';

type Dimension={
  code:string;
  label:string;
  score:number;
  explanation:string;
};

type Insight={
  available:boolean;
  compatibilityScore?:number;
  compatibilityLevel?:string;
  strongestAlignments?:string[];
  conversationPoints?:string[];
  dimensions?:Dimension[];
  confidence?:string;
  confidenceScore?:number;
  summary?:string;
  notice?:string;
};

type AtlasDeepInsightResponse={
  insight:string;
  compatibilityScore:number;
  compatibilityLevel:string;
  source:string;
  persisted:boolean;
  notice:string;
};

type Response={
  matchId:string;
  other:{
    uid:string;
    firstName?:string;
    compatibilityScore?:number;
  };
  relationshipInsight?:Insight;
};

export default function RelationshipInsight(){
  const {colors}=useAppTheme();

  const params=useLocalSearchParams<{
    matchId:string|string[]
  }>();

  const matchId=Array.isArray(params.matchId)
    ?params.matchId[0]
    :params.matchId;

  const [data,setData]=useState<Response|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [deepInsight,setDeepInsight]=useState('');
  const [deepBusy,setDeepBusy]=useState(false);
  const [deepError,setDeepError]=useState('');

  const load=useCallback(async()=>{
    if(!matchId){
      setError('Relationship insight is unavailable.');
      setLoading(false);
      return;
    }

    try{
      setLoading(true);
      setError('');

      const response=await api<Response>(
        `/api/messages?matchId=${encodeURIComponent(matchId)}`
      );

      setData(response);
    }catch(e){
      setError(
        e instanceof Error
          ?e.message
          :'Relationship insight is unavailable.'
      );
    }finally{
      setLoading(false);
    }
  },[matchId]);

  async function askAtlas(){
    if(!matchId||deepBusy)return;

    try{
      setDeepBusy(true);
      setDeepError('');

      const response=await api<AtlasDeepInsightResponse>(
        '/api/atlas-ai/relationship-insight',
        {
          method:'POST',
          body:JSON.stringify({
            matchId,
            consent:true
          })
        }
      );

      setDeepInsight(response.insight?.trim()||'');
    }catch(e){
      const raw=e instanceof Error
        ?e.message
        :String(e);

      setDeepError(
        raw.includes('BOTH_AI_OPT_INS_REQUIRED')
          ?'Both members need to enable optional AI Discovery before Atlas can provide a deeper insight.'
          :raw.includes('AI_CONSENT_REQUIRED')
            ?'Atlas needs your permission before creating this optional insight.'
            :raw.includes('ATLAS_AI_NOT_CONFIGURED')
              ?'Atlas AI is unavailable right now.'
              :raw.includes('ENTITLEMENT')
                ?'Deeper Atlas explanations are not available on your current plan.'
                :'Atlas could not create a deeper insight right now. Please try again.'
      );
    }finally{
      setDeepBusy(false);
    }
  }

  useFocusEffect(
    useCallback(()=>{
      void load();
    },[load])
  );

  if(loading){
    return(
      <Screen eyebrow="ATLAS" title="Relationship insight">
        <Loading/>
      </Screen>
    );
  }

  const insight=data?.relationshipInsight;

  if(error||!data||!insight?.available){
    return(
      <Screen eyebrow="ATLAS" title="Relationship insight">
        <View style={{gap:16}}>
          <Pressable onPress={()=>router.back()}>
            <Text style={{
              color:colors.blue,
              fontWeight:'900'
            }}>
              ‹ Back
            </Text>
          </Pressable>

          <Text style={{
            color:colors.text,
            fontSize:16,
            lineHeight:23
          }}>
            {error||'Relationship insight is not available for this connection.'}
          </Text>
        </View>
      </Screen>
    );
  }

  const score=
    insight.compatibilityScore ??
    data.other.compatibilityScore ??
    0;

  const level=
    insight.compatibilityLevel ??
    'Compatibility';

  const dimensions=[...(insight.dimensions??[])]
    .sort((a,b)=>b.score-a.score);

  return(
    <Screen eyebrow="ATLAS" title="Relationship insight">
      <ScrollView
        contentContainerStyle={{
          gap:14,
          paddingBottom:80
        }}
      >
        <Pressable
          onPress={()=>router.back()}
          style={{alignSelf:'flex-start'}}
        >
          <Text style={{
            color:colors.blue,
            fontWeight:'900'
          }}>
            ‹ Conversation
          </Text>
        </Pressable>

        <View style={{
          backgroundColor:colors.blue+'10',
          borderWidth:1,
          borderColor:colors.blue,
          borderRadius:24,
          padding:22,
          alignItems:'center',
          gap:7
        }}>
          <Text style={{
            color:colors.muted,
            fontSize:12,
            fontWeight:'900',
            letterSpacing:1
          }}>
            {`${data.other.firstName??'YOUR CONNECTION'} + YOU`.toUpperCase()}
          </Text>

          <Text style={{
            color:colors.blue,
            fontSize:52,
            lineHeight:60,
            fontWeight:'900'
          }}>
            {score}%
          </Text>

          <Text style={{
            color:colors.ink,
            fontSize:18,
            fontWeight:'900'
          }}>
            {level}
          </Text>

          <Text style={{
            color:colors.muted,
            fontSize:12,
            textAlign:'center',
            lineHeight:18
          }}>
            Your official AutoFace compatibility result
          </Text>
        </View>

        {(insight.strongestAlignments?.length??0)>0?(
          <Section
            title="STRONGEST ALIGNMENT"
            colors={colors}
          >
            {insight.strongestAlignments!.map(item=>(
              <View
                key={item}
                style={{
                  flexDirection:'row',
                  alignItems:'center',
                  gap:10
                }}
              >
                <View style={{
                  width:25,
                  height:25,
                  borderRadius:13,
                  backgroundColor:colors.blue+'18',
                  alignItems:'center',
                  justifyContent:'center'
                }}>
                  <Text style={{
                    color:colors.blue,
                    fontWeight:'900'
                  }}>
                    ✓
                  </Text>
                </View>

                <Text style={{
                  flex:1,
                  color:colors.text,
                  fontWeight:'800',
                  fontSize:14
                }}>
                  {item}
                </Text>
              </View>
            ))}
          </Section>
        ):null}

        {dimensions.length?(
          <Section
            title="COMPATIBILITY"
            colors={colors}
          >
            {dimensions.map(item=>(
              <View
                key={item.code}
                style={{gap:7}}
              >
                <View style={{
                  flexDirection:'row',
                  justifyContent:'space-between',
                  gap:12
                }}>
                  <Text style={{
                    flex:1,
                    color:colors.text,
                    fontWeight:'800',
                    fontSize:13
                  }}>
                    {item.label}
                  </Text>

                  <Text style={{
                    color:colors.blue,
                    fontWeight:'900',
                    fontSize:13
                  }}>
                    {item.score}%
                  </Text>
                </View>

                <View style={{
                  height:7,
                  borderRadius:999,
                  backgroundColor:colors.blue+'18',
                  overflow:'hidden'
                }}>
                  <View style={{
                    height:7,
                    width:`${Math.max(
                      0,
                      Math.min(100,item.score)
                    )}%`,
                    borderRadius:999,
                    backgroundColor:colors.blue
                  }}/>
                </View>

                <Text style={{
                  color:colors.muted,
                  fontSize:11,
                  lineHeight:16
                }}>
                  {item.explanation}
                </Text>
              </View>
            ))}
          </Section>
        ):null}

        {insight.confidence?(
          <Section
            title="ATLAS CONFIDENCE"
            colors={colors}
          >
            <View style={{
              flexDirection:'row',
              alignItems:'center',
              justifyContent:'space-between'
            }}>
              <Text style={{
                color:colors.text,
                fontSize:14,
                fontWeight:'800'
              }}>
                Profile context
              </Text>

              <View style={{
                backgroundColor:colors.blue,
                paddingHorizontal:11,
                paddingVertical:6,
                borderRadius:999
              }}>
                <Text style={{
                  color:'#FFFFFF',
                  fontSize:11,
                  fontWeight:'900'
                }}>
                  {insight.confidence}
                </Text>
              </View>
            </View>

            {typeof insight.confidenceScore==='number'?(
              <Text style={{
                color:colors.muted,
                fontSize:12,
                lineHeight:18
              }}>
                Atlas has {insight.confidenceScore}% profile context available
                for this explanation.
              </Text>
            ):null}
          </Section>
        ):null}

        {insight.summary?(
          <Section
            title="WHY YOU MATCH"
            colors={colors}
          >
            <Text style={{
              color:colors.text,
              fontSize:14,
              lineHeight:21
            }}>
              {insight.summary}
            </Text>
          </Section>
        ):null}

        {(insight.conversationPoints?.length??0)>0?(
          <Section
            title="GOOD TO EXPLORE"
            colors={colors}
          >
            {insight.conversationPoints!.map(item=>(
              <Text
                key={item}
                style={{
                  color:colors.text,
                  fontSize:13,
                  lineHeight:20
                }}
              >
                • {item}
              </Text>
            ))}
          </Section>
        ):null}

        <View style={{
          backgroundColor:colors.blue+'0D',
          borderWidth:1,
          borderColor:colors.blue,
          borderRadius:20,
          padding:18,
          gap:13
        }}>
          <View style={{
            alignSelf:'flex-start',
            backgroundColor:colors.pink,
            borderRadius:999,
            paddingHorizontal:11,
            paddingVertical:6
          }}>
            <Text style={{
              color:'#FFFFFF',
              fontSize:10,
              fontWeight:'900',
              letterSpacing:.8
            }}>
              ✦ ATLAS DEEPER INSIGHT
            </Text>
          </View>

          {!deepInsight?(
            <>
              <Text style={{
                color:colors.ink,
                fontSize:17,
                fontWeight:'900'
              }}>
                Explore your compatibility
              </Text>

              <Text style={{
                color:colors.muted,
                fontSize:13,
                lineHeight:20
              }}>
                Atlas can provide an optional AI explanation of your
                existing compatibility result and suggest useful areas
                to explore together.
              </Text>

              <Text style={{
                color:colors.muted,
                fontSize:11,
                lineHeight:17
              }}>
                Your {score}% compatibility score remains deterministic
                and will not be changed by Atlas AI.
              </Text>

              <Pressable
                disabled={deepBusy}
                onPress={()=>void askAtlas()}
                style={{
                  backgroundColor:colors.blue,
                  borderRadius:16,
                  paddingVertical:13,
                  paddingHorizontal:16,
                  alignItems:'center',
                  opacity:deepBusy?.65:1
                }}
              >
                <Text style={{
                  color:'#FFFFFF',
                  fontSize:13,
                  fontWeight:'900'
                }}>
                  {deepBusy
                    ?'Atlas is thinking…'
                    :'✦ Ask Atlas'}
                </Text>
              </Pressable>
            </>
          ):(
            <>
              <Text style={{
                color:colors.ink,
                fontSize:17,
                fontWeight:'900'
              }}>
                Atlas observation
              </Text>

              <Text style={{
                color:colors.text,
                fontSize:14,
                lineHeight:22
              }}>
                {deepInsight}
              </Text>

              <View style={{
                borderTopWidth:1,
                borderTopColor:colors.blue+'25',
                paddingTop:11
              }}>
                <Text style={{
                  color:colors.muted,
                  fontSize:10,
                  lineHeight:16
                }}>
                  AI-generated explanation. Your official compatibility
                  score remains deterministic and Atlas does not predict
                  relationship success.
                </Text>
              </View>
            </>
          )}

          {deepError?(
            <Text style={{
              color:colors.rose,
              fontSize:12,
              lineHeight:18
            }}>
              {deepError}
            </Text>
          ):null}
        </View>

        <View style={{
          backgroundColor:colors.card,
          borderWidth:1,
          borderColor:colors.line,
          borderRadius:18,
          padding:15
        }}>
          <Text style={{
            color:colors.muted,
            fontSize:11,
            lineHeight:17,
            textAlign:'center'
          }}>
            {insight.notice||
              'Relationship insight explains your existing deterministic AutoFace compatibility result. It does not predict relationship success.'}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  colors,
  children
}:{
  title:string;
  colors:any;
  children:React.ReactNode;
}){
  return(
    <View style={{
      backgroundColor:colors.card,
      borderWidth:1,
      borderColor:colors.line,
      borderRadius:20,
      padding:17,
      gap:13
    }}>
      <Text style={{
        color:colors.blue,
        fontSize:11,
        fontWeight:'900',
        letterSpacing:1
      }}>
        {title}
      </Text>

      {children}
    </View>
  );
}
