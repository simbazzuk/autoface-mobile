import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId() {
  return Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
}

export async function notificationPermissionStatus() {
  const current = await Notifications.getPermissionsAsync();
  return current.status;
}

export async function enablePushNotifications() {
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  }
  if (permission.status !== 'granted') {
    throw new Error('NOTIFICATION_PERMISSION_DENIED');
  }

  const id = projectId();
  if (!id) throw new Error('EAS_PROJECT_ID_MISSING');

  const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;

  await api('/api/mobile-push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform: 'ios' }),
  });
  return token;
}
