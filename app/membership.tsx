import React,{useCallback,useEffect,useState} from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  View
} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {api} from '@/src/lib/api';
import {Loading,Screen} from '@/src/components/UI';
import {useAppTheme} from '@/src/context/Theme';
import {useAuth} from '@/src/context/Auth';
import {
  getAutoFacePlusPackage,
  purchaseAutoFacePlus,
  restoreAutoFacePurchases
} from '@/src/lib/purchases';

type Plan='free'|'founding'|'plus';

type Entitlements={
  atlasConversationCoach:boolean;
  atlasReplyCoach:boolean;
  atlasReflection:boolean;
  fullAtlasExplanations:boolean;
  advancedIntroductionPreferences:boolean;
  fullRecommendationHistory:boolean;
  expandedIntroductions:boolean;
  foundingBadge:boolean;
  unlimitedMessaging:boolean;
  contactDetailSharing:boolean;
};

type Membership={
  uid:string;
  plan:Plan;
  status:'active'|'inactive';
  foundingMemberNumber:number|null;
  activatedAt:string|null;
  entitlements:Entitlements;
};

type Usage={
  feature:string;
  limit:number;
  used:number;
  remaining:number;
  period:string;
};

type MembershipResponse={
  membership:Membership;
  atlasUsage:{
    conversationCoach:Usage;
    replyCoach:Usage;
  };
};

function planName(plan:Plan){
  if(plan==='founding')return 'Founding Member';
  if(plan==='plus')return 'AutoFace Plus';
  return 'AutoFace Free';
}

