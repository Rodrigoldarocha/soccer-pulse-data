import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PulseLab — Palpites de Valor" },
      {
        name: "description",
        content: "Palpites de valor do dia, múltiplas e probabilidades calibradas.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/picks" });
  },
});
