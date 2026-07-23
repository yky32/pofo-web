import { randomBytes } from "crypto";

/** Unguessable share token (URL-safe). */
export function createShareToken(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}
