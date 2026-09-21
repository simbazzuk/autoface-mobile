import { adminDb } from "@/lib/server/firebase-admin";

export async function sendMobilePush(input: {
  recipientUid: string;
  title: string;
  body: string;
  type: string;
  matchId?: string | null;
}) {
  if (!adminDb) return;
  try {
    const snap = await adminDb.collection("pushNotificationDevices").doc(input.recipientUid).get();
    const tokens = (snap.data()?.expoPushTokens ?? []).filter((x: unknown): x is string => typeof x === "string");
    if (!tokens.length) return;
    const messages = tokens.map(to => ({
      to,
      sound: "default",
      title: input.title,
      body: input.body,
      data: { type: input.type, matchId: input.matchId ?? null },
    }));
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    if (!response.ok) console.error("[AutoFace push] Expo push request failed", response.status, await response.text());
  } catch (error) {
    console.error("[AutoFace push] delivery failed", error);
  }
}
