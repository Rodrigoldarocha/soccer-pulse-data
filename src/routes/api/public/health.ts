import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const { testBzzoiroConnection } = await import("@/lib/bzzoiro/client.server");
        const started = Date.now();
        const upstream = await testBzzoiroConnection();

        return Response.json(
          {
            status: upstream.ok ? "ok" : "degraded",
            upstream: {
              name: "bzzoiro",
              ok: upstream.ok,
              ...(upstream.error ? { error: upstream.error } : {}),
              latencyMs: Date.now() - started,
            },
            timestamp: new Date().toISOString(),
          },
          {
            status: upstream.ok ? 200 : 503,
            headers: { "cache-control": "no-store" },
          },
        );
      },
    },
  },
});
