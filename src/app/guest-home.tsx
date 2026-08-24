import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export default function GuestHome() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          {APP_NAME}
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Organize projetos em quadros Kanban simples e rápidos
        </h1>
        <p className="max-w-lg text-muted-foreground">
          Crie workspaces, gerencie projetos, colunas e cards estilo Trello —
          com drag and drop, etiquetas, responsáveis e prazos.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/signup">Criar conta</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    </main>
  );
}
