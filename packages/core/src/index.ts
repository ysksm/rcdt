// Domain - Entities
export { DebugSession } from "./domain/entities/debug-session.js";
export type { SessionStatus } from "./domain/entities/debug-session.js";
export { BrowserTab } from "./domain/entities/browser-tab.js";

// Domain - Value Objects
export { ConnectionConfig } from "./domain/value-objects/connection-config.js";
export type { SshTunnelConfig } from "./domain/value-objects/connection-config.js";
export type { ChromeLaunchConfig } from "./domain/value-objects/chrome-launch-config.js";
export { PerformanceMetrics } from "./domain/value-objects/performance-metrics.js";
export type { TimingMetric, ResourceMetric } from "./domain/value-objects/performance-metrics.js";
export { ScriptResult } from "./domain/value-objects/script-result.js";
export { ConsoleEntry } from "./domain/value-objects/console-entry.js";
export type { ConsoleLogLevel } from "./domain/value-objects/console-entry.js";
export { PerformanceMonitorSnapshot } from "./domain/value-objects/performance-monitor-snapshot.js";
export type { PerformanceSample } from "./domain/value-objects/performance-monitor-snapshot.js";

// Domain - Repository Interfaces (DIP)
export type { IBrowserConnectionRepository, ConsoleEventCallback } from "./domain/repositories/browser-connection-repository.js";
export type { ISshTunnelRepository } from "./domain/repositories/ssh-tunnel-repository.js";
export type { IMetricsExportRepository, ExportFormat } from "./domain/repositories/metrics-export-repository.js";
export type { IChromeLauncherRepository } from "./domain/repositories/chrome-launcher-repository.js";

// Application - Use Cases
export { SessionManagementUseCase } from "./application/use-cases/session-management-use-case.js";
export { NavigateUseCase } from "./application/use-cases/navigate-use-case.js";
export { ExecuteScriptUseCase } from "./application/use-cases/execute-script-use-case.js";
export { MeasurePerformanceUseCase } from "./application/use-cases/measure-performance-use-case.js";
export { DevToolsCommandUseCase } from "./application/use-cases/devtools-command-use-case.js";
export { ConsoleCaptureUseCase } from "./application/use-cases/console-capture-use-case.js";
export { PerformanceMonitorUseCase } from "./application/use-cases/performance-monitor-use-case.js";

// DI
export { DIContainer, TOKENS } from "./di/container.js";

// Infrastructure setup
export { createContainer } from "./infrastructure/setup.js";
