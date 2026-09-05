import { buttonVariants } from "@open-punch/ui";

// 未ログインの入口 / コールバック失敗時のエラー表示。
// 実際の認証 UI は Cognito Hosted UI（このページには自前の認証フォームは無い）。
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight">open-punch 管理</h1>
      <p className="text-muted-foreground">社員アカウントでログインしてください。</p>

      {error ? (
        <p className="text-destructive" role="alert">
          ログインに失敗しました（{error}）。もう一度お試しください。
        </p>
      ) : null}

      <a href="/api/auth/login" className={buttonVariants({ size: "lg" })}>
        ログイン
      </a>
    </main>
  );
}
