"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSessionCookie, SESSION_COOKIE } from "@/lib/auth/session";
import { findTestUser } from "@/lib/auth/test-users";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function loginAsTestUserAction(
  userId: string,
): Promise<ActionResult<{ nome: string; papel: string }>> {
  const user = findTestUser(userId);
  if (!user) return { ok: false, error: "Usuário de teste inválido." };

  const token = createSessionCookie(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600,
  });

  return { ok: true, data: { nome: user.nome, papel: user.papel } };
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/dev-login");
}
