"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  linkApple,
  linkGoogle,
  unlinkOAuthProvider,
} from "@/actions/auth";
import {
  providerLabel,
  type LinkedIdentity,
} from "@/lib/auth-identities";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function LinkedProvidersCard({
  identities,
  justLinked,
}: {
  identities: LinkedIdentity[];
  justLinked?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    justLinked ? "Provider linked to this account." : null
  );

  const hasGoogle = identities.some((i) => i.provider === "google");
  const hasApple = identities.some((i) => i.provider === "apple");
  const canUnlink = identities.length > 1;

  function originFd() {
    const fd = new FormData();
    if (typeof window !== "undefined") {
      fd.set("origin", window.location.origin);
    }
    return fd;
  }

  function link(provider: "google" | "apple") {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result =
        provider === "google"
          ? await linkGoogle(originFd())
          : await linkApple(originFd());
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  function unlink(identityId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("identity_id", identityId);
      const result = await unlinkOAuthProvider(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.success ?? "Unlinked.");
      router.refresh();
    });
  }

  return (
    <div className="paper space-y-4 rounded-[5px] p-6">
      <div>
        <h2 className="font-heading text-xl font-medium text-stone-900">
          Sign-in methods
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          One studio account can use email, Google, and Apple (same person).
        </p>
      </div>

      <ul className="space-y-2">
        {identities.map((identity) => (
          <li
            key={identity.id}
            className="flex items-center justify-between gap-3 rounded-[5px] border border-stone-100 bg-stone-50/80 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white"
                )}
              >
                {identity.provider === "google" ? (
                  <GoogleMark className="h-4 w-4" />
                ) : identity.provider === "apple" ? (
                  <AppleMark className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-medium text-stone-500">@</span>
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800">
                  {providerLabel(identity.provider)}
                </p>
                {identity.email ? (
                  <p className="truncate text-xs text-stone-400">
                    {identity.email}
                  </p>
                ) : null}
              </div>
            </div>
            {canUnlink && identity.provider !== "email" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                className="shrink-0 text-stone-500 hover:text-red-700"
                onClick={() => unlink(identity.id)}
              >
                Unlink
              </Button>
            ) : (
              <span className="shrink-0 text-xs text-stone-400">Linked</span>
            )}
          </li>
        ))}
        {identities.length === 0 ? (
          <li className="text-sm text-stone-500">No methods found.</li>
        ) : null}
      </ul>

      <div className="flex flex-wrap gap-2 pt-1">
        {!hasGoogle ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            className="rounded-full border-stone-300"
            onClick={() => link("google")}
          >
            <GoogleMark className="mr-2 h-4 w-4" />
            Link Google
          </Button>
        ) : null}
        {!hasApple ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            className="rounded-full border-stone-300"
            onClick={() => link("apple")}
          >
            <AppleMark className="mr-2 h-4 w-4" />
            Link Apple
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-red-600/90" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
