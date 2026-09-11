import Link from "next/link";
import { AdminNav } from "../../src/components/admin-nav";
import { LocationForm } from "../../src/components/location-form";
import { requireEmployee } from "../../src/lib/auth/guard";
import { createLocationAction } from "../../src/lib/crud-actions";
import { fetchAdminLocations } from "../../src/lib/graphql-client";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const employee = await requireEmployee();
  const locations = (await fetchAdminLocations()).flatMap((l) =>
    l?.id && l.name ? [l] : [],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 p-8">
      <AdminNav email={employee.email} />
      <h1 className="text-2xl font-bold tracking-tight">拠点</h1>

      <section className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b text-sm text-muted-foreground">
              <th className="py-2 pr-4 font-medium">拠点名</th>
              <th className="py-2 pr-4 font-medium">タイムゾーン</th>
              <th className="py-2 pr-4 font-medium">締め時刻</th>
              <th className="py-2 pr-4 font-medium">状態</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="py-2 pr-4">{l.name}</td>
                <td className="py-2 pr-4">{l.timeZone}</td>
                <td className="py-2 pr-4 tabular-nums">{l.businessDayCutoffHour ?? 0}</td>
                <td className="py-2 pr-4">{l.active ? "有効" : "無効"}</td>
                <td className="py-2">
                  <Link
                    href={`/locations/${l.id}/edit`}
                    className="text-primary underline underline-offset-4"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">拠点を追加</h2>
        <LocationForm action={createLocationAction} submitLabel="作成" />
      </section>
    </main>
  );
}
