import { cn } from "@/lib/utils";

export function FieldMessage({
  id,
  children,
  tone = "error",
}: {
  id?: string;
  children: React.ReactNode;
  tone?: "error" | "muted";
}) {
  return (
    <p
      id={id}
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "text-xs leading-relaxed",
        tone === "error" ? "text-red-600/90" : "text-stone-500",
      )}
    >
      {children}
    </p>
  );
}

export function FormBanner({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "success";
}) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-[5px] px-3 py-2.5 text-sm leading-relaxed ring-1",
        tone === "error"
          ? "bg-red-50/80 text-red-800 ring-red-100"
          : "bg-emerald-50/80 text-emerald-900 ring-emerald-100",
      )}
    >
      {children}
    </p>
  );
}

export function fieldInputClass(hasError?: boolean) {
  return cn(
    "rounded-xl transition-colors",
    hasError &&
      "border-red-200 bg-red-50/30 focus-visible:border-red-300 focus-visible:ring-red-100/80",
  );
}
