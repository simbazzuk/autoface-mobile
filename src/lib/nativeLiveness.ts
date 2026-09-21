import { NativeModules, Platform } from 'react-native';

type LivenessResult={completed:boolean};
type AutoFaceLivenessModule={start:(sessionId:string,region:string)=>Promise<LivenessResult>};

const nativeModule=(NativeModules as {AutoFaceLiveness?:AutoFaceLivenessModule}).AutoFaceLiveness;
export function nativeLivenessAvailable(){return Platform.OS==='ios' && Boolean(nativeModule?.start)}
export async function startNativeLiveness(sessionId:string,region:string){
  if(!nativeModule?.start) throw new Error('NATIVE_LIVENESS_NOT_INSTALLED');
  return nativeModule.start(sessionId,region);
}
