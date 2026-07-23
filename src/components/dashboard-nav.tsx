"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderOpen,
  Images,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/galleries", label: "Projects", icon: FolderOpen },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Images },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard"
            ? pathname === href
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex items-center rounded-[5px] text-sm transition-colors",
              collapsed
                ? "justify-center px-0 py-2"
                : "gap-2.5 px-2.5 py-2",
              active
                ? "bg-stone-900 text-stone-50"
                : "text-stone-500 hover:bg-stone-900/5 hover:text-stone-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
            {!collapsed ? (
              <span className="truncate">{label}</span>
            ) : (
              <span className="sr-only">{label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
