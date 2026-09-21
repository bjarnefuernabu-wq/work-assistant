import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession, type SessionOptions } from "iron-session";
import { prisma } from "@/lib/db/client";

export interface SessionData {
  userId?: string;
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short (need >= 32 chars). Set it in .env.local.",
    );
  }
  return secret;
}

const sessionOptions: SessionOptions = {
  cookieName: "work_assistant_session",
  password: "", // set lazily, see getSession()
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    ...sessionOptions,
    password: authSecret(),
  });
}

/** Returns the current user or null. Does not redirect. Use in places that render for both auth states. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

/** Returns the current user or redirects to /login. Use at the top of protected pages/layouts. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
