import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { sendEmailNotification } from "@/lib/server/email-notifications";
import { sendMobilePush } from "@/lib/server/push-notifications";

export type NotificationType = "introduction" | "message" | "connection" | "verification" | "safety";

export async function createNotification(input: {
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  actorUid?: string | null;
  matchId?: string | null;
}) {
  if (!adminDb) throw new Error("SERVER_NOT_CONFIGURED");
  const prefs = await adminDb.collection("notificationPreferences").doc(input.recipientUid).get();
  const data = prefs.data() ?? {};
  const enabled = input.type === "safety" ? true
    : input.type === "introduction" ? data.introductions !== false
    : input.type === "message" ? data.messages !== false
    : input.type === "connection" ? data.connectionUpdates !== false
    : input.type === "verification" ? data.verificationUpdates !== false : true;
  const jobs: Promise<unknown>[] = [];
  if (enabled) {
    jobs.push(adminDb.collection("notifications").add({
      recipientUid: input.recipientUid, type: input.type, title: input.title, body: input.body,
      actionUrl: input.actionUrl ?? null, actorUid: input.actorUid ?? null, matchId: input.matchId ?? null,
      read: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    }));
    jobs.push(sendMobilePush({recipientUid:input.recipientUid,title:input.title,body:input.body,type:input.type,matchId:input.matchId}));
  }
  jobs.push(sendEmailNotification({recipientUid:input.recipientUid,category:input.type,title:input.title,body:input.body,actionUrl:input.actionUrl??null,matchId:input.matchId??null}));
  await Promise.all(jobs);
}
