"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { login, type LoginState } from "./actions";

const INITIAL: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, INITIAL);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-xl border border-border bg-card p-6"
    >
      <Lock className="size-6 text-primary" aria-hidden="true" />
      <h1 className="mt-3 text-2xl">Administracija</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Unesite lozinku da nastavite.
      </p>

      <label className="mt-6 block space-y-1.5">
        <span className="text-sm font-medium">Lozinka</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "admin-login-error" : undefined}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:border-primary"
        />
      </label>

      {state.error ? (
        <p
          id="admin-login-error"
          role="alert"
          className="mt-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="mt-5 w-full" disabled={pending}>
        {pending ? "Provera…" : "Prijava"}
      </Button>
    </form>
  );
}
