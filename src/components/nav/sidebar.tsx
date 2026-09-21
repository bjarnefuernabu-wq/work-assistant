"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Inbox,
  CalendarClock,
  Sun,
  CalendarRange,
  Clock,
  Mail,
  Bot,
  Search,
  Activity,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_SECTIONS: { label: string; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/search", label: "Search", icon: Search },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/followups", label: "Waiting For", icon: Clock },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/planning/day", label: "Today's Plan", icon: Sun },
      { href: "/planning/week", label: "Week Plan", icon: CalendarRange },
      { href: "/calendar", label: "Calendar", icon: CalendarClock },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/email", label: "Email Assistant", icon: Mail },
      { href: "/assistant", label: "AI Assistant", icon: Bot },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/activity", label: "Activity Log", icon: Activity },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-12 items-center border-b border-border px-4">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Work Assistant
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="mb-1 px-2 text-[10px] font-semibold tracking-wider text-subtle uppercase">
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-surface-raised text-foreground"
                      : "text-muted hover:bg-surface-raised hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-border px-3 py-2 text-[11px] text-subtle">
        <kbd className="rounded border border-border bg-surface-raised px-1 py-0.5 font-mono">
          ⌘K
        </kbd>{" "}
        for quick actions
      </div>
    </aside>
  );
}
