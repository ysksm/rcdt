import type { Router } from "../router.js";
import {
  ConnectionConfig,
  TOKENS,
  type DIContainer,
  type SessionManagementUseCase,
} from "@rcdt/core";
import type { SshTunnelConfig, ChromeLaunchConfig } from "@rcdt/core";

interface ConnectBody {
  host: string;
  port: number;
  tabId?: string;
  sshTunnel?: SshTunnelConfig;
  chromeLaunch?: ChromeLaunchConfig;
}

interface ListTabsBody {
  host: string;
  port: number;
  sshTunnel?: SshTunnelConfig;
  chromeLaunch?: ChromeLaunchConfig;
}

export function registerSessionRoutes(router: Router, container: DIContainer): void {
  const sessionUC = container.resolve<SessionManagementUseCase>(TOKENS.SessionManagementUseCase);

  router.post("/api/session/connect", async (req) => {
    const body = (await req.json()) as ConnectBody;
    const config = new ConnectionConfig(
      body.host,
      body.port,
      false,
      body.sshTunnel,
      body.chromeLaunch,
    );

    const session = body.tabId
      ? await sessionUC.connectToTab(config, body.tabId)
      : await sessionUC.connect(config);

    return Response.json({
      ...session.toJSON(),
      scenario: config.scenario,
    });
  });

  router.post("/api/session/disconnect", async () => {
    await sessionUC.disconnect();
    return Response.json({ status: "disconnected" });
  });

  router.get("/api/session", () => {
    const session = sessionUC.getSession();
    if (!session) {
      return Response.json({ status: "no_session" });
    }
    return Response.json({
      ...session.toJSON(),
      scenario: session.config.scenario,
    });
  });

  router.post("/api/tabs", async (req) => {
    const body = (await req.json()) as ListTabsBody;
    const config = new ConnectionConfig(
      body.host,
      body.port,
      false,
      body.sshTunnel,
      body.chromeLaunch,
    );
    const tabs = await sessionUC.listTabs(config);
    return Response.json(tabs);
  });
}
