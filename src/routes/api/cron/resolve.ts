import { createFileRoute } from "@tanstack/react-router";
import { checkCronSecret } from "@/lib/cron-auth";

async function runResolve(request: Request) {
  if (!checkCronSecret(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { resolveFinishedEvents } = await import("@/lib/ml/resolver.server");
  const result = await resolveFinishedEvents({ daysBack: 14 });
  return Response.json({ ok: true, ...result });
}

export const Route = createFileRoute("/api/cron/resolve")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => runResolve(request),
    },
  },
});
