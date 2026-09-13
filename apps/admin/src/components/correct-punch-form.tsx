"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@open-punch/ui";
import type { FormState } from "../lib/crud-actions";

export interface CorrectPunchFormValues {
  occurredAt: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  workerName: string;
}

// 打刻の補正フォーム。元イベントは書き換えられず、PunchAudit として補正履歴が残ることを明示する（鉄則8）。
export function CorrectPunchForm({
  action,
  values,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  values: CorrectPunchFormValues;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {state.error ? (
        <p role="alert" className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        対象: {values.workerName} / 現在の記録: {values.occurredAt}（UTC）
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="occurredAt">補正後の時刻（UTC, ISO8601）</Label>
        <Input id="occurredAt" name="occurredAt" defaultValue={values.occurredAt} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">種別</Label>
        <select
          id="type"
          name="type"
          defaultValue={values.type}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="CLOCK_IN">出勤</option>
          <option value="CLOCK_OUT">退勤</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">補正理由（必須・監査履歴に記録されます）</Label>
        <textarea
          id="note"
          name="note"
          required
          rows={3}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "送信中…" : "補正する"}
      </Button>
    </form>
  );
}
