import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeliveryStepId = "upload" | "share" | "selecting" | "final";
export type DeliveryStepState = "complete" | "current" | "upcoming";

export type DeliveryStep = {
  id: DeliveryStepId;
  label: string;
  hint: string;
  state: DeliveryStepState;
};

/**
 * Delivery pipeline:
 * 1 Upload → 2 Share → 3 Client selecting (partial) → 4 Final
 *
 * Percent weights: upload 25 · share 25 · selecting 35 · final 15
 * Selecting advances with favorites / selection_limit.
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
  summary: string;
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

  // Overall %
  let percent = 0;
  if (isFinal) {
    percent = 100;
  } else {
    if (hasPhotos) percent += 25;
    if (hasShareLink) percent += 25;
    if (hasShareLink) {
      // 0 → 35 as client fills favorites
      percent += Math.round(35 * pickRatio);
    }
    // final step only when marked
    percent = Math.min(99, percent); // 100 only when final
  }

  // Current step
  let currentId: DeliveryStepId;
  if (isFinal) currentId = "final";
  else if (!hasPhotos) currentId = "upload";
  else if (!hasShareLink) currentId = "share";
  else if (!picksFull) currentId = "selecting";
  else currentId = "final";

  const done = {
    upload: hasPhotos,
    share: hasShareLink,
    selecting: isFinal || picksFull,
    final: isFinal,
  };

  function state(id: DeliveryStepId): DeliveryStepState {
    if (done[id] && id !== currentId) return "complete";
    if (done[id] && id === "final" && isFinal) return "complete";
    if (id === currentId) return "current";
    if (done[id]) return "complete";
    return "upcoming";
  }

  // When current is selecting and some picks exist, selecting is still current (not complete)
  const steps: DeliveryStep[] = [
    {
      id: "upload",
      label: "Upload",
      hint: hasPhotos
        ? `${photoCount} photo${photoCount === 1 ? "" : "s"}`
        : "Add gallery photos",
      state: state("upload"),
    },
    {
      id: "share",
      label: "Share",
      hint: hasShareLink ? "Client link live" : "Send private link",
      state: state("share"),
    },
    {
      id: "selecting",
      label: "Client selecting",
      hint: !hasShareLink
        ? "After you share"
        : hasPicks
          ? `${selectedCount} of ${limit} favorites`
          : "Waiting for picks",
      state:
        currentId === "selecting"
          ? "current"
          : done.selecting
            ? "complete"
            : "upcoming",
    },
    {
      id: "final",
      label: "Final",
      hint: isFinal ? "Delivery complete" : "Mark as final",
      state:
        isFinal
          ? "complete"
          : currentId === "final"
            ? "current"
            : "upcoming",
    },
  ];

  // Ensure earlier steps show complete when later ones are active
  if (currentId === "share" || currentId === "selecting" || currentId === "final") {
    steps[0].state = hasPhotos ? "complete" : steps[0].state;
  }
  if (currentId === "selecting" || currentId === "final") {
    steps[1].state = hasShareLink ? "complete" : steps[1].state;
  }
  if (currentId === "final" && !isFinal) {
    steps[2].state = picksFull ? "complete" : steps[2].state;
  }
  if (isFinal) {
    steps.forEach((s) => {
      s.state = "complete";
    });
  }

  let summary = "";
  switch (currentId) {
    case "upload":
      summary = "Start by uploading photos for this delivery.";
      break;
    case "share":
      summary = "Create a private link so your client can view the gallery.";
      break;
    case "selecting":
      summary = hasPicks
        ? `Client is selecting favorites · ${selectedCount}/${limit}.`
        : "Link is live — waiting for the client to select favorites.";
      break;
    case "final":
      summary = isFinal
        ? "This delivery is complete."
        : "Client picks are ready — mark as final when you’re done.";
      break;
  }

  return { steps, percent, currentId, summary };
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
  const { steps, percent, summary } = computeDeliveryProgress({
    photoCount,
    hasShareLink,
    selectedCount,
    selectionLimit,
    isFinal,
  });

  return (
    <div
      className={cn(
        "rounded-[10px] border border-stone-200/80 bg-white/70 px-4 py-4 sm:px-5",
        className
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
            Delivery progress
          </p>
          <p className="mt-0.5 text-sm text-stone-600">{summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-2xl font-medium tabular-nums leading-none text-stone-900">
            {percent}
            <span className="text-base font-normal text-stone-400">%</span>
          </p>
          <p className="mt-0.5 text-[11px] text-stone-400">complete</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
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

      <ol className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 sm:gap-0">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li
              key={s.id}
              className="relative flex flex-col items-start sm:items-center"
            >
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute left-[calc(50%+16px)] right-[calc(-50%+16px)] top-[13px] hidden h-px sm:block",
                    steps[i].state === "complete" ||
                      steps[i + 1]?.state !== "upcoming"
                      ? "bg-stone-800"
                      : "bg-stone-200"
                  )}
                />
              ) : null}

              <div className="relative z-[1] flex items-center gap-2.5 sm:flex-col sm:gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    s.state === "complete" && "bg-stone-900 text-white",
                    s.state === "current" &&
                      "bg-white text-stone-900 ring-2 ring-stone-900 ring-offset-2 ring-offset-[oklch(0.99_0.002_80)]",
                    s.state === "upcoming" && "bg-stone-100 text-stone-400"
                  )}
                >
                  {s.state === "complete" ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 sm:text-center">
                  <p
                    className={cn(
                      "text-xs font-medium leading-tight",
                      s.state === "upcoming" ? "text-stone-400" : "text-stone-800"
                    )}
                  >
                    {s.label}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[11px] leading-snug",
                      s.state === "current" ? "text-stone-600" : "text-stone-400"
                    )}
                  >
                    {s.hint}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Client selecting detail bar */}
      {hasShareLink && !isFinal ? (
        <div className="mt-4 rounded-[8px] bg-stone-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-medium text-stone-600">
              Client selecting favorites
            </span>
            <span className="tabular-nums text-stone-500">
              {selectedCount} / {limitLabel(selectionLimit)}
              <span className="ml-1.5 text-stone-400">
                (
                {Math.min(
                  100,
                  Math.round(
                    (selectedCount / Math.max(1, selectionLimit)) * 100
                  )
                )}
                %)
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-200/90">
            <div
              className="h-full rounded-full bg-rose-400/90 transition-[width] duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (selectedCount / Math.max(1, selectionLimit)) * 100
                  )
                )}%`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function limitLabel(n: number) {
  return Math.max(1, n || 1);
}
