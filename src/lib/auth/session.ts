/**
 * Session helpers para o cookie de dev-login.
 * Cookie: `cgeo_dev_session` (HttpOnly, assinado com HMAC-SHA256).
 *
 * Formato do payload: base64url(JSON) + "." + base64url(signature)
 *
 * ⚠️ Só é usado enquanto Google OAuth não está configurado. Ver test-users.ts.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { findTestUser, type TestUser } from "./test-users";

export const SESSION_COOKIE = "cgeo_dev_session";
const SESSION_TTL_HOURS = 12;

interface SessionPayload {
  userId: string;
  iat: number; // segundos
  exp: number; // segundos
}

function b64urlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function b64urlDecode(input: string): Buffer {
  const pad = 4 - (input.length % 4);
  const padded = input + (pad < 4 ? "=".repeat(pad) : "");
  return Buffer.from(
    padded.replaceAll("-", "+").replaceAll("_", "/"),
    "base64",
  );
}

function getSecret(): string {
  const secret = process.env.CGEO_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    // Fallback previsível apenas em dev — força o usuário a definir no .env.local
    return "cgeo-plus-dev-secret-please-change-me-in-production";
  }
  return secret;
}

function sign(payload: string): string {
  return b64urlEncode(
    createHmac("sha256", getSecret()).update(payload).digest(),
  );
}

export function createSessionCookie(user: TestUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId: user.id,
    iat: now,
    exp: now + SESSION_TTL_HOURS * 3600,
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifySessionCookie(token: string): TestUser | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expected = sign(payloadB64);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString());
  } catch {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return findTestUser(payload.userId) ?? null;
}

/** Server Components / Server Actions — pega o usuário atual. */
export async function getCurrentTestUser(): Promise<TestUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionCookie(token);
}
