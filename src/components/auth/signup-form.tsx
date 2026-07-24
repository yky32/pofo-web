"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Building2, User } from "lucide-react";
import { signUp, type AuthState } from "@/actions/auth";
import { EmailField } from "@/components/auth/email-field";
import {
  FieldMessage,
  FormBanner,
  fieldInputClass,
} from "@/components/auth/field-message";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SignupIntent } from "@/lib/signup-intent";
import { cn } from "@/lib/utils";

const initial: AuthState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [intent, setIntent] = useState<SignupIntent>("personal");
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");

  const passwordError = state.fields?.password;

  return (
    <div className="w-full max-w-sm">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
        Early access
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-stone-900">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        One login for personal and studio work.
      </p>

      <div className="mt-8 space-y-6">
        {/* Intent: icon-only — personal vs studio company */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setIntent("personal")}
            aria-label="Personal photographer"
            aria-pressed={intent === "personal"}
            title="Personal"
            className={cn(
              "flex h-[52px] w-[52px] items-center justify-center rounded-full border transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
              intent === "personal"
                ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
            )}
          >
            <User className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setIntent("team")}
            aria-label="Studio company"
            aria-pressed={intent === "team"}
            title="Studio company"
            className={cn(
              "flex h-[52px] w-[52px] items-center justify-center rounded-full border transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
              intent === "team"
                ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
            )}
          >
            <Building2 className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <SocialAuthButtons
          accountIntent={intent}
          next={
            intent === "team"
              ? "/dashboard/onboarding/studio"
              : "/dashboard"
          }
          layout="primary"
        />

        {/* 3) Email path */}
        <form action={action} noValidate className="space-y-4">
          <input type="hidden" name="account_intent" value={intent} />

          {intent === "personal" ? (
            <div className="space-y-2">
              <Label htmlFor="studio" className="text-stone-700">
                Studio name
              </Label>
              <Input
                id="studio"
                name="studio"
                placeholder="Light & Frame Studio"
                className="rounded-xl"
              />
              <FieldMessage tone="muted">Optional personal brand</FieldMessage>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="team_name" className="text-stone-700">
                  Company / studio name
                </Label>
                <Input
                  id="team_name"
                  name="team_name"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    if (!teamSlug || teamSlug === slugifyLocal(teamName)) {
                      setTeamSlug(slugifyLocal(e.target.value));
                    }
                  }}
                  placeholder="Northlight Collective"
                  required
                  className="rounded-xl"
                  aria-invalid={!!state.fields?.team_name}
                />
                {state.fields?.team_name ? (
                  <FieldMessage>{state.fields.team_name}</FieldMessage>
                ) : (
                  <FieldMessage tone="muted">Required for team</FieldMessage>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_slug" className="text-stone-700">
                  Studio link
                </Label>
                <Input
                  id="team_slug"
                  name="team_slug"
                  value={teamSlug}
                  onChange={(e) =>
                    setTeamSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  placeholder="northlight"
                  className="rounded-xl font-mono text-sm"
                  aria-invalid={!!state.fields?.team_slug}
                />
                {state.fields?.team_slug ? (
                  <FieldMessage>{state.fields.team_slug}</FieldMessage>
                ) : (
                  <FieldMessage tone="muted">
                    Public company brand (personal brand stays separate)
                  </FieldMessage>
                )}
              </div>
              <input type="hidden" name="studio" value={teamName} />
            </>
          )}

          <EmailField serverError={state.fields?.email} />

          <div className="space-y-2">
            <Label htmlFor="password" className="text-stone-700">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!passwordError}
              aria-describedby={
                passwordError ? "password-error" : "password-hint"
              }
              className={fieldInputClass(!!passwordError)}
            />
            {passwordError ? (
              <FieldMessage id="password-error">{passwordError}</FieldMessage>
            ) : (
              <FieldMessage id="password-hint" tone="muted">
                At least 6 characters.
              </FieldMessage>
            )}
          </div>

          {state.error ? <FormBanner>{state.error}</FormBanner> : null}
          {state.success ? (
            <FormBanner tone="success">{state.success}</FormBanner>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
          >
            {pending
              ? "Creating…"
              : intent === "team"
                ? "Create studio account"
                : "Create account"}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-stone-900 underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

function slugifyLocal(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
