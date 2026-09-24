import { createFileRoute } from "@tanstack/react-router";

function checkSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret") ?? request.headers.get("X-Cron-Secret");
  return header === secret;
}

async function runResolve(request: Request) {
  if (!checkSecret(request)) {
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
