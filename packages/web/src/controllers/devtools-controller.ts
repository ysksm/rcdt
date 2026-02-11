import type { Router } from "../router.js";
import { TOKENS, type DIContainer, type DevToolsCommandUseCase } from "@rcdt/core";

export function registerDevToolsRoutes(router: Router, container: DIContainer): void {
  const devtoolsUC = container.resolve<DevToolsCommandUseCase>(TOKENS.DevToolsCommandUseCase);

  router.post("/api/devtools/command", async (req) => {
    const { method, params } = (await req.json()) as {
      method: string;
      params?: Record<string, unknown>;
    };
    if (!method) {
      return Response.json({ error: "method is required" }, { status: 400 });
    }
    const result = await devtoolsUC.sendCommand(method, params);
    return Response.json({ result });
  });

  router.post("/api/devtools/enable-domain", async (req) => {
    const { domain, params } = (await req.json()) as {
      domain: string;
      params?: Record<string, unknown>;
    };
    if (!domain) {
      return Response.json({ error: "domain is required" }, { status: 400 });
    }
    await devtoolsUC.enableDomain(domain, params);
    return Response.json({ status: "ok", domain });
  });

  router.get("/api/devtools/screenshot", async (req) => {
    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "png") as "png" | "jpeg" | "webp";
    const buf = await devtoolsUC.captureScreenshot(format);
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": `image/${format}` },
    });
  });

  router.get("/api/devtools/content", async () => {
    const html = await devtoolsUC.getPageContent();
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  });
}
