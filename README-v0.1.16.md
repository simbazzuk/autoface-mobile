# AutoFace Mobile v0.1.16 — Standalone Native Verification

## Direction change
v0.1.16 removes the browser/mip.chat verification handoff from the mobile UI. Profile now routes to an in-app `/verification` screen.

## Included
- No `Linking.openURL()` for face verification.
- Separate `EXPO_PUBLIC_VERIFICATION_API_BASE_URL` so verification is not coupled to the mip.chat website origin.
- Firebase bearer token is sent to the verification API; no Firebase token is put in a URL.
- Native liveness adapter contract and iOS Swift source using AWS Amplify UI `FaceLivenessDetectorView`.
- Existing verification result remains server-authoritative.
- Version 0.1.16 / iOS build 12.

## Important build boundary
AWS Face Liveness for iOS is a native Swift component. It cannot run in Expo Go. The supplied React Native screen detects whether the native module is present and will not fake a liveness result when it is absent.

The Swift source under `native-ios/AutoFaceLiveness` is the native implementation basis, but the Expo/EAS native bridge and Swift Package linkage must be added to the generated iOS build before `Native iOS Face Liveness` reports Ready. This package therefore establishes the standalone mobile architecture without pretending the native binary is already linked.

## Environment
```
EXPO_PUBLIC_VERIFICATION_API_BASE_URL=https://<your-verification-api-host>
EXPO_PUBLIC_AWS_REKOGNITION_REGION=eu-west-2
```

The verification API host needs authenticated equivalents of:
- `POST /api/face-verification/start`
- `POST /api/face-verification/result`

These can reuse the existing AutoFace server logic but should be deployed as a mobile verification service if the goal is zero dependency on the mip.chat website.
