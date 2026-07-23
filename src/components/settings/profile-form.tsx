"use client";

import { useActionState } from "react";
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
}: {
  profile: Profile;
  appUrl: string;
  rootDomain: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const slugPreview = profile.slug || "your-studio";

  const publicUrl = rootDomain
    ? `https://${slugPreview}.${rootDomain}`
    : studioPublicBaseUrl(slugPreview, appUrl);

  return (
    <form action={action} className="paper space-y-5 rounded-[5px] p-6">
      <div className="space-y-2">
        <Label htmlFor="studio" className="text-stone-700">
          Studio name
        </Label>
        <Input
          id="studio"
          name="studio"
          defaultValue={profile.studio_name ?? ""}
          placeholder="Light & Frame Studio"
          className="rounded-[5px] border-stone-300 bg-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_name" className="text-stone-700">
          Display name
        </Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name ?? ""}
          placeholder="Wayne"
          className="rounded-[5px] border-stone-300 bg-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug" className="text-stone-700">
          Studio link
        </Label>
        <div className="flex items-center gap-2">
          {rootDomain ? (
            <span className="hidden text-sm text-stone-400 sm:inline">
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
            className="rounded-[5px] border-stone-300 bg-white font-mono text-sm"
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
        ) : (
          <p className="text-xs text-stone-400">
            Public URL:{" "}
            <span className="font-mono text-stone-600">{publicUrl}</span>
            {!rootDomain ? (
              <span className="mt-1 block text-stone-400">
                Path-style until{" "}
                <code className="text-stone-500">NEXT_PUBLIC_ROOT_DOMAIN</code>{" "}
                is set (e.g. pofo.app). Local studio host:{" "}
                <code className="text-stone-500">
                  {slugPreview}.localhost:3002
                </code>
              </span>
            ) : null}
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
