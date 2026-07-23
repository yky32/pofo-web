"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmTone = "default" | "danger";

export type ConfirmOptions = {
  title: string;
  description?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Project-wide liquid-glass confirm (replaces window.confirm).
 *
 * @example
 * const confirm = useConfirm();
 * if (!(await confirm({ title: "Delete?", tone: "danger" }))) return;
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const titleId = useId();

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    setOpen(false);
    const r = resolveRef.current;
    resolveRef.current = null;
    r?.(value);
  }, []);

  const tone = options?.tone ?? "default";
  const isDanger = tone === "danger";

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) finish(false);
        }}
      >
        <DialogContent
          showCloseButton={false}
          overlayClassName="dialog-glass-overlay z-[300]"
          className={cn(
            "dialog-glass-panel z-[301] max-w-[min(22rem,calc(100vw-2rem))] gap-0 rounded-2xl p-0 sm:max-w-sm",
            "text-stone-900 ring-1 ring-white/60"
          )}
          aria-labelledby={titleId}
        >
          <div className="space-y-5 p-6 sm:p-7">
            <DialogHeader className="gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isDanger
                      ? "bg-rose-500/10 text-rose-700"
                      : "bg-stone-900/5 text-stone-700"
                  )}
                >
                  {isDanger ? (
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </span>
                <div className="min-w-0 space-y-1 pt-0.5">
                  <DialogTitle
                    id={titleId}
                    className="font-heading text-xl font-medium tracking-tight text-stone-900 sm:text-2xl"
                  >
                    {options?.title ?? "Confirm"}
                  </DialogTitle>
                  {options?.description ? (
                    <DialogDescription className="text-sm leading-relaxed text-stone-500">
                      {options.description}
                    </DialogDescription>
                  ) : null}
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-stone-600 hover:bg-stone-900/5 hover:text-stone-900"
                onClick={() => finish(false)}
              >
                {options?.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                className={cn(
                  "rounded-full",
                  isDanger
                    ? "bg-rose-700 text-white hover:bg-rose-800"
                    : "bg-stone-900 text-stone-50 hover:bg-stone-800"
                )}
                onClick={() => finish(true)}
              >
                {options?.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
