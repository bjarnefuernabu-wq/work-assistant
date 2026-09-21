"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logActivity } from "@/lib/activity/log";

export type AccountFormState = { error?: string; success?: string } | undefined;

const changeEmailSchema = z.object({
  newEmail: z.email({ error: "Enter a valid email address." }),
  currentPassword: z.string().min(1, { error: "Enter your current password to confirm." }),
});

export async function changeEmail(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = changeEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { newEmail, currentPassword } = parsed.data;

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return { error: "Current password is incorrect." };
  }

  if (newEmail === user.email) {
    return { error: "That's already your current email address." };
  }

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) return { error: "That email address is already in use." };

  await prisma.user.update({ where: { id: user.id }, data: { email: newEmail } });
  await logActivity({ userId: user.id, entityType: "User", entityId: user.id, action: "email_changed", summary: "Changed account email address" });
  revalidatePath("/settings");
  return { success: "Email address updated." };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Enter your current password." }),
    newPassword: z.string().min(8, { error: "New password must be at least 8 characters." }),
    confirmPassword: z.string().min(1, { error: "Confirm your new password." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "New password and confirmation don't match.",
    path: ["confirmPassword"],
  });

export async function changePassword(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { currentPassword, newPassword } = parsed.data;

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return { error: "Current password is incorrect." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } });
  await logActivity({ userId: user.id, entityType: "User", entityId: user.id, action: "password_changed", summary: "Changed account password" });
  revalidatePath("/settings");
  return { success: "Password updated." };
}
