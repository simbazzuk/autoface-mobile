import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {useAppTheme} from '@/src/context/Theme';

export type PreferenceImportance=
  |'doesnt_matter'
  |'preference'
  |'important'
  |'essential';

type Option={
  value:string;
  label:string;
};

type Props={
  expanded:string|null;
  onExpandedChange:(value:string|null)=>void;

  preferredReligions:string[];
  setPreferredReligions:(value:string[])=>void;
  religionImportance:PreferenceImportance;
  setReligionImportance:(value:PreferenceImportance)=>void;

  preferredDiets:string[];
  setPreferredDiets:(value:string[])=>void;
  dietImportance:PreferenceImportance;
  setDietImportance:(value:PreferenceImportance)=>void;

  preferredDrinking:string[];
  setPreferredDrinking:(value:string[])=>void;
  drinkingImportance:PreferenceImportance;
  setDrinkingImportance:(value:PreferenceImportance)=>void;

  preferredSmoking:string[];
  setPreferredSmoking:(value:string[])=>void;
  smokingImportance:PreferenceImportance;
  setSmokingImportance:(value:PreferenceImportance)=>void;

  preferredChildren:string[];
  setPreferredChildren:(value:string[])=>void;
  childrenImportance:PreferenceImportance;
  setChildrenImportance:(value:PreferenceImportance)=>void;

  preferredWantsChildren:string[];
  setPreferredWantsChildren:(value:string[])=>void;
  wantsChildrenImportance:PreferenceImportance;
  setWantsChildrenImportance:(value:PreferenceImportance)=>void;
};

const religionOptions:Option[]=[
  {value:'sikh',label:'Sikh'},
  {value:'hindu',label:'Hindu'},
  {value:'muslim',label:'Muslim'},
  {value:'christian',label:'Christian'},
  {value:'buddhist',label:'Buddhist'},
  {value:'jewish',label:'Jewish'},
  {value:'none',label:'No religion'},
  {value:'other',label:'Other'},
  {value:'prefer_not_to_say',label:'Prefer not to say'}
];

const dietOptions:Option[]=[
  {value:'vegetarian',label:'Vegetarian'},
  {value:'vegan',label:'Vegan'},
  {value:'pescatarian',label:'Pescatarian'},
  {value:'non_vegetarian',label:'Non-vegetarian'},
  {value:'other',label:'Other'},
  {value:'prefer_not_to_say',label:'Prefer not to say'}
];

const drinkingOptions:Option[]=[
  {value:'never',label:'Never'},
  {value:'occasionally',label:'Occasionally'},
  {value:'socially',label:'Socially'},
  {value:'regularly',label:'Regularly'},
  {value:'prefer_not_to_say',label:'Prefer not to say'}
];

const smokingOptions:Option[]=[
  {value:'never',label:'Never'},
  {value:'occasionally',label:'Occasionally'},
  {value:'regularly',label:'Regularly'},
  {value:'prefer_not_to_say',label:'Prefer not to say'}
];

const childrenOptions:Option[]=[
  {value:'no_children',label:'No children'},
  {value:'have_children',label:'Has children'},
  {value:'prefer_not_to_say',label:'Prefer not to say'}
];

const wantsChildrenOptions:Option[]=[
  {value:'yes',label:'Yes'},
  {value:'no',label:'No'},
  {value:'open',label:'Open to it'},
  {value:'unsure',label:'Unsure'},
  {value:'prefer_not_to_say',label:'Prefer not to say'}
];

