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

export function DashboardNav() {
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
            className={cn(
              "flex items-center gap-3 rounded-[5px] px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-stone-900 text-stone-50"
                : "text-stone-500 hover:bg-stone-900/5 hover:text-stone-900"
            )}
          >
            <Icon className="h-4 w-4 opacity-80" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
