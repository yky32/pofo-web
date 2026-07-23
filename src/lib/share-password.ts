import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { cookies } from "next/headers";

const COOKIE_PREFIX = "pofo_g_";
const UNLOCK_TTL_SEC = 60 * 60 * 12; // 12h session after correct password

function gateSecret() {
  return (
    process.env.SHARE_GATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "pofo-dev-share-gate"
  );
}

/**
 * Human-copyable secret (Supabase DB-password style).
 * ~20 chars, mixed case + digits, no ambiguous 0/O/1/l.
 */
export function generateSharePassword(length = 20): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/** One-way password hash (scrypt + salt). Never put this in the URL. */
export function hashSharePassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password.normalize("NFKC"), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifySharePassword(
  password: string,
  stored: string | null | undefined
): boolean {
  if (!stored || !password) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  if (!salt || !hash) return false;
  try {
    const next = scryptSync(password.normalize("NFKC"), salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (expected.length !== next.length) return false;
    return timingSafeEqual(expected, next);
  } catch {
    return false;
  }
}

/** Fingerprint of current password_hash — changes on regenerate. */
export function passwordFingerprint(
  passwordHash: string | null | undefined
): string {
  if (!passwordHash) return "open";
  return createHash("sha256")
    .update(passwordHash)
    .digest("hex")
    .slice(0, 16);
}

function cookieNameForToken(token: string) {
  const dig = createHash("sha256").update(token).digest("hex").slice(0, 20);
  return `${COOKIE_PREFIX}${dig}`;
}

function signUnlock(token: string, fp: string, exp: number) {
  const payload = `${token}.${fp}.${exp}`;
  const sig = createHmac("sha256", gateSecret())
    .update(payload)
    .digest("base64url");
  return `${fp}.${exp}.${sig}`;
}

function verifyUnlockCookie(
  token: string,
  fp: string,
  value: string | undefined
): boolean {
  if (!value) return false;
  const parts = value.split(".");
  // v2: fp.exp.sig
  if (parts.length === 3) {
    const [cookieFp, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!cookieFp || !expStr || !sig || !Number.isFinite(exp)) return false;
    if (cookieFp !== fp) return false; // password was regenerated
    if (exp < Math.floor(Date.now() / 1000)) return false;
    const expected = signUnlock(token, fp, exp);
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
  // legacy v1: exp.sig (no fp) — reject so clients re-auth after deploy
  return false;
}

/** After password OK — httpOnly cookie bound to current password fingerprint. */
export async function setShareUnlockCookie(
  token: string,
  passwordHash: string | null | undefined
) {
  const fp = passwordFingerprint(passwordHash);
  const exp = Math.floor(Date.now() / 1000) + UNLOCK_TTL_SEC;
  const jar = await cookies();
  jar.set(cookieNameForToken(token), signUnlock(token, fp, exp), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_TTL_SEC,
  });
}

export async function clearShareUnlockCookie(token: string) {
  const jar = await cookies();
  jar.delete(cookieNameForToken(token));
}

export async function hasShareUnlock(
  token: string,
  passwordHash: string | null | undefined
): Promise<boolean> {
  const jar = await cookies();
  const value = jar.get(cookieNameForToken(token))?.value;
  return verifyUnlockCookie(token, passwordFingerprint(passwordHash), value);
}
