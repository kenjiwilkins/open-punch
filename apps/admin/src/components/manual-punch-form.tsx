"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@open-punch/ui";
import type { FormState } from "../lib/crud-actions";

export interface ManualPunchWorkerOption {
  id: string;
  displayName: string;
}

// 打刻漏れの手動追加フォーム。PunchAudit(MANUAL_ADD) として履歴が残ることを明示する（鉄則8）。
export function ManualPunchForm({
  action,
  workers,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  workers: ManualPunchWorkerOption[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {state.error ? (
        <p role="alert" className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workerId">アルバイト</Label>
        <select
          id="workerId"
          name="workerId"
          required
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">種別</Label>
        <select
          id="type"
          name="type"
          defaultValue="CLOCK_IN"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="CLOCK_IN">出勤</option>
          <option value="CLOCK_OUT">退勤</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="occurredAt">時刻（UTC, ISO8601）</Label>
        <Input id="occurredAt" name="occurredAt" placeholder="2026-08-25T09:00:00Z" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">追加理由（必須・監査履歴に記録されます）</Label>
        <textarea
          id="note"
          name="note"
          required
          rows={3}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "送信中…" : "手動追加する"}
      </Button>
    </form>
  );
}
