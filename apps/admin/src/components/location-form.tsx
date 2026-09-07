"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@open-punch/ui";
import type { FormState } from "../lib/crud-actions";

export interface LocationFormValues {
  name?: string;
  timeZone?: string;
  businessDayCutoffHour?: number;
  country?: string;
  active?: boolean;
}

export function LocationForm({
  action,
  values,
  submitLabel,
  showActive = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  values?: LocationFormValues;
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
        <Label htmlFor="name">拠点名</Label>
        <Input id="name" name="name" defaultValue={values?.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="timeZone">タイムゾーン（IANA 名）</Label>
        <Input
          id="timeZone"
          name="timeZone"
          defaultValue={values?.timeZone}
          placeholder="Asia/Tokyo"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessDayCutoffHour">締め時刻（0–23）</Label>
        <Input
          id="businessDayCutoffHour"
          name="businessDayCutoffHour"
          type="number"
          min={0}
          max={23}
          defaultValue={values?.businessDayCutoffHour ?? 0}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="country">国（任意）</Label>
        <Input id="country" name="country" defaultValue={values?.country ?? ""} placeholder="JP" />
      </div>

      {showActive ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={values?.active ?? true} />
          有効
        </label>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "送信中…" : submitLabel}
      </Button>
    </form>
  );
}
