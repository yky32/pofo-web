"use client";

import { useActionState } from "react";
import { ImagePlus } from "lucide-react";
import { seedDemoShots, type ShotActionState } from "@/actions/shots";
import { Button } from "@/components/ui/button";

const initial: ShotActionState = {};

export function SeedPhotosButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(seedDemoShots, initial);

  return (
    <div className="space-y-2">
      <form action={action}>
        <input type="hidden" name="project_id" value={projectId} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={disabled || pending}
          className="rounded-full border-stone-300"
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          {pending ? "Adding…" : "Add sample photos"}
        </Button>
      </form>
      {state.error ? (
        <p className="text-xs text-red-600/90">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-emerald-700">{state.success}</p>
      ) : null}
    </div>
  );
}
