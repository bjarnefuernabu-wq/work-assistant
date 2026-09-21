import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getGuestLocale } from "@/lib/actions/locale";
import { getT } from "@/lib/i18n/translate";
import { LoginForm } from "./login-form";
import { GuestLocaleSwitcher } from "./guest-locale-switcher";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const locale = await getGuestLocale();
  const t = getT(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-sm font-medium tracking-wide text-neutral-500 uppercase">
            {t("Work Assistant")}
          </div>
          <h1 className="text-xl font-semibold text-neutral-100">{t("Sign in")}</h1>
        </div>
        <LoginForm locale={locale} />
        <div className="mt-4 flex justify-center">
          <GuestLocaleSwitcher current={locale} />
        </div>
      </div>
    </div>
  );
}
