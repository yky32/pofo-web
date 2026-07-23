"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Copy, ExternalLink, Link2, XCircle } from "lucide-react";
import {
  createShareLink,
  revokeShareLink,
  type ShareActionState,
} from "@/actions/share";
import { Button } from "@/components/ui/button";
import type { ShareLinkPublic } from "@/actions/share";
import { cn } from "@/lib/utils";

const initial: ShareActionState = {};

/**
 * Client-link control: icon trigger (avatar-menu style).
 * Panel only mounts when open — full width stays free for the photo grid.
 */
export function ShareLinkPanel({
  projectId,
  links,
  appUrl,
  hasPhotos,
}: {
  projectId: string;
  links: ShareLinkPublic[];
  appUrl: string;
  hasPhotos: boolean;
  /** @deprecated unused — always menu */
  compact?: boolean;
}) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

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
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const active = links.filter((l) => l.is_active);
  const latestToken = createState.token ?? active[0]?.token;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!open) return;

    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 8,
        right: Math.max(8, window.innerWidth - r.right),
      });
    }

    place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

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
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label="Client share links"
        title="Client links"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200/90 bg-white text-stone-700 shadow-sm transition",
          "hover:bg-stone-50 hover:text-stone-950",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
          open && "ring-2 ring-stone-300"
        )}
      >
        <Link2 className="h-4 w-4" strokeWidth={1.75} />
        {active.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-medium text-white">
            {active.length > 9 ? "9+" : active.length}
          </span>
        ) : null}
      </button>

      {mounted && open && pos
        ? createPortal(
            <>
              <div
                className="dialog-glass-overlay fixed inset-0 z-[200]"
                aria-hidden
                onClick={() => setOpen(false)}
              />
              <div
                ref={panelRef}
                id={menuId}
                role="menu"
                aria-label="Client share links"
                style={{ top: pos.top, right: pos.right }}
                className={cn(
                  "dialog-glass-panel fixed z-[201] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl",
                  "animate-in fade-in-0 zoom-in-95 duration-150"
                )}
              >
                <div className="border-b border-stone-900/5 px-3 py-2.5">
                  <p className="text-xs font-medium text-stone-900">
                    Client links
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Private gallery access for your client
                  </p>
                </div>

                <div className="space-y-3 p-3">
                  <form action={createAction} className="space-y-2.5">
                    <input type="hidden" name="project_id" value={projectId} />
                    <input
                      type="hidden"
                      name="expires_days"
                      value={expiresDays}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={expiresDays}
                        onChange={(e) => setExpiresDays(e.target.value)}
                        className="h-8 rounded-full border border-stone-200 bg-white px-2.5 text-xs text-stone-800 outline-none focus:border-stone-400"
                        disabled={!hasPhotos || createPending}
                        aria-label="Link expiry"
                      >
                        <option value="7">7 days</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="0">Never</option>
                      </select>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!hasPhotos || createPending}
                        className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
                        title={
                          hasPhotos
                            ? "Create a private client link"
                            : "Add photos before sharing"
                        }
                      >
                        <Link2 className="mr-1.5 h-3.5 w-3.5" />
                        {createPending ? "Creating…" : "New link"}
                      </Button>
                    </div>
                    <div className="space-y-1.5 rounded-lg bg-stone-50/80 p-2 ring-1 ring-stone-100">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-stone-400">
                        Optional password
                      </p>
                      <input
                        type="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password for client"
                        autoComplete="new-password"
                        disabled={!hasPhotos || createPending}
                        className="h-8 w-full rounded-lg border border-stone-200 bg-white px-2.5 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-400"
                      />
                      <input
                        type="password"
                        name="password_confirm"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        disabled={!hasPhotos || createPending}
                        className="h-8 w-full rounded-lg border border-stone-200 bg-white px-2.5 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-400"
                      />
                      <p className="text-[10px] leading-snug text-stone-400">
                        Leave blank for open link. Share the password separately
                        from the URL.
                      </p>
                    </div>
                  </form>

                  {!hasPhotos ? (
                    <p className="text-xs text-stone-500">
                      Add photos first, then create a client link.
                    </p>
                  ) : null}

                  {createState.error ? (
                    <p className="text-xs text-rose-600/90">
                      {createState.error}
                    </p>
                  ) : null}
                  {createState.success && createState.token ? (
                    <p className="text-xs text-emerald-700">Link ready.</p>
                  ) : null}
                  {revokeState.error ? (
                    <p className="text-xs text-rose-600/90">
                      {revokeState.error}
                    </p>
                  ) : null}

                  {latestToken ? (
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="flex-1 rounded-full"
                        onClick={() => copyToken(latestToken)}
                      >
                        {copied === latestToken ? (
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {copied === latestToken ? "Copied" : "Copy latest"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        asChild
                      >
                        <Link
                          href={`/g/${latestToken}`}
                          target="_blank"
                          onClick={() => setOpen(false)}
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Open
                        </Link>
                      </Button>
                    </div>
                  ) : null}

                  {active.length > 0 ? (
                    <ul className="max-h-48 space-y-1 overflow-y-auto overscroll-contain">
                      {active.map((link) => {
                        const exp = link.expires_at
                          ? new Date(link.expires_at).toLocaleDateString()
                          : "No expiry";
                        return (
                          <li
                            key={link.id}
                            className="flex items-center gap-1.5 rounded-lg bg-stone-50/90 px-2 py-1.5 ring-1 ring-stone-100"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-[11px] text-stone-600">
                                …/{link.token.slice(0, 14)}
                              </p>
                              <p className="text-[10px] text-stone-400">
                                {exp}
                                {link.password_protected ? " · locked" : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-200/60 hover:text-stone-800"
                              onClick={() => copyToken(link.token)}
                              title="Copy link"
                            >
                              {copied === link.token ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <form action={revokeAction} className="shrink-0">
                              <input
                                type="hidden"
                                name="link_id"
                                value={link.id}
                              />
                              <input
                                type="hidden"
                                name="project_id"
                                value={projectId}
                              />
                              <button
                                type="submit"
                                disabled={revokePending}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                                title="Revoke link"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  ) : hasPhotos ? (
                    <p className="text-xs text-stone-400">
                      No active links yet.
                    </p>
                  ) : null}
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
