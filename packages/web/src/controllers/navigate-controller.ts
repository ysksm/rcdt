import type { Router } from "../router.js";
import { TOKENS, type DIContainer, type NavigateUseCase } from "@rcdt/core";

export function registerNavigateRoutes(router: Router, container: DIContainer): void {
  const navigateUC = container.resolve<NavigateUseCase>(TOKENS.NavigateUseCase);

  router.post("/api/navigate", async (req) => {
    const { url } = (await req.json()) as { url: string };
    if (!url) {
      return Response.json({ error: "url is required" }, { status: 400 });
    }
    await navigateUC.execute(url);
    return Response.json({ status: "ok", url });
  });
}
