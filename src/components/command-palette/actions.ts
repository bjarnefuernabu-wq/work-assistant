import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Inbox,
  Sun,
  CalendarRange,
  Clock,
  Mail,
  Bot,
  Search,
  Activity,
  Settings,
  FilePlus,
  FolderPlus,
} from "lucide-react";

export interface PaletteAction {
  id: string;
  label: string;
  group: "Navigate" | "Create" | "Generate";
  href: string;
  icon: React.ElementType;
  keywords?: string;
}

export const PALETTE_ACTIONS: PaletteAction[] = [
  { id: "nav-dashboard", label: "Dashboard", group: "Navigate", href: "/dashboard", icon: LayoutDashboard },
  { id: "nav-projects", label: "Projects", group: "Navigate", href: "/projects", icon: FolderKanban },
  { id: "nav-tasks", label: "Tasks", group: "Navigate", href: "/tasks", icon: CheckSquare },
  { id: "nav-inbox", label: "Inbox", group: "Navigate", href: "/inbox", icon: Inbox },
  { id: "nav-followups", label: "Waiting For", group: "Navigate", href: "/followups", icon: Clock },
  { id: "nav-day", label: "Today's Plan", group: "Navigate", href: "/planning/day", icon: Sun },
  { id: "nav-week", label: "Week Plan", group: "Navigate", href: "/planning/week", icon: CalendarRange },
  { id: "nav-email", label: "Email Assistant", group: "Navigate", href: "/email", icon: Mail },
  { id: "nav-assistant", label: "AI Assistant", group: "Navigate", href: "/assistant", icon: Bot },
  { id: "nav-search", label: "Search", group: "Navigate", href: "/search", icon: Search },
  { id: "nav-activity", label: "Activity Log", group: "Navigate", href: "/activity", icon: Activity },
  { id: "nav-settings", label: "Settings", group: "Navigate", href: "/settings", icon: Settings },
  {
    id: "create-task",
    label: "New task",
    group: "Create",
    href: "/tasks/new",
    icon: FilePlus,
    keywords: "add task",
  },
  {
    id: "create-project",
    label: "New project",
    group: "Create",
    href: "/projects/new",
    icon: FolderPlus,
    keywords: "add project",
  },
  {
    id: "generate-day",
    label: "Plan my day",
    group: "Generate",
    href: "/planning/day?generate=1",
    icon: Sun,
  },
  {
    id: "generate-week",
    label: "Plan my week",
    group: "Generate",
    href: "/planning/week?generate=1",
    icon: CalendarRange,
  },
];
