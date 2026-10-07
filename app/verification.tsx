import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, H2, Screen } from '@/src/components/UI';
import { useAppTheme } from '@/src/context/Theme';
import { api } from '@/src/lib/api';
import {
  nativeLivenessAvailable,
  startNativeLiveness,
} from '@/src/lib/nativeLiveness';
import {
  verificationApi,
  verificationApiConfigured,
} from '@/src/lib/verificationApi';

type StartResponse = {
  sessionId?: string;
  sessionID?: string;
  region?: string;
  status?: string;
};

type ResultResponse = {
  verified?: boolean;
  livenessVerified?: boolean;
  identityVerified?: boolean;
  photoVerified?: boolean;
};

type ReadinessResponse = {
  faceVerified?: boolean;
};

const CONSENT_VERSION = '2026-08-v1';

export default function Verification() {
  const { colors } = useAppTheme();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [biometricConsent, setBiometricConsent] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  const configured = verificationApiConfigured();
  const nativeReady = nativeLivenessAvailable();

  useEffect(() => {
    let active = true;

    async function checkVerificationStatus() {
      try {
        const readiness = await api<ReadinessResponse>('/api/readiness');

        if (active) {
          setAlreadyVerified(readiness.faceVerified === true);
        }
      } catch (error) {
        console.warn(
          '[FaceVerification] unable to load current verification status',
          error
        );
      } finally {
        if (active) {
          setCheckingStatus(false);
        }
      }
    }

    void checkVerificationStatus();

    return () => {
      active = false;
    };
  }, []);

  async function begin() {
    if (busy || !biometricConsent) return;

    try {
      setBusy(true);
      setMessage('Creating secure liveness session…');

      const start = await verificationApi<StartResponse>(
        '/api/face-verification/start',
        {
          method: 'POST',
          body: JSON.stringify({
            biometricConsent: true,
            consentVersion: CONSENT_VERSION,
          }),
        }
      );

      if (start.status === 'already_verified') {
        setAlreadyVerified(true);
        setMessage('');
        return;
      }

      const sessionId = start.sessionId || start.sessionID;
      const region =
        start.region ||
        process.env.EXPO_PUBLIC_AWS_REKOGNITION_REGION ||
        'eu-west-2';

      if (!sessionId) {
        console.warn('[FaceVerification] start response missing session ID', start);
        throw new Error('LIVENESS_SESSION_MISSING');
      }

      setMessage('Starting iPhone face check…');

      await startNativeLiveness(sessionId, region);

      setMessage('Checking verification result…');

      const result = await verificationApi<ResultResponse>(
        '/api/face-verification/result',
        {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        }
      );

      if (result.verified || result.livenessVerified) {
        setAlreadyVerified(true);
        setMessage('');
      } else {
        setMessage(
          'The check completed but verification was not confirmed. Please try again.'
        );
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Unable to verify.';

      setMessage(
        raw === 'VERIFICATION_API_NOT_CONFIGURED'
          ? 'Standalone verification backend is not configured yet.'
          : raw === 'NATIVE_LIVENESS_NOT_INSTALLED'
          ? 'Native Face Liveness is not installed in this build.'
          : raw === 'AUTH_REQUIRED'
          ? 'Please sign in again before verification.'
          : raw === 'BIOMETRIC_CONSENT_REQUIRED'
          ? 'Please confirm your biometric verification consent before continuing.'
          : raw
      );
    } finally {
      setBusy(false);
    }
  }

  const canStart =
    configured &&
    nativeReady &&
    biometricConsent &&
    !busy;

  if (checkingStatus) {
    return (
      <Screen eyebrow="AUTOFACE SECURITY" title="Face verification">
        <Card>
          <H2>Checking verification status…</H2>
          <Body>Please wait while AutoFace checks your current verification.</Body>
        </Card>
      </Screen>
    );
  }

  if (alreadyVerified) {
    return (
      <Screen eyebrow="AUTOFACE SECURITY" title="Face verification">
        <Card>
          <H2>✓ Face Verified</H2>

          <Body>
            Your identity has already completed AutoFace Face Verification.
            You do not need to complete another biometric check.
          </Body>

          <Button
            title="Continue"
            onPress={() => router.replace('/(tabs)/discover')}
          />
        </Card>

        <Button
          title="Back to Profile"
          secondary
          onPress={() => router.replace('/(tabs)/profile')}
        />
      </Screen>
    );
  }

  return (
    <Screen eyebrow="AUTOFACE SECURITY" title="Face verification">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          gap: 12,
          paddingBottom: 60,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <H2>Verify inside AutoFace</H2>

          <Body>
            This check stays in the AutoFace iOS experience. It does not
            open mip.chat or Safari.
          </Body>

          <Body>
            AutoFace creates a secure liveness session, runs Amazon
            Rekognition Face Liveness on the iPhone, then asks the
            verification backend to confirm the result against your profile.
          </Body>
        </Card>

        <Card>
          <H2>Biometric verification consent</H2>

          <Body>
            Face Verification uses Amazon Rekognition to perform a live
            camera liveness check and compare the resulting reference image
            with your AutoFace profile photo.
          </Body>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: biometricConsent }}
            onPress={() => {
              if (!busy) {
                setBiometricConsent((current) => !current);
                setMessage('');
              }
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
              marginTop: 8,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: biometricConsent
                ? colors.green
                : colors.muted,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: biometricConsent
                  ? colors.green
                  : colors.muted,
                backgroundColor: biometricConsent
                  ? colors.green
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              {biometricConsent ? (
                <Text
                  style={{
                    color: '#ffffff',
                    fontWeight: '900',
                    fontSize: 16,
                  }}
                >
                  ✓
                </Text>
              ) : null}
            </View>

            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: '800',
                  lineHeight: 21,
                }}
              >
                I explicitly consent to AutoFace processing my biometric
                data for face verification.
              </Text>

              <Text
                style={{
                  color: colors.muted,
                  lineHeight: 20,
                }}
              >
                I understand that I can choose not to verify my face and
                can withdraw consent for future biometric processing
                through AutoFace privacy controls.
              </Text>
            </View>
          </Pressable>
        </Card>

        <Card>
          <H2>Ready to verify</H2>

          <View style={{ gap: 8 }}>
            <Status
              label="Verification API"
              ok={configured}
            />

            <Status
              label="Native iOS Face Liveness"
              ok={nativeReady}
            />

            <Status
              label="Biometric consent"
              ok={biometricConsent}
            />
          </View>

          <Button
            title={
              busy
                ? 'Verification in progress…'
                : 'Start face check'
            }
            disabled={!canStart}
            onPress={begin}
          />

          {message ? (
            <Text
              style={{
                color: colors.text,
                lineHeight: 20,
              }}
            >
              {message}
            </Text>
          ) : null}
        </Card>

        <Button
          title="Back to Profile"
          secondary
          onPress={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}

function Status({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontWeight: '700',
          flex: 1,
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          color: ok ? colors.green : colors.muted,
          fontWeight: '800',
        }}
      >
        {ok ? 'Ready' : 'Required'}
      </Text>
    </View>
  );
}
