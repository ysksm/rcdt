import type { Router } from "../router.js";
import { TOKENS, type DIContainer, type PerformanceMonitorUseCase } from "@rcdt/core";

export function registerPerfMonitorRoutes(router: Router, container: DIContainer): void {
  const perfMonitorUC = container.resolve<PerformanceMonitorUseCase>(TOKENS.PerformanceMonitorUseCase);

  router.post("/api/perf-monitor/start", async (req) => {
    const { intervalMs } = (await req.json()) as { intervalMs?: number };
    await perfMonitorUC.start(intervalMs || 1000);
    return Response.json({ status: "monitoring", intervalMs: intervalMs || 1000 });
  });

  router.post("/api/perf-monitor/stop", async () => {
    const snapshot = await perfMonitorUC.stop();
    return Response.json(snapshot.toJSON());
  });

  router.get("/api/perf-monitor/snapshot", () => {
    const snapshot = perfMonitorUC.getSnapshot();
    if (!snapshot) {
      return Response.json({ status: "not_monitoring" });
    }
    return Response.json(snapshot.toJSON());
  });

  router.post("/api/perf-monitor/export", async (req) => {
    const { outputPath } = (await req.json()) as { outputPath: string };
    if (!outputPath) {
      return Response.json({ error: "outputPath is required" }, { status: 400 });
    }
    const snapshot = perfMonitorUC.getSnapshot();
    if (!snapshot) {
      return Response.json({ error: "No monitoring data available" }, { status: 400 });
    }
    const data = JSON.stringify(snapshot.toJSON(), null, 2);
    await Bun.write(outputPath, data);
    return Response.json({ filePath: outputPath, sampleCount: snapshot.samples.length });
  });
}
