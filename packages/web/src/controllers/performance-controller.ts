import type { Router } from "../router.js";
import { TOKENS, type DIContainer, type MeasurePerformanceUseCase, type ExportFormat } from "@rcdt/core";

export function registerPerformanceRoutes(router: Router, container: DIContainer): void {
  const measureUC = container.resolve<MeasurePerformanceUseCase>(TOKENS.MeasurePerformanceUseCase);

  router.get("/api/performance", async () => {
    const metrics = await measureUC.measure();
    return Response.json(metrics.toJSON());
  });

  router.post("/api/performance/export", async (req) => {
    const { format, outputPath } = (await req.json()) as {
      format: ExportFormat;
      outputPath: string;
    };
    if (!format || !outputPath) {
      return Response.json({ error: "format and outputPath are required" }, { status: 400 });
    }
    const { metrics, filePath } = await measureUC.measureAndExport(format, outputPath);
    return Response.json({
      filePath,
      summary: {
        url: metrics.url,
        jsHeapUsed: metrics.jsHeapUsedSize,
        domNodes: metrics.domNodes,
        resourceCount: metrics.resources.length,
      },
    });
  });
}
