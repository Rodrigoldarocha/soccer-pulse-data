import { createFileRoute } from "@tanstack/react-router";
import { checkCronSecret } from "@/lib/cron-auth";

export const Route = createFileRoute("/api/cron/recalibrate")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!checkCronSecret(request)) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const { recomputeAccuracyMetrics } = await import("@/lib/ml/accuracy-store");
        await recomputeAccuracyMetrics();
        const { invalidateCaches } = await import("@/lib/ml/pipeline");
        invalidateCaches();
        return Response.json({ ok: true });
      },
    },
  },
});
