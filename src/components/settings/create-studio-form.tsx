"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTeam } from "@/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { preferredSlug } from "@/lib/slug";

export function CreateStudioForm({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldSlug, setFieldSlug] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldName(null);
    setFieldSlug(null);
    startTransition(async () => {
      const res = await createTeam({
        name,
        slug: slug || preferredSlug(name, null),
        switchTo: true,
      });
      if (res.fields?.name) setFieldName(res.fields.name);
      if (res.fields?.slug) setFieldSlug(res.fields.slug);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      router.push("/dashboard");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        compact
          ? "space-y-3 rounded-[8px] border border-stone-200/80 bg-white/60 p-4"
          : "space-y-4 rounded-[8px] border border-stone-200/80 bg-white/70 p-6"
      }
    >
      {!compact ? (
        <div>
          <p className="text-sm font-medium text-stone-900">
            Create studio workspace
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Team projects share this brand. Your personal projects stay private
            to you.
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium text-stone-900">
          Create studio workspace
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="team-name">Company name</Label>
        <Input
          id="team-name"
          value={name}
          onChange={(e) => {
            const v = e.target.value;
            setName(v);
            if (!slug || slug === preferredSlug(name, null)) {
              setSlug(preferredSlug(v, null));
            }
          }}
          placeholder="Northlight Collective"
          className="rounded-xl"
          required
        />
        {fieldName ? (
          <p className="text-xs text-rose-600">{fieldName}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="team-slug">Studio link</Label>
        <Input
          id="team-slug"
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
          }
          placeholder="northlight"
          className="rounded-xl font-mono text-sm"
        />
        {fieldSlug ? (
          <p className="text-xs text-rose-600">{fieldSlug}</p>
        ) : (
          <p className="text-[11px] text-stone-400">
            Separate from your personal brand slug
          </p>
        )}
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      <Button
        type="submit"
        disabled={pending || name.trim().length < 2}
        className="rounded-full bg-stone-900 text-white hover:bg-stone-800"
        size="sm"
      >
        {pending ? "Creating…" : "Create studio"}
      </Button>
    </form>
  );
}
