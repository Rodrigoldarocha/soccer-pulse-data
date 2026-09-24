import { createFileRoute } from "@tanstack/react-router";

function checkSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret") ?? request.headers.get("X-Cron-Secret");
  return header === secret;
}

export const Route = createFileRoute("/api/cron/snapshot")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!checkSecret(request)) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const { spTodayISO, spDateISO } = await import("@/lib/match-dates");
        const { generatePicksSnapshot } = await import("@/lib/picks/snapshot.server");
        const today = await generatePicksSnapshot(spTodayISO());
        const tomorrow = await generatePicksSnapshot(spDateISO(1));
        return Response.json({
          ok: true,
          today: { date: today.date, withValue: today.withValue },
          tomorrow: { date: tomorrow.date, withValue: tomorrow.withValue },
        });
      },
    },
  },
});
