import type { Router } from "../router.js";
import { TOKENS, type DIContainer, type ExecuteScriptUseCase } from "@rcdt/core";

export function registerScriptRoutes(router: Router, container: DIContainer): void {
  const executeScriptUC = container.resolve<ExecuteScriptUseCase>(TOKENS.ExecuteScriptUseCase);

  router.post("/api/script/eval", async (req) => {
    const { expression } = (await req.json()) as { expression: string };
    if (!expression) {
      return Response.json({ error: "expression is required" }, { status: 400 });
    }
    const result = await executeScriptUC.execute(expression);
    return Response.json(result.toJSON());
  });
}
