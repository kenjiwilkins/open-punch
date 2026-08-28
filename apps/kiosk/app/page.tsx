import { Button } from "@open-punch/ui";

// M2 の土台確認用ページ。名前選択と打刻の本実装は後続 issue。
// packages/ui の Button が import・描画できることをここで担保する。
export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">open-punch kiosk</h1>
        <p className="text-muted-foreground">
          Next.js + shadcn/ui の土台。名前選択と打刻の UI は後続 issue で作ります。
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">共有 Button（@open-punch/ui）</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button>既定</Button>
          <Button variant="secondary">セカンダリ</Button>
          <Button variant="outline">アウトライン</Button>
          <Button variant="destructive">退勤</Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg">大（lg）</Button>
          <Button size="xl">打刻（xl・iPad 用特大）</Button>
        </div>
      </section>
    </main>
  );
}
