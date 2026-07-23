"use client";

import { useActionState } from "react";
import Link from "next/link";
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

const initial: AuthState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initial);

  const passwordError = state.fields?.password;

  return (
    <div className="w-full max-w-sm">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
        Early access
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-stone-900">
        Create your studio
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Start delivering projects in minutes.
      </p>

      <div className="mt-8 space-y-6">
        <SocialAuthButtons next="/dashboard" layout="primary" />

        <form action={action} noValidate className="space-y-4">
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
            <FieldMessage tone="muted">Optional</FieldMessage>
          </div>

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
            {pending ? "Creating…" : "Create account"}
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
