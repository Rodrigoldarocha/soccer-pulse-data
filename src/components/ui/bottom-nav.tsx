import { Link, useLocation } from "@tanstack/react-router";
import { Bolt, CalendarDays, Radar, TrendingUp, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/picks", label: "Picks", icon: Bolt, badge: "+EV" },
  { path: "/today", label: "Partidas", icon: CalendarDays },
  { path: "/live", label: "Ao Vivo", icon: Radar, live: true },
  { path: "/analytics", label: "Analytics", icon: TrendingUp },
  { path: "/ledger", label: "Ledger", icon: Database },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegação principal">
      <div className="flex justify-between items-center h-16 px-gutter">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "bottom-nav-item",
                isActive && "bottom-nav-item-active"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {item.badge && isActive && (
                <span className="bottom-nav-badge" aria-label="Picks de valor disponíveis">
                  {item.badge}
                </span>
              )}
              <span className="relative flex items-center justify-center">
                <Icon className="h-5 w-5 group-hover:text-primary transition-transform group-active:scale-95" aria-hidden="true" />
                {item.live && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-tertiary animate-ping opacity-75" aria-hidden="true" />
                )}
              </span>
              <span className="font-label-xs text-label-xs tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}