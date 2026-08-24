import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="mb-1 text-xs font-medium tracking-wide text-primary uppercase">
          {APP_NAME}
        </p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Cadastro desabilitado
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Novos usuários são criados apenas por um administrador do sistema.
          Entre em contato com o responsável para receber um convite.
        </p>

        <Button asChild className="w-full">
          <Link href="/login">Voltar para o login</Link>
        </Button>
      </div>
    </main>
  );
}
