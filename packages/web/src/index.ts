import { createContainer } from "@rcdt/core";
import { Router } from "./router.js";
import { registerSessionRoutes } from "./controllers/session-controller.js";
import { registerNavigateRoutes } from "./controllers/navigate-controller.js";
import { registerScriptRoutes } from "./controllers/script-controller.js";
import { registerPerformanceRoutes } from "./controllers/performance-controller.js";
import { registerDevToolsRoutes } from "./controllers/devtools-controller.js";
import { registerConsoleRoutes } from "./controllers/console-controller.js";
import { registerPerfMonitorRoutes } from "./controllers/perf-monitor-controller.js";
import { registerWorkflowRoutes } from "./controllers/workflow-controller.js";
import { resolve } from "path";
import { existsSync } from "fs";

const container = createContainer();
const router = new Router();

// Register API routes
registerSessionRoutes(router, container);
registerNavigateRoutes(router, container);
registerScriptRoutes(router, container);
registerPerformanceRoutes(router, container);
registerDevToolsRoutes(router, container);
registerConsoleRoutes(router, container);
registerPerfMonitorRoutes(router, container);
registerWorkflowRoutes(router, container);

// Serve Angular static files from dist
const frontendDist = resolve(import.meta.dir, "../../frontend/dist/frontend/browser");

const PORT = parseInt(process.env["PORT"] || "3000", 10);

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // API routes
    if (url.pathname.startsWith("/api/")) {
      try {
        const response = await router.handle(req);
        // Add CORS headers to response
        for (const [key, value] of Object.entries(corsHeaders)) {
          response.headers.set(key, value);
        }
        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return Response.json({ error: message }, { status: 500, headers: corsHeaders });
      }
    }

    // Serve static files (Angular frontend)
    if (existsSync(frontendDist)) {
      let filePath = resolve(frontendDist, url.pathname.slice(1));

      // Default to index.html for SPA routing
      if (!existsSync(filePath) || url.pathname === "/") {
        filePath = resolve(frontendDist, "index.html");
      }

      if (existsSync(filePath)) {
        return new Response(Bun.file(filePath));
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`RCDT Web Server running on http://localhost:${server.port}`);
