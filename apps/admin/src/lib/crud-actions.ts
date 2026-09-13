"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PunchType } from "../gql/graphql";
import {
  correctPunch,
  createLocation,
  createManualPunch,
  createWorker,
  deactivateWorker,
  updateLocation,
  updateWorker,
} from "./graphql-client";

export interface FormState {
  error?: string;
}

// graphql-request の ClientError からサーバーのエラーメッセージ（BAD_USER_INPUT 等）を取り出す。
function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "response" in e) {
    const resp = (e as { response?: { errors?: { message?: string }[] } }).response;
    const msg = resp?.errors?.[0]?.message;
    if (msg) return msg;
  }
  return e instanceof Error ? e.message : "エラーが発生しました";
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function optStr(fd: FormData, key: string): string | undefined {
  const v = str(fd, key);
  return v === "" ? undefined : v;
}
function optNum(fd: FormData, key: string): number | undefined {
  const v = str(fd, key);
  return v === "" ? undefined : Number(v);
}
function checked(fd: FormData, key: string): boolean {
  return fd.get(key) != null;
}

export async function createLocationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    await createLocation({
      name: str(fd, "name"),
      timeZone: str(fd, "timeZone"),
      businessDayCutoffHour: optNum(fd, "businessDayCutoffHour"),
      country: optStr(fd, "country"),
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/locations");
  redirect("/locations");
}

export async function updateLocationAction(
  locationId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    await updateLocation(locationId, {
      name: optStr(fd, "name"),
      timeZone: optStr(fd, "timeZone"),
      businessDayCutoffHour: optNum(fd, "businessDayCutoffHour"),
      country: optStr(fd, "country"),
      active: checked(fd, "active"),
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/locations");
  redirect("/locations");
}

export async function createWorkerAction(
  locationId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    await createWorker({
      locationId,
      name: str(fd, "name"),
      displayName: str(fd, "displayName"),
      nameKana: str(fd, "nameKana"),
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/workers");
  redirect(`/workers?location=${locationId}`);
}

export async function updateWorkerAction(
  workerId: string,
  locationId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    await updateWorker(workerId, {
      name: optStr(fd, "name"),
      displayName: optStr(fd, "displayName"),
      nameKana: optStr(fd, "nameKana"),
      active: checked(fd, "active"),
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/workers");
  redirect(`/workers?location=${locationId}`);
}

// 退職（非活性化）。フォームの submit から呼ぶため FormData も受けるが未使用。
export async function deactivateWorkerAction(
  workerId: string,
  locationId: string,
  _fd?: FormData,
): Promise<void> {
  await deactivateWorker(workerId);
  revalidatePath("/workers");
  redirect(`/workers?location=${locationId}`);
}

// --- 打刻補正・手動追加（#20。鉄則8: PunchAudit が append される） -----------------

/** 補正対象の複合キー（PunchEvent の SK が occurredAt を含むため id だけでは引けない）。 */
export async function correctPunchAction(
  workerId: string,
  id: string,
  occurredAt: string,
  locationId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    await correctPunch(workerId, id, occurredAt, {
      occurredAt: optStr(fd, "occurredAt"),
      type: optStr(fd, "type") as PunchType | undefined,
      note: str(fd, "note"),
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/");
  redirect(`/?location=${locationId}`);
}

export async function createManualPunchAction(
  locationId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    await createManualPunch({
      workerId: str(fd, "workerId"),
      type: str(fd, "type") as PunchType,
      occurredAt: str(fd, "occurredAt"),
      note: str(fd, "note"),
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/");
  redirect(`/?location=${locationId}`);
}
