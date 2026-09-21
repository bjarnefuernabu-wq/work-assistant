"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { translate, type Locale } from "@/lib/i18n/translate";

export function LoginForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const t = (key: string) => translate(locale, key);

  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-surface p-6">
      <div>
        <Label htmlFor="email">{t("Email")}</Label>
        <Input id="email" name="email" type="email" required autoFocus autoComplete="username" />
      </div>
      <div>
        <Label htmlFor="password">{t("Password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      {state?.error && <p className="text-xs text-critical">{t(state.error)}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? t("Signing in…") : t("Sign in")}
      </Button>
    </form>
  );
}
