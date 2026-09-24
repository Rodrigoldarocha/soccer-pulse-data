import { createServerFn } from "@tanstack/react-start";
import { loadAccuracyMetrics } from "./accuracy-store";

export const getAccuracyMetrics = createServerFn({ method: "GET" }).handler(async () => {
  const metrics = await loadAccuracyMetrics();
  return { metrics };
});
