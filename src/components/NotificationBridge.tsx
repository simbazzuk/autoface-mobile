import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/src/context/Auth';

function openNotification(response: Notifications.NotificationResponse | null | undefined) {
  const data = response?.notification.request.content.data as { matchId?: unknown } | undefined;
  const matchId = typeof data?.matchId === 'string' ? data.matchId : '';
  if (matchId) router.push(`/chat/${encodeURIComponent(matchId)}` as never);
}

export function NotificationBridge() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    void Notifications.getLastNotificationResponseAsync().then(openNotification);
    return () => subscription.remove();
  }, [user]);
  return null;
}
