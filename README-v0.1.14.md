# AutoFace Mobile v0.1.14 – Mobile Verification Journey

- Adds actionable Face Verification from the native Profile verification hub.
- Reuses the existing AutoFace/Amazon Rekognition verification backend and web Face Liveness experience.
- Adds Refresh verification to pull trusted Photo, Liveness and Identity states back into the mobile app.
- Supports `EXPO_PUBLIC_FACE_VERIFICATION_URL` for a direct link to the deployed Face Verification page; otherwise safely opens `https://mip.chat`.
- Does not fabricate liveness, identity, confidence or face-match results on-device.
- Version 0.1.14 / iOS build 10.

## Important
AWS documents Face Liveness detector components for React web and native Swift/iOS, but the React Native Amplify UI catalog does not expose the Face Liveness connected component. This patch therefore integrates the proven AutoFace verification journey without pretending Expo Go has a native detector. A fully native iOS detector is a later development-build/Swift integration.
