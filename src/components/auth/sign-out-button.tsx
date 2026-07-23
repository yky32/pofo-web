"use client";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="w-full rounded-full border-stone-200 bg-white/50"
      >
        Log out
      </Button>
    </form>
  );
}
