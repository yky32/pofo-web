"use client";

import { useActionState } from "react";
import { ImagePlus } from "lucide-react";
import { seedDemoShots, type ShotActionState } from "@/actions/shots";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initial: ShotActionState = {};

export function SeedPhotosButton({
  projectId,
  variant = "button",
  className,
}: {
  projectId: string;
  /** Quiet text control for empty states */
  variant?: "button" | "link";
  className?: string;
}) {
  const [state, action, pending] = useActionState(seedDemoShots, initial);

  return (
    <div className={cn("space-y-1", className)}>
      <form action={action}>
        <input type="hidden" name="project_id" value={projectId} />
        {variant === "link" ? (
          <button
            type="submit"
            disabled={pending}
            className="text-sm text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline disabled:opacity-50"
          >
            {pending ? "Adding samples…" : "Add sample photos"}
          </button>
        ) : (
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={pending}
            className="rounded-full border-stone-300"
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            {pending ? "Adding…" : "Add sample photos"}
          </Button>
        )}
      </form>
      {state.error ? (
        <p className="text-xs text-rose-600/90">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-emerald-700">{state.success}</p>
      ) : null}
    </div>
  );
}
