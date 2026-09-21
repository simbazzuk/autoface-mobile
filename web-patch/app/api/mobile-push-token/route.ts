import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireUser } from "@/lib/server/firebase-admin";

type Body = { token?: string; platform?: string };

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!adminDb) throw new Error("SERVER_NOT_CONFIGURED");
    const body = (await request.json()) as Body;
    const token = body.token?.trim() ?? "";
    if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
      return NextResponse.json({ error: "INVALID_PUSH_TOKEN" }, { status: 400 });
    }
    await adminDb.collection("pushNotificationDevices").doc(user.uid).set({
      expoPushTokens: FieldValue.arrayUnion(token),
      platform: body.platform ?? "unknown",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
