"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { changeEmail, changePassword, type AccountFormState } from "@/lib/actions/account";
import { useTranslation } from "@/components/i18n/locale-provider";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="sm" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function AccountSection({ currentEmail }: { currentEmail: string }) {
  const { t } = useTranslation();
  const [emailState, emailAction] = useActionState<AccountFormState, FormData>(changeEmail, undefined);
  const [passwordState, passwordAction] = useActionState<AccountFormState, FormData>(changePassword, undefined);

  return (
    <div className="grid grid-cols-2 gap-4">
      <form action={emailAction} className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{t("Change email address")}</p>
          <p className="text-xs text-muted">{t("Current:")} {currentEmail}</p>
        </div>
        <div>
          <Label htmlFor="newEmail">{t("New email address")}</Label>
          <Input id="newEmail" name="newEmail" type="email" required />
        </div>
        <div>
          <Label htmlFor="currentPasswordForEmail">{t("Current password")}</Label>
          <Input id="currentPasswordForEmail" name="currentPassword" type="password" required autoComplete="current-password" />
        </div>
        {emailState?.error && <p className="text-xs text-critical">{t(emailState.error)}</p>}
        {emailState?.success && <p className="text-xs text-ok">{t(emailState.success)}</p>}
        <SubmitButton label={t("Update email")} />
      </form>

      <form action={passwordAction} className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{t("Change password")}</p>
          <p className="text-xs text-muted">{t("You'll need your current password to confirm.")}</p>
        </div>
        <div>
          <Label htmlFor="currentPassword">{t("Current password")}</Label>
          <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
        </div>
        <div>
          <Label htmlFor="newPassword">{t("New password")}</Label>
          <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
        </div>
        <div>
          <Label htmlFor="confirmPassword">{t("Confirm new password")}</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
        </div>
        {passwordState?.error && <p className="text-xs text-critical">{t(passwordState.error)}</p>}
        {passwordState?.success && <p className="text-xs text-ok">{t(passwordState.success)}</p>}
        <SubmitButton label={t("Update password")} />
      </form>
    </div>
  );
}
