import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <p className="label-micro">Welcome back</p>
      <h1 className="mt-3 font-heading text-3xl font-medium tracking-tight text-neutral-900">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Manage galleries and deliveries.
      </p>

      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-neutral-600">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@studio.com"
            className="rounded-none border-neutral-300"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-neutral-600">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="rounded-none border-neutral-300"
          />
        </div>
        <Button
          className="w-full rounded-none bg-neutral-900 text-white hover:bg-neutral-800"
          asChild
        >
          <Link href="/dashboard">Continue</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-neutral-500">
        No account?{" "}
        <Link href="/signup" className="text-neutral-900 underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
