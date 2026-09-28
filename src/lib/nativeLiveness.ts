import { Platform } from 'react-native';
import {
  requireNativeModule,
  requireOptionalNativeModule,
} from 'expo';

type LivenessResult = { completed: boolean };

type AutoFaceLivenessModule = {
  registrationMarker?: string;
  start?: (sessionId: string, region: string) => Promise<LivenessResult>;
};

type AutoFaceTestModule = {
  registrationMarker?: string;
};

type AnyRecord = Record<string, unknown>;

function safeKeys(value: unknown): string[] {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return [];
  try {
    return Object.keys(value as object).sort();
  } catch {
    return [];
  }
}

function describeValue(value: unknown) {
  return {
    type: typeof value,
    present: value !== null && value !== undefined,
    keys: safeKeys(value),
  };
}

function safeOptional<T>(name: string): T | null {
  try {
    return requireOptionalNativeModule<T>(name);
  } catch (error) {
    console.log(`[AutoFaceRegistry] optional lookup threw for ${name}`, String(error));
    return null;
  }
}

function safeRequired<T>(name: string): T | null {
  try {
    return requireNativeModule<T>(name);
  } catch (error) {
    console.log(`[AutoFaceRegistry] required lookup threw for ${name}`, String(error));
    return null;
  }
}

const g = globalThis as typeof globalThis & {
  expo?: AnyRecord & { modules?: unknown };
  ExpoModules?: unknown;
  nativeModuleProxy?: unknown;
  __expo_module_proxy__?: unknown;
};

const expoObject = g.expo;
const expoModules = expoObject?.modules;

console.log('[AutoFaceRegistry] expo object', describeValue(expoObject));
console.log('[AutoFaceRegistry] expo.modules', describeValue(expoModules));

if (expoModules && (typeof expoModules === 'object' || typeof expoModules === 'function')) {
  const moduleNames = safeKeys(expoModules);
  console.log('[AutoFaceRegistry] expo.modules names', moduleNames);

  const modulesRecord = expoModules as AnyRecord;
  for (const name of [
    'AutofaceTest',
    'AutoFaceLiveness',
    'ExpoConstants',
    'ExpoFileSystem',
    'ExpoFont',
    'ExpoNotifications',
  ]) {
    console.log(`[AutoFaceRegistry] expo.modules.${name}`, describeValue(modulesRecord[name]));
  }
}

console.log('[AutoFaceRegistry] legacy/global proxies', {
  ExpoModules: describeValue(g.ExpoModules),
  nativeModuleProxy: describeValue(g.nativeModuleProxy),
  expoModuleProxy: describeValue(g.__expo_module_proxy__),
});

const optionalTest = safeOptional<AutoFaceTestModule>('AutofaceTest');
const requiredTest = safeRequired<AutoFaceTestModule>('AutofaceTest');
const optionalLiveness = safeOptional<AutoFaceLivenessModule>('AutoFaceLiveness');
const requiredLiveness = safeRequired<AutoFaceLivenessModule>('AutoFaceLiveness');

console.log('[AutoFaceRegistry] lookup comparison', {
  platform: Platform.OS,
  autofaceTestOptionalFound: Boolean(optionalTest),
  autofaceTestRequiredFound: Boolean(requiredTest),
  autofaceTestMarker:
    optionalTest?.registrationMarker ??
    requiredTest?.registrationMarker ??
    null,
  livenessOptionalFound: Boolean(optionalLiveness),
  livenessRequiredFound: Boolean(requiredLiveness),
  livenessMarker:
    optionalLiveness?.registrationMarker ??
    requiredLiveness?.registrationMarker ??
    null,
});

const nativeModule = optionalLiveness ?? requiredLiveness;

export function nativeLivenessAvailable() {
  const available =
    Platform.OS === 'ios' &&
    Boolean(nativeModule?.start);

  console.log('[AutoFaceRegistry] nativeLivenessAvailable', {
    platform: Platform.OS,
    available,
    found: Boolean(nativeModule),
    hasStart: Boolean(nativeModule?.start),
    keys: safeKeys(nativeModule),
  });

  return available;
}

export async function startNativeLiveness(
  sessionId: string,
  region: string,
): Promise<LivenessResult> {
  if (!nativeModule?.start) {
    throw new Error('NATIVE_LIVENESS_NOT_INSTALLED');
  }

  return nativeModule.start(sessionId, region);
}