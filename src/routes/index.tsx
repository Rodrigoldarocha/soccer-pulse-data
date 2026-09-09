import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PulseLab — Probabilidades de Futebol" },
      {
        name: "description",
        content: "Dashboard de probabilidades de futebol: BTTS, 1X2 e Over/Under 2.5.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/today" });
  },
});
