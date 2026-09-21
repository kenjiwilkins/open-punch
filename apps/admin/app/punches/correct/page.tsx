import { AdminNav } from "../../../src/components/admin-nav";
import { CorrectPunchForm } from "../../../src/components/correct-punch-form";
import { requireEmployee } from "../../../src/lib/auth/guard";
import { correctPunchAction } from "../../../src/lib/crud-actions";

export const dynamic = "force-dynamic";

export default async function CorrectPunchPage({
  searchParams,
}: {
  searchParams: Promise<{
    workerId?: string;
    id?: string;
    occurredAt?: string;
    type?: string;
    location?: string;
    workerName?: string;
  }>;
}) {
  const employee = await requireEmployee();
  const { workerId, id, occurredAt, type, location, workerName } = await searchParams;
  if (!workerId || !id || !occurredAt || !location) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
        <AdminNav email={employee.email} />
        <p role="alert" className="text-destructive">
          補正対象が指定されていません。当日打刻一覧から「補正」リンクで開いてください。
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <AdminNav email={employee.email} />
      <h1 className="text-2xl font-bold tracking-tight">打刻を補正</h1>
      <p className="text-sm text-muted-foreground">
        元の打刻イベントは書き換えられず、補正の履歴（監査ログ）として残ります。
      </p>
      <CorrectPunchForm
        action={correctPunchAction.bind(null, workerId, id, occurredAt, location)}
        values={{
          occurredAt,
          type: type === "CLOCK_OUT" ? "CLOCK_OUT" : "CLOCK_IN",
          workerName: workerName ?? "(不明)",
        }}
      />
    </main>
  );
}
