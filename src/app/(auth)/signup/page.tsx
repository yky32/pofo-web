import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm">
      <p className="label-lab text-steel">Early access</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Create studio
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start delivering in minutes.
      </p>

      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="studio">Studio name</Label>
          <Input id="studio" placeholder="Light & Frame Studio" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@studio.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" />
        </div>
        <Button className="w-full bg-steel hover:bg-steel/90" asChild>
          <Link href="/dashboard">Create account</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-steel hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
