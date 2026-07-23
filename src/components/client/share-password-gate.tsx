"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { unlockShareLink } from "@/actions/share";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Liquid-glass password gate for protected client links.
 * Matches create-project dialog feel.
 */
export function SharePasswordGate({
  token,
  projectTitle,
  studioName,
}: {
  token: string;
  projectTitle?: string | null;
  studioName?: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[oklch(0.14_0.01_50)] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,oklch(0.45_0.04_75/0.35),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,oklch(0.35_0.03_40/0.4),transparent_70%)] blur-3xl"
      />

      <div className="relative z-10 mb-8">
        <Logo className="text-white" markClassName="text-white" />
      </div>

      <div
        className={cn(
          "dialog-glass-panel relative z-10 w-full max-w-md rounded-[12px] p-6 sm:p-7",
          "text-stone-900 ring-1 ring-white/50"
        )}
      >
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900/5 text-stone-700">
            <Lock className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
              Private gallery
            </p>
            <h1 className="mt-1 font-heading text-2xl font-medium tracking-tight text-stone-900">
              Enter password
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {projectTitle
                ? `“${projectTitle}” is password protected.`
                : "This link is password protected."}
              {studioName ? (
                <span className="block text-stone-400">
                  Shared by {studioName}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-password" className="text-stone-600">
              Password
            </Label>
            <Input
              id="share-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password from your photographer"
              className="rounded-xl bg-white/80"
              disabled={pending}
            />
          </div>

          {error ? (
            <p className="rounded-[8px] bg-rose-50/90 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-100">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={pending || !password.trim()}
            className="w-full rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
          >
            {pending ? "Checking…" : "Open gallery"}
          </Button>
        </form>
      </div>

      <p className="relative z-10 mt-8 max-w-sm text-center text-xs text-stone-500">
        Ask your photographer if you don’t have the password.
      </p>
    </div>
  );
}
