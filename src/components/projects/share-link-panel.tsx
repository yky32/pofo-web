"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Link2, XCircle } from "lucide-react";
import {
  createShareLink,
  revokeShareLink,
  type ShareActionState,
} from "@/actions/share";
import { Button } from "@/components/ui/button";
import type { ShareLink } from "@/types/database";
import { cn } from "@/lib/utils";

const initial: ShareActionState = {};

export function ShareLinkPanel({
  projectId,
  links,
  appUrl,
  hasPhotos,
  compact = false,
}: {
  projectId: string;
  links: ShareLink[];
  appUrl: string;
  hasPhotos: boolean;
  /** Tighter layout for sidebar / toolbar */
  compact?: boolean;
}) {
  const [createState, createAction, createPending] = useActionState(
    createShareLink,
    initial
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeShareLink,
    initial
  );
  const [copied, setCopied] = useState<string | null>(null);
  const [expiresDays, setExpiresDays] = useState("30");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const active = links.filter((l) => l.is_active);
  const latestToken = createState.token ?? active[0]?.token;
  const visible = showAll ? active : active.slice(0, 2);
  const hiddenCount = Math.max(0, active.length - visible.length);

  async function copyToken(token: string) {
    const url = `${appUrl}/g/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div
      className={cn(
        "rounded-[8px] border border-stone-200/80 bg-white/70 p-3.5",
        compact ? "space-y-3" : "space-y-3"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-400">
          Client link
        </p>
        {active.length > 0 ? (
          <span className="text-[11px] text-emerald-700">
            {active.length} active
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-stone-500">
          <span className="sr-only">Expires</span>
          <select
            value={expiresDays}
            onChange={(e) => setExpiresDays(e.target.value)}
            className="h-8 rounded-full border border-stone-200 bg-white px-2.5 text-xs text-stone-800 outline-none focus:border-stone-400"
            disabled={!hasPhotos || createPending}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="0">Never</option>
          </select>
        </label>
        <form action={createAction}>
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="expires_days" value={expiresDays} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={!hasPhotos || createPending}
            className="rounded-full border-stone-300"
            title={
              hasPhotos
                ? "Create a private client link"
                : "Add photos before sharing"
            }
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            {createPending ? "Creating…" : "New link"}
          </Button>
        </form>
        {latestToken ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => copyToken(latestToken)}
            >
              {copied === latestToken ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied === latestToken ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" className="rounded-full" asChild>
              <Link href={`/g/${latestToken}`} target="_blank">
                Open
              </Link>
            </Button>
          </>
        ) : null}
      </div>

      {!hasPhotos ? (
        <p className="text-xs text-stone-500">
          Add photos first, then create a client link.
        </p>
      ) : null}

      {createState.error ? (
        <p className="text-xs text-rose-600/90">{createState.error}</p>
      ) : null}
      {createState.success && createState.token ? (
        <p className="truncate text-xs text-emerald-700">
          Link ready — use Copy above.
        </p>
      ) : null}
      {revokeState.error ? (
        <p className="text-xs text-rose-600/90">{revokeState.error}</p>
      ) : null}

      {active.length > 0 ? (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
          {visible.map((link) => {
            const url = `${appUrl}/g/${link.token}`;
            const exp = link.expires_at
              ? new Date(link.expires_at).toLocaleDateString()
              : "No expiry";
            return (
              <li
                key={link.id}
                className="flex items-center gap-2 rounded-[6px] bg-stone-50/90 px-2.5 py-1.5 ring-1 ring-stone-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] text-stone-600">
                    …/{link.token.slice(0, 12)}
                  </p>
                  <p className="text-[10px] text-stone-400">{exp}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 rounded-full p-0"
                  onClick={() => copyToken(link.token)}
                  title={url}
                >
                  {copied === link.token ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <form action={revokeAction} className="shrink-0">
                  <input type="hidden" name="link_id" value={link.id} />
                  <input type="hidden" name="project_id" value={projectId} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    disabled={revokePending}
                    className="h-7 w-7 rounded-full p-0 text-stone-400 hover:text-rose-700"
                    title="Revoke link"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : hasPhotos ? (
        <p className="text-xs text-stone-400">No active links yet.</p>
      ) : null}

      {hiddenCount > 0 || (showAll && active.length > 2) ? (
        <button
          type="button"
          className="text-[11px] font-medium text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show fewer" : `Show ${hiddenCount} more`}
        </button>
      ) : null}
    </div>
  );
}
