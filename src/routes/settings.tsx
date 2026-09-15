import { createFileRoute } from "@tanstack/react-router";
import { Clock, Cpu, Eye, Info, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — PulseLab" },
      { name: "description", content: "Preferências do dashboard de probabilidades." },
    ],
  }),
  component: SettingsPage,
});

function SettingsCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="mt-3 text-xs leading-relaxed text-muted-foreground/60">{children}</div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Preferências do dashboard de probabilidades.
        </p>
      </header>

      <div className="space-y-4">
        <SettingsCard icon={Clock} title="Fuso horário">
          <p>
            As abas Hoje e Amanhã usam o fuso{" "}
            <span className="font-medium text-foreground">America/Sao_Paulo</span>. Partidas
            próximas da meia-noite são classificadas pelo horário de São Paulo.
          </p>
        </SettingsCard>

        <SettingsCard icon={Cpu} title="Modelo">
          <p>
            As probabilidades usam modelo estatístico xG + Poisson, calibrado por liga e mercado
            (Platt Scaling) e combinado em ensemble ponderado pelo Brier Score. As porcentagens são
            exibidas em números inteiros para leitura rápida.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded border border-border/50 bg-white/[0.02] px-3 py-2 text-center">
              <div className="font-display text-base font-bold text-foreground">Poisson</div>
              <div className="text-[10px] text-muted-foreground/50">Base</div>
            </div>
            <div className="rounded border border-border/50 bg-white/[0.02] px-3 py-2 text-center">
              <div className="font-display text-base font-bold text-foreground">Platt</div>
              <div className="text-[10px] text-muted-foreground/50">Calibração</div>
            </div>
            <div className="rounded border border-border/50 bg-white/[0.02] px-3 py-2 text-center">
              <div className="font-display text-base font-bold text-foreground">Ensemble</div>
              <div className="text-[10px] text-muted-foreground/50">Combinação</div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon={Eye} title="Hierarquia visual">
          <p>
            As probabilidades seguem hierarquia visual por confiança do modelo — não é recomendação
            de aposta.
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-foreground">≥65%</span>
              <span className="text-muted-foreground/50">— Forte</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-chart-4" />
              <span className="text-foreground">50–64%</span>
              <span className="text-muted-foreground/50">— Moderado</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <span className="text-foreground">&lt;50%</span>
              <span className="text-muted-foreground/50">— Neutro</span>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon={Info} title="Sobre este painel">
          <p>
            Este é um dashboard de visualização de probabilidades. Não exibe odds, não monta apostas
            e não faz recomendações de entrada.
          </p>
          <p className="mt-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Ver no GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </SettingsCard>
      </div>
    </div>
  );
}
