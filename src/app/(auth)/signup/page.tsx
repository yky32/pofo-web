import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm">
      <p className="label-soft">Early access</p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Create your studio
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start delivering galleries in minutes.
      </p>

      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="studio">Studio name</Label>
          <Input
            id="studio"
            placeholder="Light & Frame Studio"
            className="rounded-xl"
          />
        </div>
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
          <Link href="/dashboard">Create account</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-rose hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
