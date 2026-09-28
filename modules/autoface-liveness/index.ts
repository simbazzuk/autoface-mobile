import { requireNativeModule } from 'expo';

export type AutoFaceLivenessNativeModule = {
  registrationMarker?: string;
  start(sessionId: string, region: string): Promise<{ completed: boolean }>;
};

export default requireNativeModule<AutoFaceLivenessNativeModule>(
  'AutoFaceLiveness'
);