import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/nav/sidebar";
import { TopBar } from "@/components/nav/top-bar";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { isLocale } from "@/lib/i18n/translate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = isLocale(user.locale) ? user.locale : "en";

  return (
    <LocaleProvider locale={locale}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar userName={user.name} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </LocaleProvider>
  );
}
