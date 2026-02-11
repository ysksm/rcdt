import { DIContainer, TOKENS } from "../di/container.js";
import { ChromeConnectionRepository } from "./repositories/chrome-connection-repository.js";
import { SshTunnelRepository } from "./repositories/ssh-tunnel-repository.js";
import { MetricsExportRepository } from "./repositories/metrics-export-repository.js";
import { SessionManagementUseCase } from "../application/use-cases/session-management-use-case.js";
import { NavigateUseCase } from "../application/use-cases/navigate-use-case.js";
import { ExecuteScriptUseCase } from "../application/use-cases/execute-script-use-case.js";
import { MeasurePerformanceUseCase } from "../application/use-cases/measure-performance-use-case.js";
import { DevToolsCommandUseCase } from "../application/use-cases/devtools-command-use-case.js";
import { ConsoleCaptureUseCase } from "../application/use-cases/console-capture-use-case.js";
import { PerformanceMonitorUseCase } from "../application/use-cases/performance-monitor-use-case.js";

/**
 * Wire up all dependencies and return a configured DI container.
 */
export function createContainer(): DIContainer {
  const container = new DIContainer();

  // Infrastructure (Repository implementations)
  const browserRepo = new ChromeConnectionRepository();
  const sshTunnelRepo = new SshTunnelRepository();
  const metricsExportRepo = new MetricsExportRepository();

  container.register(TOKENS.BrowserConnectionRepository, browserRepo);
  container.register(TOKENS.SshTunnelRepository, sshTunnelRepo);
  container.register(TOKENS.MetricsExportRepository, metricsExportRepo);

  // Application (Use Cases)
  container.register(TOKENS.SessionManagementUseCase, new SessionManagementUseCase(browserRepo, sshTunnelRepo));
  container.register(TOKENS.NavigateUseCase, new NavigateUseCase(browserRepo));
  container.register(TOKENS.ExecuteScriptUseCase, new ExecuteScriptUseCase(browserRepo));
  container.register(TOKENS.MeasurePerformanceUseCase, new MeasurePerformanceUseCase(browserRepo, metricsExportRepo));
  container.register(TOKENS.DevToolsCommandUseCase, new DevToolsCommandUseCase(browserRepo));
  container.register(TOKENS.ConsoleCaptureUseCase, new ConsoleCaptureUseCase(browserRepo));
  container.register(TOKENS.PerformanceMonitorUseCase, new PerformanceMonitorUseCase(browserRepo));

  return container;
}
