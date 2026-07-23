import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
        Early access
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium text-stone-900">
        Create your studio
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Start delivering galleries in minutes.
      </p>

      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="studio" className="text-stone-600">
            Studio name
          </Label>
          <Input
            id="studio"
            placeholder="Light & Frame Studio"
            className="rounded-sm border-stone-300 bg-white"
          />
        </div>
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
          <Link href="/dashboard">Create account</Link>
        </Button>
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
