import { createServerFn } from "@tanstack/react-start";
import { recomputeAccuracyMetrics } from "./accuracy-store";
import { invalidateCaches } from "./pipeline";

export const triggerRecalibration = createServerFn({ method: "POST" }).handler(async () => {
  try {
    await recomputeAccuracyMetrics();
    invalidateCaches();
    return { ok: true, message: "Recalibration complete" };
  } catch (err) {
    console.error("[ML Recalibrate] Failed:", err);
    return { ok: false, message: String(err) };
  }
});
