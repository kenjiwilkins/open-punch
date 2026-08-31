import Link from "next/link";
import type { PunchType, WorkerStatus } from "../gql/graphql";
import type { PunchResult } from "../lib/actions";
import { PunchPanel } from "./punch-panel";

// 打刻ページの見た目（presentational）。状態取得・Server Action はページ側が担い、
// ここは props（状態・onPunch）を受け取って描画するだけ。
export function PunchView({
  workerId,
  displayName,
  status,
  error,
  onPunch,
}: {
  workerId: string;
  displayName: string;
  status: WorkerStatus;
  error?: string | null;
  onPunch: (workerId: string, type: PunchType) => Promise<PunchResult>;
}) {
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
          onPunch={onPunch}
        />
      )}
    </main>
  );
}
