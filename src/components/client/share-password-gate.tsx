"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Unlock } from "lucide-react";
import { unlockShareLink } from "@/actions/share";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Clean password unlock for protected client links.
 * Password field + unlock icon when ready (no bulky full-width CTA).
 */
export function SharePasswordGate({
  token,
  projectTitle,
  studioName,
  clientName,
  displayName,
  avatarUrl,
}: {
  token: string;
  projectTitle?: string | null;
  studioName?: string | null;
  clientName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ready = password.trim().length > 0;

  const fromLabel =
    studioName?.trim() ||
    displayName?.trim() ||
    "Your photographer";

  const initial =
    fromLabel
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "P";

  function submit() {
    if (!ready || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await unlockShareLink(token, password);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[oklch(0.12_0.01_50)] text-stone-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,oklch(0.32_0.02_60/0.5),transparent_70%)]"
      />

      <header className="relative z-10 flex items-center justify-center px-6 pt-10 sm:pt-14">
        <Logo className="text-white/90" markClassName="text-white/90" />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-8">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white/15"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 font-heading text-lg text-white/90 ring-1 ring-white/15">
                {initial}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 ring-2 ring-[oklch(0.12_0.01_50)]">
              <Lock className="h-3 w-3 text-stone-300" strokeWidth={2} />
            </span>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">
            Shared with you
          </p>
          <p className="mt-2 font-heading text-xl font-medium tracking-tight text-white sm:text-2xl">
            {fromLabel}
          </p>
          {projectTitle ? (
            <p className="mt-1.5 max-w-xs text-sm text-stone-400">
              {projectTitle}
              {clientName ? (
                <span className="text-stone-500"> · {clientName}</span>
              ) : null}
            </p>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="w-full max-w-[20rem] space-y-3">
          <p className="text-center text-sm text-stone-500">
            Enter password to unlock
          </p>

          {/* Input + unlock affordance */}
          <div
            className={cn(
              "flex items-center gap-1 rounded-2xl bg-white/95 p-1.5 pl-4 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)]",
              "ring-1 ring-white/20 transition",
              ready && "ring-white/40"
            )}
          >
            <input
              id="share-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Password"
              aria-label="Gallery password"
              disabled={pending}
              className={cn(
                "min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-stone-900 outline-none",
                "placeholder:text-stone-400 disabled:opacity-60"
              )}
            />

            <button
              type="submit"
              disabled={!ready || pending}
              aria-label={pending ? "Unlocking" : "Unlock gallery"}
              title={ready ? "Unlock" : "Enter password"}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                ready
                  ? "bg-stone-900 text-white opacity-100 hover:bg-stone-800"
                  : "bg-transparent text-stone-300 opacity-0 pointer-events-none",
                pending && "opacity-100 pointer-events-none"
              )}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Unlock className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          </div>

          {error ? (
            <p className="px-1 text-center text-xs leading-relaxed text-rose-300/95">
              {error}
            </p>
          ) : (
            <p className="px-1 text-center text-[11px] text-stone-600">
              Password was shared separately by your photographer
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
