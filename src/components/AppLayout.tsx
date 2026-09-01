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
  ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/today", label: "Palpites do Dia", icon: CalendarDays },
  { to: "/multiples", label: "Múltiplas", icon: Layers3 },
  { to: "/live", label: "Ao Vivo", icon: Radio },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/settings", label: "Configurações", icon: SettingsIcon },
] as const;

const NavItems = memo(function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map((item, i) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 animate-fade-in-up",
              `stagger-${Math.min(i + 1, 6)}`,
              active
                ? "bg-primary/12 text-primary"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04]",
            )}
          >
            {active && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-primary/12"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <Icon className="relative z-10 h-[18px] w-[18px]" />
            <span className="relative z-10">{item.label}</span>
            {active && (
              <ChevronRight className="relative z-10 ml-auto h-3.5 w-3.5 text-primary/60" />
            )}
          </Link>
        );
      })}
    </nav>
  );
});

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Zap className="h-5 w-5" />
        <div className="absolute inset-0 rounded-xl bg-primary/10 blur-md" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          Pulse<span className="text-gradient">Lab</span>
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/50">
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/50 bg-sidebar/80 backdrop-blur-xl lg:block">
        <Brand />
        <NavItems />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="rounded-xl border border-primary/10 bg-primary/[0.06] px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary/70">
              ML Engine
            </div>
            <div className="mt-1 text-xs text-muted-foreground/60">
              Poisson + Ensemble v2.5
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 glass-subtle lg:hidden">
        <div className="flex items-center gap-2.5">
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
          className="rounded-lg p-2 text-muted-foreground/60 hover:bg-white/[0.06] hover:text-foreground transition-all duration-200"
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
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/70 glass lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border/50 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  aria-label="Fechar menu"
                  onClick={() => setOpen(false)}
                  className="mr-3 rounded-lg p-2 text-muted-foreground/60 hover:bg-white/[0.06] hover:text-foreground transition-all duration-200"
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
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
