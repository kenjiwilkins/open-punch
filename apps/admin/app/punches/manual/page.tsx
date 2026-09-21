import { AdminNav } from "../../../src/components/admin-nav";
import { ManualPunchForm } from "../../../src/components/manual-punch-form";
import { requireEmployee } from "../../../src/lib/auth/guard";
import { createManualPunchAction } from "../../../src/lib/crud-actions";
import { fetchWorkersByLocation } from "../../../src/lib/graphql-client";

export const dynamic = "force-dynamic";

export default async function ManualPunchPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const employee = await requireEmployee();
  const { location } = await searchParams;
  if (!location) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
        <AdminNav email={employee.email} />
        <p role="alert" className="text-destructive">
          拠点が指定されていません。当日打刻一覧から開いてください。
        </p>
      </main>
    );
  }

  const workers = (await fetchWorkersByLocation(location)).map((w) => ({
    id: w.id,
    displayName: w.displayName,
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <AdminNav email={employee.email} />
      <h1 className="text-2xl font-bold tracking-tight">打刻を手動で追加</h1>
      <p className="text-sm text-muted-foreground">打刻漏れの追加として、監査ログに記録されます。</p>
      {workers.length === 0 ? (
        <p className="text-muted-foreground" role="status">
          この拠点には有効なアルバイトがいません。
        </p>
      ) : (
        <ManualPunchForm action={createManualPunchAction.bind(null, location)} workers={workers} />
      )}
    </main>
  );
}
