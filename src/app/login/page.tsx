import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-sm font-medium tracking-wide text-neutral-500 uppercase">
            Work Assistant
          </div>
          <h1 className="text-xl font-semibold text-neutral-100">Sign in</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
