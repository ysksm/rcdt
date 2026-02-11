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
}
