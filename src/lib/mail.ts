/**
 * Outbound email via Resend (optional).
 * If RESEND_API_KEY is unset, callers should fall back to mailto:.
 */

export function isResendConfigured() {
  const key = process.env.RESEND_API_KEY;
  return Boolean(key && key !== "your-resend-api-key" && key.length > 10);
}

export function mailFromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.MAIL_FROM ||
    "Pofo <onboarding@resend.dev>"
  );
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isResendConfigured()) {
    return { ok: false, error: "email_not_configured" };
  }

  const key = process.env.RESEND_API_KEY!;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend error", res.status, body);
      return { ok: false, error: "send_failed" };
    }
    return { ok: true };
  } catch (e) {
    console.error("Resend exception", e);
    return { ok: false, error: "send_failed" };
  }
}

export function clientShareEmailContent(input: {
  studioName: string;
  projectTitle: string;
  galleryUrl: string;
  password?: string | null;
  expiresLabel?: string | null;
}) {
  const studio = input.studioName || "Your photographer";
  const lines = [
    `Hi,`,
    ``,
    `${studio} shared a private gallery with you on Pofo:`,
    ``,
    `${input.projectTitle}`,
    input.galleryUrl,
  ];
  if (input.password) {
    lines.push(``, `Password: ${input.password}`);
  }
  if (input.expiresLabel) {
    lines.push(``, `Link expires: ${input.expiresLabel}`);
  }
  lines.push(``, `— Pofo`);

  const text = lines.join("\n");
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#292524">
      <p>Hi,</p>
      <p><strong>${escapeHtml(studio)}</strong> shared a private gallery with you:</p>
      <p style="font-size:18px;margin:16px 0 8px">${escapeHtml(input.projectTitle)}</p>
      <p><a href="${escapeAttr(input.galleryUrl)}" style="color:#0c0a09">${escapeHtml(input.galleryUrl)}</a></p>
      ${
        input.password
          ? `<p style="margin-top:16px">Password: <code style="background:#f5f5f4;padding:2px 6px;border-radius:4px">${escapeHtml(input.password)}</code></p>`
          : ""
      }
      ${
        input.expiresLabel
          ? `<p style="color:#78716c;font-size:13px">Link expires: ${escapeHtml(input.expiresLabel)}</p>`
          : ""
      }
      <p style="margin-top:24px;color:#a8a29e;font-size:12px">— Pofo</p>
    </div>
  `.trim();

  return {
    subject: `${studio} shared “${input.projectTitle}” with you`,
    text,
    html,
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
