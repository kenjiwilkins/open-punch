import { PunchView } from "../../../src/components/punch-view";
import { WorkerStatus } from "../../../src/gql/graphql";
import { submitPunch } from "../../../src/lib/actions";
import { fetchWorkerStatus } from "../../../src/lib/kiosk-client";

export const dynamic = "force-dynamic";

export default async function PunchPage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { workerId } = await params;
  const { name } = await searchParams;
  const displayName = name ?? workerId;

  let status: WorkerStatus = WorkerStatus.NotClockedIn;
  let error: string | null = null;
  try {
    const current = await fetchWorkerStatus(workerId);
    if (current?.status) status = current.status;
  } catch (e) {
    error = e instanceof Error ? e.message : "不明なエラー";
  }

  return (
    <PunchView
      workerId={workerId}
      displayName={displayName}
      status={status}
      error={error}
      onPunch={submitPunch}
    />
  );
}
