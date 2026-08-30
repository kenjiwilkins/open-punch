import Link from "next/link";

// 打刻フローのプレースホルダ。状態に応じた出勤/退勤ボタンと確定は次 issue で実装する。
export default async function PunchPage({ params }: { params: Promise<{ workerId: string }> }) {
  const { workerId } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">打刻（準備中）</h1>
      <p className="text-muted-foreground">worker: {workerId}</p>
      <Link href="/" className="text-primary underline underline-offset-4">
        ← 名前一覧へ戻る
      </Link>
    </main>
  );
}
