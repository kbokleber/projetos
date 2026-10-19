"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { keycloakSignInAction } from "@/features/auth/actions";

export function KeycloakLoginButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      className="w-full"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await keycloakSignInAction();
        });
      }}
    >
      {pending ? "Redirecionando..." : "Entrar com KBO (Keycloak)"}
    </Button>
  );
}
