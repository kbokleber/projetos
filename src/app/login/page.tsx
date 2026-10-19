import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/features/auth/login-form";
import { KeycloakLoginButton } from "@/features/auth/keycloak-login-button";
import { APP_NAME } from "@/lib/constants";
import {
  isKeycloakConfigured,
  isLegacyLoginEnabled,
  loginErrorMessage,
} from "@/lib/keycloak";

type SearchParams = Promise<{
  registered?: string;
  reset?: string;
  session?: string;
  legacy?: string;
  error?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const justRegistered = params.registered === "1";
  const justReset = params.reset === "1";
  const sessionExpired = params.session === "expired";
  const keycloakOn = isKeycloakConfigured();
  const legacyRequested = params.legacy === "1";
  const showLegacyForm =
    !keycloakOn || (legacyRequested && isLegacyLoginEnabled());
  const errorMessage = loginErrorMessage(params.error);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <span className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            S
          </span>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            ServiceIT · {APP_NAME}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Entrar na sua conta
          </h1>
        </div>

        {sessionExpired && (
          <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
            Sua sessão expirou ou o banco foi recriado. Entre novamente.
          </p>
        )}
        {justRegistered && (
          <p className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
            Conta criada com sucesso. Faça login para continuar.
          </p>
        )}
        {justReset && (
          <p className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
            Senha redefinida. Faça login novamente.
          </p>
        )}
        {errorMessage && (
          <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        {keycloakOn && (
          <div className="mb-4">
            <KeycloakLoginButton />
          </div>
        )}

        {showLegacyForm && (
          <>
            {keycloakOn && (
              <p className="mb-3 text-center text-xs text-muted-foreground">
                Login legado (apenas administradores)
              </p>
            )}
            <LoginForm />
            <div className="mt-4 flex flex-col items-center gap-1 text-sm">
              <Link
                href="/forgot-password"
                className="text-primary hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
          </>
        )}

        {!keycloakOn && process.env.NODE_ENV !== "production" && (
          <div className="mt-6 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Credenciais de dev</p>
            <p>admin@example.com / admin123</p>
          </div>
        )}

        <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
          <Link href="/">Voltar</Link>
        </Button>
      </div>
    </main>
  );
}
