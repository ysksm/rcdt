import type { Router } from "../router.js";
import {
  TOKENS,
  type DIContainer,
  type NavigateUseCase,
  type MeasurePerformanceUseCase,
  type ConsoleCaptureUseCase,
  type PerformanceMonitorUseCase,
  type ExportFormat,
} from "@rcdt/core";

interface WorkflowRequest {
  url?: string;
  script?: string;
  format?: ExportFormat;
  outputPath?: string;
  waitMs?: number;
  monitorIntervalMs?: number;
}

export function registerWorkflowRoutes(router: Router, container: DIContainer): void {
  const navigateUC = container.resolve<NavigateUseCase>(TOKENS.NavigateUseCase);
  const measureUC = container.resolve<MeasurePerformanceUseCase>(TOKENS.MeasurePerformanceUseCase);
  const consoleUC = container.resolve<ConsoleCaptureUseCase>(TOKENS.ConsoleCaptureUseCase);
  const perfMonitorUC = container.resolve<PerformanceMonitorUseCase>(TOKENS.PerformanceMonitorUseCase);

  router.post("/api/workflow/run", async (req) => {
    const body = (await req.json()) as WorkflowRequest;
    const {
      url,
      script,
      format = "json",
      outputPath,
      waitMs = 2000,
      monitorIntervalMs = 500,
    } = body;

    if (!url && !script) {
      return Response.json({ error: "url or script is required" }, { status: 400 });
    }

    const steps: string[] = [];

    // 1. Start monitoring
    steps.push("Started performance monitor");
    await perfMonitorUC.start(monitorIntervalMs);
    await consoleUC.start();
    steps.push("Started console capture");

    // 2. Execute action (navigate or run script)
    if (url) {
      await navigateUC.execute(url);
      steps.push(`Navigated to: ${url}`);
    }

    if (script) {
      const browserRepo = container.resolve<import("@rcdt/core").IBrowserConnectionRepository>(
        TOKENS.BrowserConnectionRepository,
      );
      await browserRepo.evaluateScript(script);
      steps.push(`Executed script`);
    }

    // 3. Wait for stabilization
    await new Promise((r) => setTimeout(r, waitMs));
    steps.push(`Waited ${waitMs}ms`);

    // 4. Stop monitoring and collect
    const monitorSnapshot = await perfMonitorUC.stop();
    const consoleLogs = await consoleUC.stop();
    steps.push("Stopped monitors");

    // 5. Collect performance metrics
    let exportedPath: string | undefined;
    let metrics;

    if (outputPath) {
      const result = await measureUC.measureAndExport(format, outputPath);
      metrics = result.metrics;
      exportedPath = result.filePath;
      steps.push(`Exported report: ${exportedPath}`);
    } else {
      metrics = await measureUC.measure();
    }

    return Response.json({
      steps,
      performance: metrics.toJSON(),
      monitor: monitorSnapshot.toJSON(),
      consoleLogs: consoleLogs.map((l) => l.toJSON()),
      exportedPath,
    });
  });
}
