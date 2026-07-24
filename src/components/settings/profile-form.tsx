"use client";

import { useActionState, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { updateProfile, type ProfileActionState } from "@/actions/profile";
import { FieldMessage, FormBanner } from "@/components/auth/field-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studioPublicBaseUrl } from "@/lib/host";
import type { Profile } from "@/types/database";

const initial: ProfileActionState = {};

export function ProfileForm({
  profile,
  appUrl,
  rootDomain,
  dense = false,
}: {
  profile: Profile;
  appUrl: string;
  rootDomain: string | null;
  /** Inside a parent island — no outer paper shell */
  dense?: boolean;
}) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const [copied, setCopied] = useState(false);
  const slugPreview = profile.slug || "your-studio";
  const hasSlug = Boolean(profile.slug?.trim());

  // Always subdomain-first (root domain, local *.localhost, else rare path fallback)
  const publicUrl = studioPublicBaseUrl(slugPreview, appUrl);

  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <form
      action={action}
      className={dense ? "space-y-4" : "paper space-y-5 rounded-[5px] p-6"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="studio" className="text-stone-700">
            Studio name
          </Label>
          <Input
            id="studio"
            name="studio"
            defaultValue={profile.studio_name ?? ""}
            placeholder="Light & Frame Studio"
            className="rounded-xl border-stone-300 bg-white"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="display_name" className="text-stone-700">
            Display name
          </Label>
          <Input
            id="display_name"
            name="display_name"
            defaultValue={profile.display_name ?? ""}
            placeholder="Wayne"
            className="rounded-xl border-stone-300 bg-white"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug" className="text-stone-700">
          Studio link
        </Label>
        <div className="flex items-center gap-2">
          {rootDomain ? (
            <span className="hidden shrink-0 text-sm text-stone-400 sm:inline">
              https://
            </span>
          ) : null}
          <Input
            id="slug"
            name="slug"
            defaultValue={profile.slug ?? ""}
            placeholder="wy-studio"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="rounded-xl border-stone-300 bg-white font-mono text-sm"
            aria-invalid={!!state.fields?.slug}
          />
          {rootDomain ? (
            <span className="hidden shrink-0 text-sm text-stone-400 sm:inline">
              .{rootDomain}
            </span>
          ) : null}
        </div>
        {state.fields?.slug ? (
          <FieldMessage>{state.fields.slug}</FieldMessage>
        ) : hasSlug ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-stone-200/80 bg-stone-50/80">
            <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 px-3 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
                Your public page
              </p>
              <p className="text-[11px] text-stone-400">Share with clients</p>
            </div>
            <div className="flex items-center gap-0.5 px-1.5 py-1">
              <p
                className="min-w-0 flex-1 truncate px-2 py-1.5 font-mono text-[12px] text-stone-700"
                title={publicUrl}
              >
                {publicUrl.replace(/^https?:\/\//, "")}
              </p>
              <button
                type="button"
                onClick={() => void copyPublicUrl()}
                title={copied ? "Copied" : "Copy link"}
                aria-label={copied ? "Copied" : "Copy public link"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-white hover:text-stone-800"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open public page"
                aria-label="Open public page"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-white hover:text-stone-800"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>
        ) : (
          <p className="text-xs text-stone-400">
            Pick a short link so clients can open your public portfolio.
          </p>
        )}
      </div>

      {state.error ? <FormBanner>{state.error}</FormBanner> : null}
      {state.success ? (
        <FormBanner tone="success">{state.success}</FormBanner>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
      >
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
