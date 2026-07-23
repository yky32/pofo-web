import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
        Welcome back
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-stone-900">
        Sign in to your studio
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Manage galleries and client deliveries.
      </p>

      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-stone-600">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@studio.com"
            className="rounded-sm border-stone-300 bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-stone-600">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="rounded-sm border-stone-300 bg-white"
          />
        </div>
        <Button
          className="w-full rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
          asChild
        >
          <Link href="/dashboard">Continue</Link>
        </Button>
        <p className="text-center text-xs text-stone-400">
          Demo mode works without Supabase keys.
        </p>
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
