"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "@/actions/auth";
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

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const oauthError = searchParams.get("error");
  const [state, action, pending] = useActionState(signIn, initial);

  const passwordError = state.fields?.password;

  return (
    <div className="w-full max-w-sm">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
        Welcome back
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-stone-900">
        Sign in to your studio
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Manage projects and client deliveries.
      </p>

      <div className="mt-8 space-y-4">
        <SocialAuthButtons next={next} />

        <form action={action} noValidate className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <EmailField serverError={state.fields?.email} />

          <div className="space-y-2">
            <Label htmlFor="password" className="text-stone-700">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "password-error" : undefined}
              className={fieldInputClass(!!passwordError)}
            />
            {passwordError ? (
              <FieldMessage id="password-error">{passwordError}</FieldMessage>
            ) : null}
          </div>

          {oauthError ? <FormBanner>{oauthError}</FormBanner> : null}
          {state.error ? <FormBanner>{state.error}</FormBanner> : null}

          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
          >
            {pending ? "Signing in…" : "Continue with email"}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-stone-500">
        No account?{" "}
        <Link
          href="/signup"
          className="text-stone-900 underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
