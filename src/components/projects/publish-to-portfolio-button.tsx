"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Images, Loader2 } from "lucide-react";
import { publishShotsToPortfolio } from "@/actions/portfolio";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function PublishToPortfolioButton({
  projectId,
  shotIds,
  label,
}: {
  projectId: string;
  shotIds: string[];
  label?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const n = shotIds.length;

  async function onPublish() {
    if (!n) return;
    const ok = await confirm({
      title:
        n === 1
          ? "Publish this photo to your portfolio?"
          : `Publish ${n} photos to your portfolio?`,
      description:
        "They appear on your public studio page. You can hide or remove them later from Portfolio.",
      confirmLabel: n === 1 ? "Publish photo" : `Publish ${n}`,
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await publishShotsToPortfolio({
        projectId,
        shotIds,
        markProjectFinal: false,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setSuccess(res.success ?? "Published.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full border-stone-300"
        disabled={!n || pending}
        onClick={() => void onPublish()}
        title={
          n
            ? "Add client’s finished proof to your public portfolio"
            : "No proofed photos yet"
        }
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Images className="mr-1.5 h-3.5 w-3.5" />
        )}
        {label ?? (n ? `Portfolio (${n})` : "Portfolio")}
      </Button>
      {error ? (
        <p className="max-w-[14rem] text-right text-[11px] text-rose-600">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="max-w-[14rem] text-right text-[11px] text-emerald-700">
          {success}
        </p>
      ) : null}
    </div>
  );
}
