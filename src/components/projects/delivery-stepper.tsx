import { cn } from "@/lib/utils";

export type DeliveryStepId = "upload" | "share" | "proofing" | "final";
export type DeliveryStepState = "complete" | "current" | "upcoming";

export type DeliveryStep = {
  id: DeliveryStepId;
  label: string;
  state: DeliveryStepState;
};

/**
 * Upload → Share → Proofing → Final
 * Weights: 25 · 25 · 35 · 15 (proofing scales with picks / limit)
 */
export function computeDeliveryProgress(input: {
  photoCount: number;
  hasShareLink: boolean;
  selectedCount: number;
  selectionLimit: number;
  isFinal: boolean;
}): {
  steps: DeliveryStep[];
  percent: number;
  currentId: DeliveryStepId;
  detail: string | null;
} {
  const {
    photoCount,
    hasShareLink,
    selectedCount,
    selectionLimit,
    isFinal,
  } = input;

  const limit = Math.max(1, selectionLimit || 1);
  const hasPhotos = photoCount > 0;
  const hasPicks = selectedCount > 0;
  const pickRatio = Math.min(1, selectedCount / limit);
  const picksFull = hasPicks && selectedCount >= limit;

  let percent = 0;
  if (isFinal) {
    percent = 100;
  } else {
    if (hasPhotos) percent += 25;
    if (hasShareLink) percent += 25;
    if (hasShareLink) percent += Math.round(35 * pickRatio);
    percent = Math.min(99, percent);
  }

  let currentId: DeliveryStepId;
  if (isFinal) currentId = "final";
  else if (!hasPhotos) currentId = "upload";
  else if (!hasShareLink) currentId = "share";
  else if (!picksFull) currentId = "proofing";
  else currentId = "final";

  const order: DeliveryStepId[] = ["upload", "share", "proofing", "final"];
  const labels: Record<DeliveryStepId, string> = {
    upload: "Upload",
    share: "Share",
    proofing: "Proofing",
    final: "Final",
  };

  const done: Record<DeliveryStepId, boolean> = {
    upload: hasPhotos,
    share: hasShareLink,
    proofing: isFinal || picksFull,
    final: isFinal,
  };

  const steps: DeliveryStep[] = order.map((id) => {
    let state: DeliveryStepState = "upcoming";
    if (isFinal) state = "complete";
    else if (id === currentId) state = "current";
    else if (done[id] || order.indexOf(id) < order.indexOf(currentId))
      state = "complete";
    return { id, label: labels[id], state };
  });

  let detail: string | null = null;
  if (isFinal) detail = "Delivery complete";
  else if (currentId === "upload") detail = "Add photos to begin";
  else if (currentId === "share") detail = "Send a client link";
  else if (currentId === "proofing")
    detail = hasPicks
      ? `${selectedCount} / ${limit} proofed`
      : "Waiting for client";
  else if (currentId === "final") detail = "Ready to mark final";

  return { steps, percent, currentId, detail };
}

export function DeliveryStepper({
  photoCount,
  hasShareLink,
  selectedCount,
  selectionLimit,
  isFinal,
  className,
}: {
  photoCount: number;
  hasShareLink: boolean;
  selectedCount: number;
  selectionLimit: number;
  isFinal: boolean;
  className?: string;
}) {
  const { steps, percent, detail } = computeDeliveryProgress({
    photoCount,
    hasShareLink,
    selectedCount,
    selectionLimit,
    isFinal,
  });

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-sm">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              {i > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1 h-px w-4 sm:w-6",
                    s.state === "upcoming" ? "bg-stone-200" : "bg-stone-400"
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "tracking-tight",
                  s.state === "complete" && "text-stone-500",
                  s.state === "current" && "font-medium text-stone-900",
                  s.state === "upcoming" && "text-stone-300"
                )}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
        <p className="shrink-0 font-heading text-lg tabular-nums text-stone-900 sm:text-xl">
          {percent}
          <span className="text-sm text-stone-400">%</span>
        </p>
      </div>

      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-stone-100">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            percent >= 100 ? "bg-emerald-700" : "bg-stone-900"
          )}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Delivery progress"
        />
      </div>

      {detail ? (
        <p className="mt-2 text-xs text-stone-500">{detail}</p>
      ) : null}
    </div>
  );
}