function PreferenceRow({
  id,
  label,
  options,
  values,
  setValues,
  importance,
  setImportance,
  expanded,
  onExpandedChange
}:{
  id:string;
  label:string;
  options:Option[];
  values:string[];
  setValues:(value:string[])=>void;
  importance:PreferenceImportance;
  setImportance:(value:PreferenceImportance)=>void;
  expanded:string|null;
  onExpandedChange:(value:string|null)=>void;
}){
  const {colors}=useAppTheme();
  const open=expanded===id;

  const selectedLabels=options
    .filter(option=>values.includes(option.value))
    .map(option=>option.label);

  function toggle(value:string){
    if(values.includes(value)){
      const next=values.filter(item=>item!==value);
      setValues(next);
      if(next.length===0)setImportance('doesnt_matter');
    }else{
      setValues([...values,value]);
      if(importance==='doesnt_matter'){
        setImportance('preference');
      }
    }
  }

  return(
    <View style={{
      borderBottomWidth:1,
      borderBottomColor:colors.line,
      paddingVertical:13
    }}>
      <Pressable
        onPress={()=>
          onExpandedChange(open?null:id)
        }
        style={{
          flexDirection:'row',
          alignItems:'center',
          gap:12
        }}
      >
        <View style={{flex:1}}>
          <Text style={{
            color:colors.ink,
            fontSize:14,
            fontWeight:'800'
          }}>
            {label}
          </Text>

          <Text
            numberOfLines={2}
            style={{
              color:selectedLabels.length
                ?colors.blue
                :colors.muted,
              fontSize:12,
              lineHeight:17,
              marginTop:3
            }}
          >
            {selectedLabels.length
              ?selectedLabels.join(', ')
              :"No preference"}
          </Text>
        </View>

        <Text style={{
          color:colors.blue,
          fontSize:18,
          fontWeight:'800'
        }}>
          {open?'⌃':'›'}
        </Text>
      </Pressable>

      {open?(
        <View style={{paddingTop:13}}>
          <View style={{
            flexDirection:'row',
            flexWrap:'wrap',
            gap:8
          }}>
            {options.map(option=>{
              const selected=values.includes(option.value);

              return(
                <Pressable
                  key={option.value}
                  onPress={()=>toggle(option.value)}
                  style={{
                    borderWidth:1,
                    borderColor:selected
                      ?colors.blue
                      :colors.line,
                    backgroundColor:selected
                      ?colors.bg
                      :colors.card,
                    borderRadius:18,
                    paddingVertical:9,
                    paddingHorizontal:12
                  }}
                >
                  <Text style={{
                    color:selected
                      ?colors.blue
                      :colors.ink,
                    fontSize:13,
                    fontWeight:selected?'800':'600'
                  }}>
                    {selected?'✓ ':''}{option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {values.length>0?(
            <View style={{marginTop:16}}>
              <Text style={{
                color:colors.muted,
                fontSize:11,
                fontWeight:'800',
                marginBottom:8
              }}>
                HOW MUCH DOES THIS MATTER?
              </Text>

              <View style={{
                flexDirection:'row',
                flexWrap:'wrap',
                gap:8
              }}>
                {([
                  ['preference','Nice to have'],
                  ['important','Important'],
                  ['essential','Essential']
                ] as const).map(([value,text])=>{
                  const selected=importance===value;

                  return(
                    <Pressable
                      key={value}
                      onPress={()=>setImportance(value)}
                      style={{
                        borderWidth:1,
                        borderColor:selected
                          ?colors.blue
                          :colors.line,
                        backgroundColor:selected
                          ?colors.bg
                          :colors.card,
                        borderRadius:18,
                        paddingVertical:9,
                        paddingHorizontal:12
                      }}
                    >
                      <Text style={{
                        color:selected
                          ?colors.blue
                          :colors.ink,
                        fontSize:12,
                        fontWeight:selected?'900':'700'
                      }}>
                        {selected?'✓ ':''}{text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ):null}
        </View>
      ):null}
    </View>
  );
}

export function DiscoveryLifestylePreferences(props:Props){
  const {colors}=useAppTheme();

  const rows=[
    {
      id:'religion',
      label:'Religion / faith',
      options:religionOptions,
      values:props.preferredReligions,
      setValues:props.setPreferredReligions,
      importance:props.religionImportance,
      setImportance:props.setReligionImportance
    },
    {
      id:'diet',
      label:'Diet',
      options:dietOptions,
      values:props.preferredDiets,
      setValues:props.setPreferredDiets,
      importance:props.dietImportance,
      setImportance:props.setDietImportance
    },
    {
      id:'drinking',
      label:'Drinking',
      options:drinkingOptions,
      values:props.preferredDrinking,
      setValues:props.setPreferredDrinking,
      importance:props.drinkingImportance,
      setImportance:props.setDrinkingImportance
    },
    {
      id:'smoking',
      label:'Smoking',
      options:smokingOptions,
      values:props.preferredSmoking,
      setValues:props.setPreferredSmoking,
      importance:props.smokingImportance,
      setImportance:props.setSmokingImportance
    },
    {
      id:'children',
      label:'Children',
      options:childrenOptions,
      values:props.preferredChildren,
      setValues:props.setPreferredChildren,
      importance:props.childrenImportance,
      setImportance:props.setChildrenImportance
    },
    {
      id:'wantsChildren',
      label:'Future children',
      options:wantsChildrenOptions,
      values:props.preferredWantsChildren,
      setValues:props.setPreferredWantsChildren,
      importance:props.wantsChildrenImportance,
      setImportance:props.setWantsChildrenImportance
    }
  ];

  return(
    <View style={{marginBottom:24}}>
      <Text style={{
        color:colors.ink,
        fontSize:17,
        fontWeight:'900',
        marginBottom:5
      }}>
        What I'm looking for
      </Text>

      <Text style={{
        color:colors.muted,
        fontSize:13,
        lineHeight:19,
        marginBottom:7
      }}>
        Tell Atlas what matters in a potential connection. These preferences help shape future introductions.
      </Text>

      {rows.map(row=>(
        <PreferenceRow
          key={row.id}
          {...row}
          expanded={props.expanded}
          onExpandedChange={props.onExpandedChange}
        />
      ))}
    </View>
  );
}
