import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Layers3,
  Radio,
  LineChart,
  Settings as SettingsIcon,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/today", label: "Palpites do Dia", icon: CalendarDays },
  { to: "/multiples", label: "Múltiplas", icon: Layers3 },
  { to: "/live", label: "Ao Vivo", icon: Radio },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/settings", label: "Configurações", icon: SettingsIcon },
] as const;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            {active && (
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Zap className="h-5 w-5" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          Pulse<span className="text-primary">Lab</span>
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Soccer Analytics
        </span>
      </div>
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
          <div className="rounded-xl bg-primary/10 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-primary/80">
              Odds ML Engine
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              CatBoost v2.5 • Tempo real
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 glass lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <span className="font-display text-sm font-bold">
            Pulse<span className="text-primary">Lab</span>
          </span>
        </div>
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 glass lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  aria-label="Fechar menu"
                  onClick={() => setOpen(false)}
                  className="mr-3 rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
