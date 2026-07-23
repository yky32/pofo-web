/** ASCII email characters only (MVP — no IDN / non-Latin local parts). */
const EMAIL_CHARS = /[^a-zA-Z0-9._%+\-@]/g;

const EMAIL_SHAPE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function sanitizeEmailInput(value: string) {
  return value.replace(EMAIL_CHARS, "");
}

export function isValidEmail(email: string) {
  return EMAIL_SHAPE.test(email.trim());
}

export function emailFieldError(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email";
  if (!isValidEmail(trimmed)) return "Enter a valid email";
  return undefined;
}
