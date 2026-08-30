import Link from "next/link";
import { PunchPanel } from "../../../src/components/punch-panel";
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 p-6">
      {error ? (
        <>
          <p className="rounded-md border border-destructive/50 p-4 text-destructive" role="alert">
            状態を取得できませんでした: {error}
          </p>
          <Link href="/" className="text-primary underline underline-offset-4">
            ← 一覧へ戻る
          </Link>
        </>
      ) : (
        <PunchPanel
          workerId={workerId}
          displayName={displayName}
          initialStatus={status}
          onPunch={submitPunch}
        />
      )}
    </main>
  );
}
