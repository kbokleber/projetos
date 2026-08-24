import Link from "next/link";
import { ForgotForm } from "@/features/auth/forgot-form";
import { APP_NAME } from "@/lib/constants";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            {APP_NAME}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recuperar senha
          </h1>
          <p className="text-sm text-muted-foreground">
            Informe seu e-mail para iniciar a recuperação.
          </p>
        </div>

        <ForgotForm />

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
