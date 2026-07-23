import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <p className="label-soft">Welcome back</p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Sign in to your studio
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage galleries and client deliveries.
      </p>

      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@studio.com"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="rounded-xl"
          />
        </div>
        <Button className="w-full rounded-full bg-rose hover:bg-rose/90" asChild>
          <Link href="/dashboard">Continue</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="text-rose hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
