"use server";

import type { PunchType } from "../gql/graphql";
import { punch } from "./kiosk-client";

export type PunchResult = { ok: true } | { ok: false; message: string };

// 打刻の Server Action。時刻はサーバー（GraphQL resolver）が決めるため渡さない。
// サーバー側で連打とみなされた場合も既存イベントが返るだけなので正常系（ok:true）。
export async function submitPunch(workerId: string, type: PunchType): Promise<PunchResult> {
  try {
    await punch(workerId, type);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "打刻に失敗しました" };
  }
}
