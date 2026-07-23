"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { markProjectFinal, type ShotActionState } from "@/actions/shots";
import { Button } from "@/components/ui/button";

const initial: ShotActionState = {};

export function MarkFinalButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(markProjectFinal, initial);

  return (
    <div className="space-y-1">
      <form action={action}>
        <input type="hidden" name="project_id" value={projectId} />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={disabled || pending}
          className="rounded-full border-stone-300"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {pending ? "Saving…" : "Mark as final"}
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
