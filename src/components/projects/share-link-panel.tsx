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

const initial: ShareActionState = {};

export function ShareLinkPanel({
  projectId,
  links,
  appUrl,
  hasPhotos,
}: {
  projectId: string;
  links: ShareLink[];
  appUrl: string;
  hasPhotos: boolean;
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

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const active = links.filter((l) => l.is_active);
  const latestToken = createState.token ?? active[0]?.token;

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-stone-500">
          Expires
          <select
            value={expiresDays}
            onChange={(e) => setExpiresDays(e.target.value)}
            className="h-8 rounded-full border border-stone-200 bg-white px-3 text-xs text-stone-800 outline-none focus:border-stone-400"
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
            <Link2 className="mr-2 h-4 w-4" />
            {createPending ? "Creating…" : "Create share link"}
          </Button>
        </form>
        {latestToken ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={() => copyToken(latestToken)}
          >
            {copied === latestToken ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied === latestToken ? "Copied" : "Copy link"}
          </Button>
        ) : null}
        {latestToken ? (
          <Button size="sm" className="rounded-full" asChild>
            <Link href={`/g/${latestToken}`} target="_blank">
              Open client view
            </Link>
          </Button>
        ) : null}
      </div>

      {!hasPhotos ? (
        <p className="text-xs text-stone-500">
          Upload or add sample photos first, then create a client link.
        </p>
      ) : null}

      {createState.error ? (
        <p className="text-xs text-red-600/90">{createState.error}</p>
      ) : null}
      {createState.success && createState.token ? (
        <p className="text-xs text-emerald-700">
          Link ready: {appUrl}/g/{createState.token}
        </p>
      ) : null}
      {revokeState.error ? (
        <p className="text-xs text-red-600/90">{revokeState.error}</p>
      ) : null}

      {active.length > 0 ? (
        <ul className="space-y-2">
          {active.map((link) => {
            const url = `${appUrl}/g/${link.token}`;
            const exp = link.expires_at
              ? new Date(link.expires_at).toLocaleDateString()
              : "No expiry";
            return (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[5px] bg-stone-50/80 px-3 py-2 text-sm ring-1 ring-stone-100"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-stone-600">
                    {url}
                  </p>
                  <p className="text-xs text-stone-400">
                    {exp} · created{" "}
                    {new Date(link.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => copyToken(link.token)}
                  >
                    {copied === link.token ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <form action={revokeAction}>
                    <input type="hidden" name="link_id" value={link.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={revokePending}
                      className="rounded-full text-stone-500 hover:text-red-700"
                      title="Revoke link"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-stone-400">No active share links yet.</p>
      )}
    </div>
  );
}
