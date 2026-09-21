# AutoFace Mobile v0.1.16.2

Native iOS Face Liveness build fix.

## Changes from v0.1.16.1
- Keeps the native `FaceLivenessDetectorView` integration.
- Adds an EAS post-install hook that permits Xcode to validate/use the trusted SwiftPM build plugin pulled transitively by the official AWS Face Liveness package.
- Does not add AWS long-lived credentials to the app.
- Keeps the standalone verification API architecture.
- App version 0.1.16.2; iOS build 14.

## Why
The v0.1.16.1 EAS archive resolved `AmplifyUILiveness` successfully but stopped while validating `SmithyCodeGeneratorPlugin`. This build configures Xcode on the ephemeral EAS builder before archive so the AWS package graph can compile.

## Test
1. `npm install --legacy-peer-deps`
2. `npm run typecheck`
3. `eas build --platform ios --profile development --clear-cache`
4. Install the newly generated development build on the iPhone.

The Verification API still requires `EXPO_PUBLIC_VERIFICATION_API_BASE_URL` to point to the standalone verification backend.
