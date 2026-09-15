import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  CalendarClock,
  Radio,
  LineChart,
  Settings as SettingsIcon,
  Menu,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/today", label: "Hoje", icon: CalendarDays },
  { to: "/tomorrow", label: "Amanhã", icon: CalendarClock },
  { to: "/live", label: "Ao Vivo", icon: Radio },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/settings", label: "Configurações", icon: SettingsIcon },
] as const;

const NavItems = memo(function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5 px-3" role="navigation" aria-label="Menu principal">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors focus-ring",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
            )}
          >
            {active && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 rounded bg-primary/10"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <Icon className="relative z-10 h-[18px] w-[18px]" aria-hidden="true" />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
});

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
        <Radio className="h-4 w-4 text-primary" />
      </div>
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        PulseLab
      </span>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar lg:block">
        <Brand />
        <NavItems />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="rounded border border-border px-4 py-3">
            <div className="text-[11px] font-medium text-muted-foreground">ML Engine</div>
            <div className="mt-1 text-xs text-muted-foreground/60">Poisson + Ensemble v2.5</div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
            <Radio className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-display text-sm font-bold text-foreground">PulseLab</span>
        </div>
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors focus-ring"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  aria-label="Fechar menu"
                  onClick={() => setOpen(false)}
                  className="mr-3 rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors focus-ring"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
