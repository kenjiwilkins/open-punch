import { notFound } from "next/navigation";
import { AdminNav } from "../../../../src/components/admin-nav";
import { LocationForm } from "../../../../src/components/location-form";
import { requireEmployee } from "../../../../src/lib/auth/guard";
import { updateLocationAction } from "../../../../src/lib/crud-actions";
import { fetchAdminLocations } from "../../../../src/lib/graphql-client";

export const dynamic = "force-dynamic";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const employee = await requireEmployee();
  const { id } = await params;
  const location = (await fetchAdminLocations()).find((l) => l.id === id);
  if (!location) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 p-8">
      <AdminNav email={employee.email} />
      <h1 className="text-2xl font-bold tracking-tight">拠点を編集</h1>
      <LocationForm
        action={updateLocationAction.bind(null, id)}
        submitLabel="更新"
        showActive
        values={{
          name: location.name,
          timeZone: location.timeZone,
          businessDayCutoffHour: location.businessDayCutoffHour,
          country: location.country ?? undefined,
          active: location.active,
        }}
      />
    </main>
  );
}
