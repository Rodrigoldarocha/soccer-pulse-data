import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — PulseLab" },
      { name: "description", content: "Preferências do dashboard de probabilidades." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Preferências do dashboard de probabilidades.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="card-premium space-y-5 p-6"
      >
        <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4 text-xs text-muted-foreground/50">
          <div className="font-display text-sm font-semibold text-foreground">Fuso horário</div>
          <p className="mt-1.5 leading-relaxed">
            As abas Hoje e Amanhã usam o fuso{" "}
            <span className="font-medium text-foreground">America/Sao_Paulo</span>. Partidas
            próximas da meia-noite são classificadas pelo horário de São Paulo.
          </p>
        </div>

        <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4 text-xs text-muted-foreground/50">
          <div className="font-display text-sm font-semibold text-foreground">Modelo</div>
          <p className="mt-1.5 leading-relaxed">
            As probabilidades usam modelo estatístico xG + Poisson, calibrado por liga e mercado
            (Platt Scaling) e combinado em ensemble ponderado pelo Brier Score. As porcentagens são
            exibidas em números inteiros para leitura rápida.
          </p>
        </div>

        <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4 text-xs text-muted-foreground/50">
          <div className="font-display text-sm font-semibold text-foreground">
            Sobre este painel
          </div>
          <p className="mt-1.5 leading-relaxed">
            Este é um dashboard de visualização de probabilidades. Não exibe odds, não monta apostas
            e não faz recomendações de entrada.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
