"use client";

import { useState, useTransition } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { processProjectPreviews } from "@/actions/previews";
import { Button } from "@/components/ui/button";

/** Manual kick for Sharp preview generation on pending JPEG shots. */
export function ProcessPreviewsButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 rounded-full text-xs"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          startTransition(async () => {
            const res = await processProjectPreviews({ projectId, limit: 40 });
            if (res.error && !res.processed) {
              setMsg(res.error);
              return;
            }
            setMsg(
              `Previews: ${res.processed ?? 0} ready · ${res.skipped ?? 0} skipped · ${res.failed ?? 0} failed`
            );
          });
        }}
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
        )}
        Build previews
      </Button>
      {msg ? (
        <span className="text-[11px] text-stone-500">{msg}</span>
      ) : null}
    </div>
  );
}
