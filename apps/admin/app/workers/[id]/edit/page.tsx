import { notFound } from "next/navigation";
import { AdminNav } from "../../../../src/components/admin-nav";
import { WorkerForm } from "../../../../src/components/worker-form";
import { requireEmployee } from "../../../../src/lib/auth/guard";
import { updateWorkerAction } from "../../../../src/lib/crud-actions";
import { fetchWorkersByLocation } from "../../../../src/lib/graphql-client";

export const dynamic = "force-dynamic";

export default async function EditWorkerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const employee = await requireEmployee();
  const { id } = await params;
  const { location } = await searchParams;
  if (!location) notFound();

  const worker = (await fetchWorkersByLocation(location)).find((w) => w?.id === id);
  if (!worker) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 p-8">
      <AdminNav email={employee.email} />
      <h1 className="text-2xl font-bold tracking-tight">アルバイトを編集</h1>
      <WorkerForm
        action={updateWorkerAction.bind(null, id, location)}
        submitLabel="更新"
        showActive
        values={{
          name: worker.name ?? undefined,
          displayName: worker.displayName ?? undefined,
          nameKana: worker.nameKana ?? undefined,
          active: worker.active ?? true,
        }}
      />
    </main>
  );
}
