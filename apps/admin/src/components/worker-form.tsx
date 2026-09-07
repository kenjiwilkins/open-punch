"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@open-punch/ui";
import type { FormState } from "../lib/crud-actions";

export interface WorkerFormValues {
  name?: string;
  displayName?: string;
  nameKana?: string;
  active?: boolean;
}

export function WorkerForm({
  action,
  values,
  submitLabel,
  showActive = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  values?: WorkerFormValues;
  submitLabel: string;
  showActive?: boolean;
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
        <Label htmlFor="name">氏名</Label>
        <Input id="name" name="name" defaultValue={values?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">表示名</Label>
        <Input id="displayName" name="displayName" defaultValue={values?.displayName} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nameKana">かな</Label>
        <Input id="nameKana" name="nameKana" defaultValue={values?.nameKana} required />
      </div>

      {showActive ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={values?.active ?? true} />
          有効（外すと退職＝一覧から除外）
        </label>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "送信中…" : submitLabel}
      </Button>
    </form>
  );
}
