import {Redirect,useLocalSearchParams} from 'expo-router';

export default function ConnectionLink(){
  const {matchId}=useLocalSearchParams<{matchId:string}>();

  if(!matchId){
    return <Redirect href="/(tabs)/messages"/>;
  }

  return (
    <Redirect
      href={{
        pathname:'/chat/[matchId]',
        params:{matchId}
      }}
    />
  );
}
