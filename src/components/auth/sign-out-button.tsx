"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOut}>
      {compact ? (
        <Button
          type="submit"
          variant="outline"
          size="icon"
          title="Log out"
          className="rounded-full border-stone-200 bg-white/50"
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Log out</span>
        </Button>
      ) : (
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="w-full rounded-full border-stone-200 bg-white/50"
        >
          Log out
        </Button>
      )}
    </form>
  );
}
