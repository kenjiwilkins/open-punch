"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@open-punch/ui";
import { PunchType, WorkerStatus } from "../gql/graphql";
import type { PunchResult } from "../lib/actions";

// 完了表示から一覧へ自動で戻るまでの秒数。
const RETURN_AFTER_MS = 3000;

export interface PunchPanelProps {
  workerId: string;
  displayName: string;
  initialStatus: WorkerStatus;
  onPunch: (workerId: string, type: PunchType) => Promise<PunchResult>;
}

type Phase = "ready" | "submitting" | "done" | "error";

export function PunchPanel({ workerId, displayName, initialStatus, onPunch }: PunchPanelProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState<string | null>(null);
  // 同一 tick の連打も弾く即時ロック（state はこの tick では stale なため ref で持つ）。
  const lockRef = useRef(false);

  const isWorking = initialStatus === WorkerStatus.Working;
  const type = isWorking ? PunchType.ClockOut : PunchType.ClockIn;
  const label = isWorking ? "退勤" : "出勤";

  // 完了したら一定時間後に一覧へ戻る。
  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(() => {
      router.push("/");
      router.refresh();
    }, RETURN_AFTER_MS);
    return () => clearTimeout(timer);
  }, [phase, router]);

  async function handlePunch() {
    // クールダウン（二重防御）: 一度押したら以降のクリックを無視する。
    if (lockRef.current) return;
    lockRef.current = true;
    setPhase("submitting");
    const result = await onPunch(workerId, type);
    if (result.ok) {
      setPhase("done");
    } else {
      setMessage(result.message);
      setPhase("error");
      lockRef.current = false; // 失敗時は再試行できるよう解放
    }
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <p className="text-4xl font-bold">{label}しました</p>
        <p className="text-xl text-muted-foreground">{displayName} さん、おつかれさまです</p>
        <p className="text-sm text-muted-foreground">まもなく一覧に戻ります…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-3xl font-bold">{displayName}</p>

      {phase === "error" ? (
        <p className="rounded-md border border-destructive/50 p-4 text-destructive" role="alert">
          打刻できませんでした: {message}
        </p>
      ) : null}

      <Button
        size="xl"
        variant={isWorking ? "destructive" : "default"}
        className="min-w-64"
        disabled={phase === "submitting"}
        onClick={handlePunch}
      >
        {phase === "submitting" ? "送信中…" : label}
      </Button>

      <button
        type="button"
        className="text-muted-foreground underline underline-offset-4 disabled:opacity-50"
        disabled={phase === "submitting"}
        onClick={() => router.push("/")}
      >
        キャンセルして一覧へ戻る
      </button>
    </div>
  );
}
