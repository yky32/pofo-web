import Link from "next/link";
import { formatTagLabel } from "@/lib/project-tags";
import { cn } from "@/lib/utils";

/**
 * Server-friendly tag filter chips for the Projects library.
 */
export function ProjectTagFilter({
  tags,
  activeTag,
  basePath = "/dashboard/galleries",
}: {
  tags: string[];
  activeTag?: string | null;
  basePath?: string;
}) {
  if (!tags.length) return null;

  const active = activeTag?.trim().toLowerCase() || null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[11px] font-medium uppercase tracking-wider text-stone-400">
        Tags
      </span>
      <Link
        href={basePath}
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium transition",
          !active
            ? "bg-stone-900 text-white"
            : "bg-white text-stone-600 ring-1 ring-stone-200/90 hover:bg-stone-50 hover:text-stone-900"
        )}
      >
        All
      </Link>
      {tags.map((tag) => {
        const isOn = active === tag.toLowerCase();
        const href = `${basePath}?tag=${encodeURIComponent(tag)}`;
        return (
          <Link
            key={tag.toLowerCase()}
            href={isOn ? basePath : href}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition",
              isOn
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600 ring-1 ring-stone-200/90 hover:bg-stone-50 hover:text-stone-900"
            )}
          >
            {formatTagLabel(tag)}
          </Link>
        );
      })}
    </div>
  );
}
