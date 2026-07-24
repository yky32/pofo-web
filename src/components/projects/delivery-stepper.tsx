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

  const allDone = percent >= 100 || steps.every((s) => s.state === "complete");

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div className="flex min-w-0 items-baseline justify-between gap-2 sm:gap-4">
        <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-0.5 gap-y-1 text-xs sm:gap-x-1 sm:text-sm">
          {steps.map((s, i) => {
            const prev = i > 0 ? steps[i - 1] : null;
            // Connector green when the previous step is already past
            const lineDone =
              prev?.state === "complete" ||
              (prev?.state === "current" && s.state !== "upcoming");
            return (
              <li key={s.id} className="flex items-center gap-0.5 sm:gap-1">
                {i > 0 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "mx-0.5 h-px w-2.5 shrink-0 transition-colors sm:mx-1 sm:w-6",
                      lineDone || prev?.state === "complete"
                        ? "bg-emerald-500"
                        : "bg-stone-200"
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "tracking-tight transition-colors",
                    // Completed steps → green
                    s.state === "complete" && "font-medium text-emerald-600",
                    // Active step stays clear
                    s.state === "current" && "font-medium text-stone-900",
                    // Not reached yet
                    s.state === "upcoming" && "text-stone-300"
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
        <p
          className={cn(
            "shrink-0 font-heading text-base tabular-nums sm:text-xl transition-colors",
            allDone ? "text-emerald-700" : "text-stone-900"
          )}
        >
          {percent}
          <span
            className={cn(
              "text-xs sm:text-sm",
              allDone ? "text-emerald-600/70" : "text-stone-400"
            )}
          >
            %
          </span>
        </p>
      </div>

      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-stone-100">
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-500 ease-out",
            // Filled track green for any completed progress; brighter when 100%
            percent <= 0
              ? "bg-stone-300"
              : allDone
                ? "bg-emerald-600"
                : "bg-emerald-500"
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
        <p
          className={cn(
            "mt-2 text-xs transition-colors",
            allDone ? "text-emerald-700" : "text-stone-500"
          )}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}
