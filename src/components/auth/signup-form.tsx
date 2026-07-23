"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AuthState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initial);

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

      <form action={action} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="studio">Studio name</Label>
          <Input
            id="studio"
            name="studio"
            placeholder="Light & Frame Studio"
            className="rounded-xl"
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="••••••••"
            className="rounded-xl"
          />
        </div>

        {state.error ? (
          <p className="rounded-[5px] bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-[5px] bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
            {state.success}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
        >
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="text-stone-900 underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
