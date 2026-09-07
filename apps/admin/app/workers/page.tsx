import Link from "next/link";
import { Button, cn } from "@open-punch/ui";
import { AdminNav } from "../../src/components/admin-nav";
import { WorkerForm } from "../../src/components/worker-form";
import { requireEmployee } from "../../src/lib/auth/guard";
import { createWorkerAction, deactivateWorkerAction } from "../../src/lib/crud-actions";
import { fetchAdminLocations, fetchWorkersByLocation } from "../../src/lib/graphql-client";

export const dynamic = "force-dynamic";

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const employee = await requireEmployee();
  const { location } = await searchParams;
  const selected = location ?? null;

  const locations = (await fetchAdminLocations()).flatMap((l) =>
    l?.id && l.name ? [{ id: l.id, name: l.name }] : [],
  );
  const workers = selected
    ? (await fetchWorkersByLocation(selected)).flatMap((w) =>
        w?.id && w.displayName ? [w] : [],
      )
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 p-8">
      <AdminNav email={employee.email} />
      <h1 className="text-2xl font-bold tracking-tight">アルバイト</h1>

      <nav aria-label="拠点選択" className="flex flex-wrap gap-2">
        {locations.map((l) => (
          <Link
            key={l.id}
            href={`/workers?location=${l.id}`}
            aria-current={l.id === selected ? "true" : undefined}
            className={cn(
              "rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent",
              l.id === selected && "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {l.name}
          </Link>
        ))}
      </nav>

      {!selected ? (
        <p className="text-muted-foreground" role="status">
          拠点を選択してください。
        </p>
      ) : (
        <>
          <section className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">表示名</th>
                  <th className="py-2 pr-4 font-medium">氏名</th>
                  <th className="py-2 pr-4 font-medium">かな</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-muted-foreground" role="status">
                      有効なアルバイトはいません。
                    </td>
                  </tr>
                ) : (
                  workers.map((w) => (
                    <tr key={w.id} className="border-b">
                      <td className="py-2 pr-4">{w.displayName}</td>
                      <td className="py-2 pr-4">{w.name}</td>
                      <td className="py-2 pr-4">{w.nameKana}</td>
                      <td className="flex items-center gap-3 py-2">
                        <Link
                          href={`/workers/${w.id}/edit?location=${selected}`}
                          className="text-primary underline underline-offset-4"
                        >
                          編集
                        </Link>
                        <form action={deactivateWorkerAction.bind(null, w.id ?? "", selected)}>
                          <Button type="submit" variant="destructive" size="sm">
                            退職
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">アルバイトを追加</h2>
            <WorkerForm action={createWorkerAction.bind(null, selected)} submitLabel="作成" />
          </section>
        </>
      )}
    </main>
  );
}
