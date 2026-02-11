import type { Router } from "../router.js";
import { TOKENS, type DIContainer, type ConsoleCaptureUseCase } from "@rcdt/core";

export function registerConsoleRoutes(router: Router, container: DIContainer): void {
  const consoleUC = container.resolve<ConsoleCaptureUseCase>(TOKENS.ConsoleCaptureUseCase);

  router.post("/api/console/start", async () => {
    await consoleUC.start();
    return Response.json({ status: "capturing" });
  });

  router.post("/api/console/stop", async () => {
    const logs = await consoleUC.stop();
    return Response.json(logs.map((l) => l.toJSON()));
  });

  router.get("/api/console/logs", () => {
    const logs = consoleUC.getLogs();
    return Response.json(logs.map((l) => l.toJSON()));
  });

  router.post("/api/console/clear", () => {
    consoleUC.clear();
    return Response.json({ status: "cleared" });
  });

  router.post("/api/console/export", async (req) => {
    const { outputPath } = (await req.json()) as { outputPath: string };
    if (!outputPath) {
      return Response.json({ error: "outputPath is required" }, { status: 400 });
    }
    const logs = consoleUC.getLogs();
    const data = JSON.stringify(logs.map((l) => l.toJSON()), null, 2);
    await Bun.write(outputPath, data);
    return Response.json({ filePath: outputPath, count: logs.length });
  });
}