export default function MembershipScreen(){
  const {colors}=useAppTheme();
  const {user}=useAuth();
  const [data,setData]=useState<MembershipResponse|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [storePrice,setStorePrice]=useState('');
  const [purchaseBusy,setPurchaseBusy]=useState(false);
  const [purchaseMessage,setPurchaseMessage]=useState('');

  useEffect(()=>{
    let active=true;

    void getAutoFacePlusPackage()
      .then(pkg=>{
        if(active){
          setStorePrice(pkg.product.priceString);
        }
      })
      .catch(e=>{
        console.warn(
          '[RevenueCat] Unable to load AutoFace Plus package:',
          e instanceof Error?e.message:e
        );
      });

    return()=>{active=false};
  },[]);

  async function buyPlus(){
    if(!user||purchaseBusy)return;

    try{
      setPurchaseBusy(true);
      setPurchaseMessage('');

      const result=await purchaseAutoFacePlus(user.uid);

      if(result.active){
        const reconciled=await api<MembershipResponse>(
          '/api/membership/reconcile',
          {method:'POST'}
        );

        setData(reconciled);

        setPurchaseMessage(
          reconciled.membership.plan==='plus'
            ?'AutoFace Plus is now active.'
            :'Your purchase was confirmed, but membership activation is still pending.'
        );
      }else{
        setPurchaseMessage(
          'Purchase completed, but AutoFace Plus is not active yet.'
        );
      }
    }catch(e:any){
      if(e?.userCancelled){
        return;
      }

      setPurchaseMessage(
        e instanceof Error
          ?e.message
          :'Unable to complete the purchase.'
      );
    }finally{
      setPurchaseBusy(false);
    }
  }

  async function restorePurchases(){
    if(!user||purchaseBusy)return;

    try{
      setPurchaseBusy(true);
      setPurchaseMessage('');

      const result=await restoreAutoFacePurchases(user.uid);

      const reconciled=await api<MembershipResponse>(
        '/api/membership/reconcile',
        {method:'POST'}
      );

      setData(reconciled);

      setPurchaseMessage(
        result.active&&reconciled.membership.plan==='plus'
          ?'AutoFace Plus purchase restored and activated.'
          :result.active
            ?'Your purchase was restored, but membership activation is still pending.'
            :'No active AutoFace Plus purchase was found.'
      );
    }catch(e){
      setPurchaseMessage(
        e instanceof Error
          ?e.message
          :'Unable to restore purchases.'
      );
    }finally{
      setPurchaseBusy(false);
    }
  }

  const load=useCallback(async()=>{
    try{
      setLoading(true);
      setError('');
      setData(await api<MembershipResponse>('/api/membership'));
    }catch(e){
      setError(
        e instanceof Error
          ?e.message
          :'Unable to load membership.'
      );
    }finally{
      setLoading(false);
    }
  },[]);

  useFocusEffect(
    useCallback(()=>{
      void load();
    },[load])
  );

  if(loading&&!data){
    return(
      <Screen eyebrow="AUTOFACE MEMBERSHIP" title="Your plan">
        <Loading/>
      </Screen>
    );
  }

  const membership=data?.membership;
  const usage=data?.atlasUsage;

  const benefits=[
    {
      label:'Unlimited messaging',
      active:membership?.entitlements.unlimitedMessaging
    },
    {
      label:'Full Atlas explanations',
      active:membership?.entitlements.fullAtlasExplanations
    },
    {
      label:'Advanced discovery preferences',
      active:membership?.entitlements.advancedIntroductionPreferences
    },
    {
      label:'Expanded introductions',
      active:membership?.entitlements.expandedIntroductions
    },
    {
      label:'Contact detail sharing',
      active:membership?.entitlements.contactDetailSharing
    }
  ];

  return(
    <Screen eyebrow="AUTOFACE MEMBERSHIP" title="Your plan">
      <ScrollView
        contentContainerStyle={{
          paddingTop:8,
          paddingBottom:100
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={()=>router.back()}
          style={{marginBottom:14}}
        >
          <Text
            style={{
              color:colors.blue,
              fontSize:14,
              fontWeight:'800'
            }}
          >
            ‹ Back to profile
          </Text>
        </Pressable>

        {error?(
          <View
            style={{
              backgroundColor:colors.card,
              borderWidth:1,
              borderColor:colors.line,
              borderRadius:18,
              padding:16,
              marginBottom:14
            }}
          >
            <Text style={{color:colors.rose}}>
              {error}
            </Text>
          </View>
        ):null}

        {membership?(
          <>
            <View
              style={{
                backgroundColor:colors.blue+'0D',
                borderWidth:1,
                borderColor:colors.blue,
                borderRadius:24,
                padding:20,
                marginBottom:20
              }}
            >
              <View
                style={{
                  flexDirection:'row',
                  alignItems:'center',
                  marginBottom:16
                }}
              >
                <View
                  style={{
                    width:48,
                    height:48,
                    borderRadius:24,
                    backgroundColor:colors.blue,
                    alignItems:'center',
                    justifyContent:'center',
                    marginRight:13
                  }}
                >
                  <Text
                    style={{
                      color:'#fff',
                      fontSize:22,
                      fontWeight:'900'
                    }}
                  >
                    ✦
                  </Text>
                </View>

                <View style={{flex:1}}>
                  <Text
                    style={{
                      color:colors.blue,
                      fontSize:11,
                      fontWeight:'900',
                      letterSpacing:1.2,
                      marginBottom:4
                    }}
                  >
                    CURRENT PLAN
                  </Text>

                  <Text
                    style={{
                      color:colors.ink,
                      fontSize:23,
                      fontWeight:'900'
                    }}
                  >
                    {planName(membership.plan)}
                  </Text>

                  {membership.plan==='founding'&&
                   membership.foundingMemberNumber?(
                    <Text
                      style={{
                        color:colors.muted,
                        fontSize:13,
                        marginTop:3
                      }}
                    >
                      Founding member #{membership.foundingMemberNumber}
                    </Text>
                  ):null}
                </View>
              </View>

              <Text
                style={{
                  color:colors.muted,
                  fontSize:14,
                  lineHeight:21,
                  marginBottom:18
                }}
              >
                {membership.plan==='founding'
                  ?'Your early-member benefits are active.'
                  :membership.plan==='plus'
                    ?'Your Plus membership benefits are active.'
                    :'Your Free membership is active.'}
              </Text>

              {usage?(
                <>
                  <View
                    style={{
                      backgroundColor:colors.blue+'0C',
                      borderWidth:1,
                      borderColor:colors.blue+'45',
                      borderRadius:16,
                      padding:14,
                      marginBottom:10
                    }}
                  >
                    <View
                      style={{
                        flexDirection:'row',
                        justifyContent:'space-between',
                        gap:10
                      }}
                    >
                      <Text
                        style={{
                          color:colors.ink,
                          fontSize:14,
                          fontWeight:'800',
                          flex:1
                        }}
                      >
                        Atlas Conversation Coach
                      </Text>

                      <Text
                        style={{
                          color:colors.blue,
                          fontSize:16,
                          fontWeight:'900'
                        }}
                      >
                        {usage.conversationCoach.remaining} / {usage.conversationCoach.limit}
                      </Text>
                    </View>

                    <Text
                      style={{
                        color:colors.muted,
                        fontSize:12,
                        marginTop:4
                      }}
                    >
                      suggestions remaining today
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor:colors.blue+'0C',
                      borderWidth:1,
                      borderColor:colors.blue+'45',
                      borderRadius:16,
                      padding:14,
                      marginBottom:18
                    }}
                  >
                    <View
                      style={{
                        flexDirection:'row',
                        justifyContent:'space-between',
                        gap:10
                      }}
                    >
                      <Text
                        style={{
                          color:colors.ink,
                          fontSize:14,
                          fontWeight:'800',
                          flex:1
                        }}
                      >
                        Atlas Reply Coach
                      </Text>

                      <Text
                        style={{
                          color:colors.blue,
                          fontSize:16,
                          fontWeight:'900'
                        }}
                      >
                        {usage.replyCoach.remaining} / {usage.replyCoach.limit}
                      </Text>
                    </View>

                    <Text
                      style={{
                        color:colors.muted,
                        fontSize:12,
                        marginTop:4
                      }}
                    >
                      suggestions remaining today
                    </Text>
                  </View>
                </>
              ):null}

              {benefits.map(item=>(
                <View
                  key={item.label}
                  style={{
                    flexDirection:'row',
                    alignItems:'center',
                    marginBottom:12
                  }}
                >
                  <View
                    style={{
                      width:24,
                      height:24,
                      borderRadius:12,
                      marginRight:10,
                      alignItems:'center',
                      justifyContent:'center',
                      backgroundColor:item.active
                        ?colors.blue+'20'
                        :colors.photo,
                      borderWidth:1,
                      borderColor:item.active
                        ?colors.blue
                        :colors.line
                    }}
                  >
                    <Text
                      style={{
                        color:item.active
                          ?colors.blue
                          :colors.muted,
                        fontSize:12,
                        fontWeight:'900'
                      }}
                    >
                      {item.active?'✓':'—'}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color:item.active
                        ?colors.ink
                        :colors.muted,
                      fontSize:14,
                      fontWeight:item.active?'700':'500'
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <Text
              style={{
                color:colors.blue,
                fontSize:12,
                fontWeight:'900',
                letterSpacing:1.2,
                marginBottom:10
              }}
            >
              {membership.plan==='free'?'UPGRADE YOUR PLAN':'PLAN DETAILS'}
            </Text>

            {/* FREE PLAN */}
            {membership.plan==='free'?(
            <View
              style={{
                backgroundColor:colors.card,
                borderWidth:1,
                borderColor:colors.line,
                borderRadius:22,
                padding:18,
                marginBottom:12
              }}
            >
              <View
                style={{
                  flexDirection:'row',
                  alignItems:'center',
                  justifyContent:'space-between',
                  marginBottom:16
                }}
              >
                <View style={{flex:1}}>
                  <Text
                    style={{
                      color:colors.muted,
                      fontSize:11,
                      fontWeight:'900',
                      letterSpacing:1.1,
                      marginBottom:5
                    }}
                  >
                    FREE
                  </Text>

                  <Text
                    style={{
                      color:colors.ink,
                      fontSize:20,
                      fontWeight:'900'
                    }}
                  >
                    AutoFace Free
                  </Text>
                </View>

                <View
                  style={{
                    width:40,
                    height:40,
                    borderRadius:20,
                    backgroundColor:colors.photo,
                    alignItems:'center',
                    justifyContent:'center'
                  }}
                >
                  <Text
                    style={{
                      color:colors.muted,
                      fontSize:18,
                      fontWeight:'900'
                    }}
                  >
                    A
                  </Text>
                </View>
              </View>

              {[
                '3 Atlas Conversation Coach suggestions per day',
                '3 Atlas Reply Coach suggestions per day',
                'Standard discovery',
                'Limited messaging'
              ].map(item=>(
                <View
                  key={item}
                  style={{
                    flexDirection:'row',
                    alignItems:'center',
                    marginBottom:11
                  }}
                >
                  <View
                    style={{
                      width:24,
                      height:24,
                      borderRadius:12,
                      marginRight:10,
                      alignItems:'center',
                      justifyContent:'center',
                      backgroundColor:colors.photo,
                      borderWidth:1,
                      borderColor:colors.line
                    }}
                  >
                    <Text
                      style={{
                        color:colors.muted,
                        fontSize:12,
                        fontWeight:'900'
                      }}
                    >
                      ✓
                    </Text>
                  </View>

                  <Text
                    style={{
                      flex:1,
                      color:colors.muted,
                      fontSize:14,
                      fontWeight:'600',
                      lineHeight:20
                    }}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
            ):null}

            {/* PLUS PLAN */}
            {membership.plan!=='founding'?(
            <View
              style={{
                backgroundColor:colors.blue+'0D',
                borderWidth:1,
                borderColor:colors.blue,
                borderRadius:22,
                padding:18,
                marginBottom:20
              }}
            >
              <View
                style={{
                  flexDirection:'row',
                  alignItems:'center',
                  justifyContent:'space-between',
                  marginBottom:16
                }}
              >
                <View style={{flex:1}}>
                  <View
                    style={{
                      alignSelf:'flex-start',
                      backgroundColor:colors.blue,
                      paddingHorizontal:10,
                      paddingVertical:5,
                      borderRadius:999,
                      marginBottom:8
                    }}
                  >
                    <Text
                      style={{
                        color:'#FFFFFF',
                        fontSize:10,
                        fontWeight:'900',
                        letterSpacing:1
                      }}
                    >
                      PLUS
                    </Text>
                  </View>

                  <Text
                    style={{
                      color:colors.ink,
                      fontSize:20,
                      fontWeight:'900'
                    }}
                  >
                    AutoFace Plus
                  </Text>
                </View>

                <View
                  style={{
                    width:44,
                    height:44,
                    borderRadius:22,
                    backgroundColor:colors.blue,
                    alignItems:'center',
                    justifyContent:'center'
                  }}
                >
                  <Text
                    style={{
                      color:'#FFFFFF',
                      fontSize:20,
                      fontWeight:'900'
                    }}
                  >
                    ✦
                  </Text>
                </View>
              </View>

              {[
                '25 Atlas Conversation Coach suggestions per day',
                '25 Atlas Reply Coach suggestions per day',
                'Unlimited messaging',
                'Advanced discovery'
              ].map(item=>(
                <View
                  key={item}
                  style={{
                    flexDirection:'row',
                    alignItems:'center',
                    marginBottom:11
                  }}
                >
                  <View
                    style={{
                      width:24,
                      height:24,
                      borderRadius:12,
                      marginRight:10,
                      alignItems:'center',
                      justifyContent:'center',
                      backgroundColor:colors.blue+'20',
                      borderWidth:1,
                      borderColor:colors.blue
                    }}
                  >
                    <Text
                      style={{
                        color:colors.blue,
                        fontSize:12,
                        fontWeight:'900'
                      }}
                    >
                      ✓
                    </Text>
                  </View>

                  <Text
                    style={{
                      flex:1,
                      color:colors.ink,
                      fontSize:14,
                      fontWeight:'700',
                      lineHeight:20
                    }}
                  >
                    {item}
                  </Text>
                </View>
              ))}

              {membership.plan==='free'?(
                <View style={{marginTop:10}}>
                  {storePrice?(
                    <Text
                      style={{
                        color:colors.ink,
                        fontSize:18,
                        fontWeight:'900',
                        marginBottom:12
                      }}
                    >
                      {storePrice} / month
                    </Text>
                  ):null}

                  <Pressable
                    onPress={()=>void buyPlus()}
                    disabled={purchaseBusy||!user}
                    style={{
                      backgroundColor:colors.blue,
                      borderRadius:16,
                      paddingVertical:15,
                      paddingHorizontal:18,
                      alignItems:'center',
                      opacity:purchaseBusy||!user?0.6:1
                    }}
                  >
                    <Text
                      style={{
                        color:'#FFFFFF',
                        fontSize:15,
                        fontWeight:'900'
                      }}
                    >
                      {purchaseBusy
                        ?'Please wait...'
                        :'Upgrade to AutoFace Plus'}
                    </Text>
                  </Pressable>
                </View>
              ):null}

              {membership.plan==='plus'?(
                <View style={{marginTop:10}}>
                  <Pressable
                    onPress={()=>
                      void Linking.openURL(
                        'https://apps.apple.com/account/subscriptions'
                      )
                    }
                    style={{
                      borderWidth:1,
                      borderColor:colors.blue,
                      borderRadius:16,
                      paddingVertical:14,
                      paddingHorizontal:18,
                      alignItems:'center'
                    }}
                  >
                    <Text
                      style={{
                        color:colors.blue,
                        fontSize:14,
                        fontWeight:'900'
                      }}
                    >
                      Manage Subscription
                    </Text>
                  </Pressable>

                  <Text
                    style={{
                      color:colors.muted,
                      fontSize:11,
                      lineHeight:16,
                      textAlign:'center',
                      marginTop:8
                    }}
                  >
                    Manage or cancel your subscription with Apple.
                    AutoFace Plus remains active until the end of
                    your current billing period.
                  </Text>
                </View>
              ):null}

              <Pressable
                onPress={()=>void restorePurchases()}
                disabled={purchaseBusy||!user}
                style={{
                  alignItems:'center',
                  paddingVertical:13,
                  marginTop:5,
                  opacity:purchaseBusy||!user?0.6:1
                }}
              >
                <Text
                  style={{
                    color:colors.blue,
                    fontSize:13,
                    fontWeight:'800'
                  }}
                >
                  Restore Purchases
                </Text>
              </Pressable>

              {purchaseMessage?(
                <Text
                  style={{
                    color:colors.muted,
                    fontSize:12,
                    lineHeight:18,
                    textAlign:'center',
                    marginTop:2
                  }}
                >
                  {purchaseMessage}
                </Text>
              ):null}
            </View>
            ):null}

            <Text
              style={{
                color:colors.muted,
                fontSize:12,
                lineHeight:18,
                textAlign:'center'
              }}
            >
              Membership options and benefits may evolve as AutoFace develops.
            </Text>
          </>
        ):null}
      </ScrollView>
    </Screen>
  );
}
