"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [state, action, pending] = useActionState(signIn, initial);

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

      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@studio.com"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="rounded-xl"
          />
        </div>

        {state.error ? (
          <p className="rounded-[5px] bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {state.error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
        >
          {pending ? "Signing in…" : "Continue"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-stone-500">
        No account?{" "}
        <Link href="/signup" className="text-stone-900 underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
