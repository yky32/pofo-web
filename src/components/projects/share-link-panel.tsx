"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Lock,
  Mail,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  createShareLink,
  emailClientShare,
  regenerateSharePassword,
  revokeShareLink,
  type ShareActionState,
  type ShareLinkPublic,
} from "@/actions/share";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initial: ShareActionState = {};

/**
 * Client-link control: icon trigger (avatar-menu style).
 * After create / regenerate password → one-time secret reveal (Supabase-style).
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
  /** Fixed position — flip above trigger when not enough room below */
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight: number;
  } | null>(null);

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
  const [passwordOn, setPasswordOn] = useState(false);
  const [password, setPassword] = useState("");
  const [originalsOn, setOriginalsOn] = useState(false);
  const [originalDays, setOriginalDays] = useState("14");
  /** One-time secret reveal after create or regenerate */
  const [secretReveal, setSecretReveal] = useState<{
    token: string;
    password?: string;
    mode: "created" | "regenerated";
  } | null>(null);
  const [showPassword, setShowPassword] = useState(true);
  /** Which locked link is being reset (shows set-password field) */
  const [resetLinkId, setResetLinkId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPending, setResetPending] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  /** Email compose for a specific link */
  const [emailLinkId, setEmailLinkId] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const lastHandledToken = useRef<string | null>(null);

  const active = links.filter((l) => l.is_active);
  const latestToken =
    secretReveal?.token ?? createState.token ?? active[0]?.token;

  useEffect(() => setMounted(true), []);

  // Capture one-time password from create action
  useEffect(() => {
    if (!createState.success || !createState.token) return;
    if (lastHandledToken.current === `c:${createState.token}`) return;
    lastHandledToken.current = `c:${createState.token}`;
    setSecretReveal({
      token: createState.token,
      password: createState.plain_password,
      mode: "created",
    });
    setPassword("");
    setPasswordOn(false);
    setShowPassword(true);
    setRegenError(null);
    if (createState.plain_password) {
      void copyText("secret-pw", createState.plain_password);
    }
  }, [createState.success, createState.token, createState.plain_password]);

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
      const gap = 8;
      const margin = 8;
      const right = Math.max(margin, window.innerWidth - r.right);
      const spaceBelow = window.innerHeight - r.bottom - gap - margin;
      const spaceAbove = r.top - gap - margin;
      // Prefer below unless it would be cramped vs above
      const openBelow =
        spaceBelow >= 280 || spaceBelow >= spaceAbove || spaceAbove < 160;

      if (openBelow) {
        setPos({
          top: r.bottom + gap,
          bottom: undefined,
          right,
          maxHeight: Math.max(180, Math.min(spaceBelow, window.innerHeight * 0.85)),
        });
      } else {
        setPos({
          top: undefined,
          bottom: window.innerHeight - r.top + gap,
          right,
          maxHeight: Math.max(180, Math.min(spaceAbove, window.innerHeight * 0.85)),
        });
      }
    }

    place();
    // After portal paints, remeasure (panel may flip when content grows)
    const raf = requestAnimationFrame(() => {
      place();
      requestAnimationFrame(place);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, passwordOn, originalsOn, secretReveal, active.length, emailLinkId, resetLinkId]);

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

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  }

  function copyToken(token: string) {
    return copyText(token, `${appUrl}/g/${token}`);
  }

  function dismissSecret() {
    setSecretReveal(null);
    setShowPassword(false);
  }

  function openResetPassword(linkId: string) {
    setSecretReveal(null);
    setRegenError(null);
    setResetPassword("");
    setResetLinkId((cur) => (cur === linkId ? null : linkId));
  }

  async function onSubmitResetPassword(linkId: string) {
    const plain = resetPassword.trim();
    if (plain.length < 4) {
      setRegenError("Password must be at least 4 characters.");
      return;
    }
    setRegenError(null);
    setResetPending(true);
    try {
      const res = await regenerateSharePassword({
        projectId,
        linkId,
        password: plain,
      });
      if (res.error || !res.token || !res.plain_password) {
        setRegenError(res.error ?? "Could not update password.");
        return;
      }
      lastHandledToken.current = `r:${res.token}:${Date.now()}`;
      setResetLinkId(null);
      setResetPassword("");
      setSecretReveal({
        token: res.token,
        password: res.plain_password,
        mode: "regenerated",
      });
      setShowPassword(true);
      await copyText("secret-pw", res.plain_password);
    } finally {
      setResetPending(false);
    }
  }

  function openEmail(linkId: string) {
    setEmailErr(null);
    setEmailMsg(null);
    setEmailLinkId((cur) => (cur === linkId ? null : linkId));
  }

  async function onSendEmail(linkId: string) {
    setEmailErr(null);
    setEmailMsg(null);
    setEmailPending(true);
    try {
      const res = await emailClientShare({
        projectId,
        linkId,
        to: emailTo,
        // Include password only while one-time reveal is open for this link
        password:
          secretReveal?.password &&
          active.find((l) => l.id === linkId)?.token === secretReveal.token
            ? secretReveal.password
            : undefined,
      });
      if (res.error) {
        setEmailErr(res.error);
        return;
      }
      if (res.mailto) {
        window.location.href = res.mailto;
        setEmailMsg("Opened your mail app.");
      } else {
        setEmailMsg("Email sent.");
      }
      setEmailLinkId(null);
      setEmailTo("");
    } finally {
      setEmailPending(false);
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
                style={{
                  top: pos.top,
                  bottom: pos.bottom,
                  right: pos.right,
                  maxHeight: pos.maxHeight,
                }}
                className={cn(
                  "dialog-glass-panel fixed z-[201] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl",
                  "animate-in fade-in-0 zoom-in-95 duration-150"
                )}
              >
                <div className="shrink-0 border-b border-stone-900/5 px-3 py-2.5">
                  <p className="text-xs font-medium text-stone-900">
                    Client links
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Private gallery access for your client
                  </p>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
                  {/* Supabase-style one-time secret reveal */}
                  {secretReveal ? (
                    <div className="space-y-2.5 rounded-xl bg-stone-900 px-3 py-3 text-stone-50 shadow-inner">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-400/90">
                            {secretReveal.mode === "regenerated"
                              ? "New password"
                              : "Save these now"}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-stone-400">
                            {secretReveal.password
                              ? secretReveal.mode === "regenerated"
                                ? "Copied to clipboard. Shown once — old password no longer works."
                                : "Password is shown once. We only store a hash."
                              : "Copy the link for your client."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={dismissSecret}
                          className="shrink-0 text-[11px] text-stone-500 underline-offset-2 hover:text-stone-300 hover:underline"
                        >
                          Done
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-stone-500">
                          Gallery link
                        </p>
                        <div className="flex items-center gap-1 rounded-lg bg-stone-800/80 ring-1 ring-white/10">
                          <p className="min-w-0 flex-1 truncate px-2.5 py-2 font-mono text-[11px] text-stone-200">
                            {appUrl}/g/{secretReveal.token}
                          </p>
                          <button
                            type="button"
                            className="flex h-8 w-8 shrink-0 items-center justify-center text-stone-400 hover:text-white"
                            onClick={() => copyToken(secretReveal.token)}
                            title="Copy link"
                          >
                            {copied === secretReveal.token ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {secretReveal.password ? (
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-stone-500">
                            Password
                          </p>
                          <div className="flex items-center gap-0.5 rounded-lg bg-stone-800/80 ring-1 ring-amber-400/25">
                            <p className="min-w-0 flex-1 truncate px-2.5 py-2 font-mono text-[12px] tracking-wide text-amber-100">
                              {showPassword
                                ? secretReveal.password
                                : "•".repeat(
                                    Math.min(24, secretReveal.password.length)
                                  )}
                            </p>
                            <button
                              type="button"
                              className="flex h-8 w-8 shrink-0 items-center justify-center text-stone-400 hover:text-white"
                              onClick={() => setShowPassword((v) => !v)}
                              title={
                                showPassword ? "Hide password" : "Show password"
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="flex h-8 w-8 shrink-0 items-center justify-center text-stone-400 hover:text-white"
                              onClick={() =>
                                copyText(
                                  "secret-pw",
                                  secretReveal.password!
                                )
                              }
                              title="Copy password"
                            >
                              {copied === "secret-pw" ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {(() => {
                        const revealLink = active.find(
                          (l) => l.token === secretReveal.token
                        );
                        if (!revealLink) return null;
                        return (
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 py-2 text-[11px] font-medium text-stone-200 ring-1 ring-white/10 hover:bg-white/15"
                            onClick={() => {
                              setEmailLinkId(revealLink.id);
                              setEmailErr(null);
                              setEmailMsg(null);
                            }}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Email this link to client
                          </button>
                        );
                      })()}
                    </div>
                  ) : (
                    <form action={createAction} className="space-y-2.5">
                      <input
                        type="hidden"
                        name="project_id"
                        value={projectId}
                      />
                      <input
                        type="hidden"
                        name="expires_days"
                        value={expiresDays}
                      />
                      <input
                        type="hidden"
                        name="password_on"
                        value={passwordOn ? "1" : "0"}
                      />
                      <input
                        type="hidden"
                        name="originals_on"
                        value={originalsOn ? "1" : "0"}
                      />
                      <input
                        type="hidden"
                        name="original_days"
                        value={originalDays}
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
                          disabled={
                            !hasPhotos ||
                            createPending ||
                            (passwordOn && password.trim().length < 4)
                          }
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

                      {/* Password toggle — on = amber lock tint + field */}
                      <div
                        className={cn(
                          "rounded-xl ring-1 transition-colors duration-200",
                          passwordOn
                            ? "bg-amber-50/90 ring-amber-200/80"
                            : "bg-stone-50/90 ring-stone-100"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "text-xs font-medium transition-colors",
                                passwordOn ? "text-amber-950" : "text-stone-800"
                              )}
                            >
                              Password protect
                            </p>
                            <p
                              className={cn(
                                "text-[10px] transition-colors",
                                passwordOn ? "text-amber-800/70" : "text-stone-400"
                              )}
                            >
                              {passwordOn
                                ? "Client must enter password"
                                : "Anyone with the link can open"}
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={passwordOn}
                            disabled={!hasPhotos || createPending}
                            onClick={() => {
                              setPasswordOn((v) => {
                                if (v) setPassword("");
                                return !v;
                              });
                            }}
                            className={cn(
                              "relative h-6 w-11 shrink-0 rounded-full transition-all duration-200",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                              passwordOn
                                ? "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)] focus-visible:ring-amber-400"
                                : "bg-stone-200 focus-visible:ring-stone-300",
                              (!hasPhotos || createPending) && "opacity-50"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200",
                                passwordOn && "translate-x-5"
                              )}
                            >
                              {passwordOn ? (
                                <Lock
                                  className="h-2.5 w-2.5 text-amber-600"
                                  strokeWidth={2.5}
                                />
                              ) : null}
                            </span>
                          </button>
                        </div>
                        {passwordOn ? (
                          <div className="border-t border-amber-200/60 px-3 py-2.5">
                            <input
                              type="text"
                              name="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Password for client"
                              autoComplete="off"
                              spellCheck={false}
                              disabled={!hasPhotos || createPending}
                              className={cn(
                                "h-9 w-full rounded-lg border bg-white px-3 font-mono text-xs text-stone-800 outline-none",
                                "placeholder:font-sans placeholder:text-stone-400",
                                "border-amber-200/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/50"
                              )}
                            />
                            <p className="mt-1.5 text-[10px] leading-snug text-amber-800/55">
                              Shown once after create so you can copy it.
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {/* Original download window (P3) */}
                      <div
                        className={cn(
                          "rounded-xl ring-1 transition-colors duration-200",
                          originalsOn
                            ? "bg-emerald-50/90 ring-emerald-200/80"
                            : "bg-stone-50/90 ring-stone-100"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "text-xs font-medium transition-colors",
                                originalsOn
                                  ? "text-emerald-950"
                                  : "text-stone-800"
                              )}
                            >
                              Original download
                            </p>
                            <p
                              className={cn(
                                "text-[10px] transition-colors",
                                originalsOn
                                  ? "text-emerald-800/70"
                                  : "text-stone-400"
                              )}
                            >
                              {originalsOn
                                ? "Client can ZIP their proofed photos"
                                : "Proofing only — no full downloads"}
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={originalsOn}
                            disabled={!hasPhotos || createPending}
                            onClick={() => setOriginalsOn((v) => !v)}
                            className={cn(
                              "relative h-6 w-11 shrink-0 rounded-full transition-all duration-200",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                              originalsOn
                                ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)] focus-visible:ring-emerald-400"
                                : "bg-stone-200 focus-visible:ring-stone-300",
                              (!hasPhotos || createPending) && "opacity-50"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200",
                                originalsOn && "translate-x-5"
                              )}
                            />
                          </button>
                        </div>
                        {originalsOn ? (
                          <div className="border-t border-emerald-200/60 px-3 py-2.5">
                            <label className="flex items-center justify-between gap-2 text-[11px] text-emerald-900/80">
                              <span>Download window</span>
                              <select
                                value={originalDays}
                                onChange={(e) =>
                                  setOriginalDays(e.target.value)
                                }
                                className="h-8 rounded-full border border-emerald-200 bg-white px-2 text-xs text-stone-800 outline-none"
                                disabled={createPending}
                              >
                                <option value="7">7 days</option>
                                <option value="14">14 days</option>
                                <option value="30">30 days</option>
                              </select>
                            </label>
                          </div>
                        ) : null}
                      </div>
                    </form>
                  )}

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
                  {revokeState.error ? (
                    <p className="text-xs text-rose-600/90">
                      {revokeState.error}
                    </p>
                  ) : null}
                  {regenError ? (
                    <p className="text-xs text-rose-600/90">{regenError}</p>
                  ) : null}
                  {emailErr ? (
                    <p className="text-xs text-rose-600/90">{emailErr}</p>
                  ) : null}
                  {emailMsg ? (
                    <p className="text-xs text-emerald-700">{emailMsg}</p>
                  ) : null}

                  {!secretReveal && latestToken ? (
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
                    <ul className="space-y-1.5">
                      {active.map((link) => {
                        const exp = link.expires_at
                          ? new Date(link.expires_at).toLocaleDateString()
                          : "No expiry";
                        const resetting = resetLinkId === link.id;
                        const emailing = emailLinkId === link.id;
                        const views = link.view_count ?? 0;
                        const lastView = link.last_viewed_at
                          ? new Date(link.last_viewed_at).toLocaleDateString()
                          : null;
                        const lastEmail = link.last_email_to
                          ? `emailed ${link.last_email_to}`
                          : null;
                        return (
                          <li
                            key={link.id}
                            className="rounded-lg bg-stone-50/90 ring-1 ring-stone-100"
                          >
                            <div className="flex items-center gap-1.5 px-2 py-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-mono text-[11px] text-stone-600">
                                  …/{link.token.slice(0, 14)}
                                </p>
                                <p className="text-[10px] text-stone-400">
                                  {exp}
                                  {link.password_protected ? " · locked" : ""}
                                  {views > 0
                                    ? ` · ${views} view${views === 1 ? "" : "s"}`
                                    : ""}
                                  {lastView ? ` · last ${lastView}` : ""}
                                </p>
                                {lastEmail ? (
                                  <p className="truncate text-[10px] text-stone-400">
                                    {lastEmail}
                                  </p>
                                ) : null}
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
                              <button
                                type="button"
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-50",
                                  emailing && "bg-sky-50 text-sky-800"
                                )}
                                disabled={emailPending || revokePending}
                                onClick={() => openEmail(link.id)}
                                title="Email client"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </button>
                              {link.password_protected ? (
                                <button
                                  type="button"
                                  className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50",
                                    resetting && "bg-amber-50 text-amber-800"
                                  )}
                                  disabled={resetPending || revokePending}
                                  onClick={() => openResetPassword(link.id)}
                                  title="Set new password"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
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
                            </div>

                            {emailing ? (
                              <div className="border-t border-stone-100 px-2.5 py-2.5">
                                <p className="mb-1.5 text-[10px] font-medium text-stone-500">
                                  Email client
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="email"
                                    value={emailTo}
                                    onChange={(e) => setEmailTo(e.target.value)}
                                    placeholder="client@email.com"
                                    autoComplete="email"
                                    autoFocus
                                    disabled={emailPending}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void onSendEmail(link.id);
                                      }
                                    }}
                                    className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-400"
                                  />
                                  <button
                                    type="button"
                                    disabled={
                                      emailPending || !emailTo.includes("@")
                                    }
                                    aria-label="Send email"
                                    title="Send email"
                                    className={cn(
                                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
                                      "bg-stone-900 text-white hover:bg-stone-800",
                                      "disabled:pointer-events-none disabled:opacity-40"
                                    )}
                                    onClick={() => void onSendEmail(link.id)}
                                  >
                                    {emailPending ? (
                                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Mail className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                                <p className="mt-1.5 text-[10px] leading-snug text-stone-400">
                                  {secretReveal?.password &&
                                  secretReveal.token === link.token
                                    ? "Includes password from the reveal above."
                                    : "Sends the gallery link (password only if still on screen)."}
                                </p>
                              </div>
                            ) : null}

                            {/* Same set-password UI as create (toggle on) */}
                            {resetting ? (
                              <div className="border-t border-stone-100 px-2.5 py-2.5">
                                <p className="mb-1.5 text-[10px] font-medium text-stone-500">
                                  Set new password
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={resetPassword}
                                    onChange={(e) =>
                                      setResetPassword(e.target.value)
                                    }
                                    placeholder="Password for client"
                                    autoComplete="off"
                                    spellCheck={false}
                                    autoFocus
                                    disabled={resetPending}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void onSubmitResetPassword(link.id);
                                      }
                                    }}
                                    className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 font-mono text-xs text-stone-800 outline-none placeholder:font-sans placeholder:text-stone-400 focus:border-stone-400"
                                  />
                                  <button
                                    type="button"
                                    disabled={
                                      resetPending ||
                                      resetPassword.trim().length < 4
                                    }
                                    aria-label="Set new password"
                                    title="Set new password"
                                    className={cn(
                                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
                                      "bg-stone-900 text-white hover:bg-stone-800",
                                      "disabled:pointer-events-none disabled:opacity-40"
                                    )}
                                    onClick={() =>
                                      void onSubmitResetPassword(link.id)
                                    }
                                  >
                                    {resetPending ? (
                                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                                    )}
                                  </button>
                                </div>
                                <p className="mt-1.5 text-[10px] leading-snug text-stone-400">
                                  URL stays the same. Old password stops
                                  working. Shown once to copy.
                                </p>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : hasPhotos && !secretReveal ? (
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
