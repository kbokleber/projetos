import Link from "next/link";
import { ResetForm } from "@/features/auth/reset-form";
import { APP_NAME } from "@/lib/constants";

type SearchParams = Promise<{ token?: string }>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            {APP_NAME}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Definir nova senha
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma nova senha para sua conta.
          </p>
        </div>

        <ResetForm token={token ?? ""} />

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
