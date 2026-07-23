"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { unlockShareLink } from "@/actions/share";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Clean password unlock for protected client links.
 * Highlights who shared the gallery (studio), then a simple form.
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

  const fromLabel =
    studioName?.trim() ||
    displayName?.trim() ||
    "Your photographer";

  const initial = fromLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "P";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div className="relative flex min-h-screen flex-col bg-[oklch(0.12_0.01_50)] text-stone-100">
      {/* Soft ambient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,oklch(0.32_0.02_60/0.5),transparent_70%)]"
      />

      <header className="relative z-10 flex items-center justify-center px-6 pt-10 sm:pt-14">
        <Logo className="text-white/90" markClassName="text-white/90" />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-8">
        {/* From · studio */}
        <div className="mb-8 flex flex-col items-center text-center">
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

        {/* Card */}
        <div
          className={cn(
            "w-full max-w-[22rem] rounded-2xl p-6 sm:p-7",
            "bg-white/[0.07] ring-1 ring-white/10",
            "backdrop-blur-xl"
          )}
        >
          <p className="text-center text-sm text-stone-400">
            Enter the password to open this gallery
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <Input
              id="share-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Gallery password"
              className={cn(
                "h-11 rounded-xl border-0 bg-white/95 text-center text-stone-900",
                "placeholder:text-stone-400",
                "focus-visible:ring-2 focus-visible:ring-white/40"
              )}
              disabled={pending}
            />

            {error ? (
              <p className="rounded-xl bg-rose-500/15 px-3 py-2.5 text-center text-xs leading-relaxed text-rose-200 ring-1 ring-rose-400/20">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending || !password.trim()}
              className="h-11 w-full rounded-full bg-white text-stone-900 hover:bg-stone-100"
            >
              {pending ? "Opening…" : "Open gallery"}
            </Button>
          </form>
        </div>

        <p className="mt-8 max-w-[18rem] text-center text-[11px] leading-relaxed text-stone-600">
          The password was shared separately by your photographer.
        </p>
      </main>
    </div>
  );
}
