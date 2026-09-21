# AutoFace Mobile v0.1.16.1

Native Face Liveness build integration checkpoint.

- Adds an Expo config plugin that copies the AutoFace Swift bridge into the generated iOS project.
- Adds AWS Amplify UI Swift Liveness as an SPM dependency and links the FaceLiveness product.
- Registers `AutoFaceLiveness.start(sessionId, region)` for the React Native verification screen.
- Keeps Firebase as AutoFace user authentication.
- Keeps the verification API separate from the mip.chat browser experience via `EXPO_PUBLIC_VERIFICATION_API_BASE_URL`.
- iOS build number 13.

## Required runtime configuration

`EXPO_PUBLIC_VERIFICATION_API_BASE_URL` must point to the separately deployed AutoFace verification API. That API must authenticate Firebase bearer tokens and expose POST `/api/face-verification/start` and POST `/api/face-verification/result`.

The AWS Face Liveness iOS component also needs AWS authorization for `StartFaceLivenessSession`. AWS supports Amplify Auth/Cognito Identity Pool or a custom temporary credentials provider. Do not embed long-lived AWS credentials in the app.

This feature requires an EAS development/preview build; Expo Go cannot load the native module.
