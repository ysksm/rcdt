/**
 * Minimal DI container for dependency injection.
 */
export class DIContainer {
  private readonly registry = new Map<symbol, unknown>();

  register<T>(token: symbol, instance: T): void {
    this.registry.set(token, instance);
  }

  resolve<T>(token: symbol): T {
    const instance = this.registry.get(token);
    if (!instance) {
      throw new Error(`No binding found for token: ${token.toString()}`);
    }
    return instance as T;
  }

  has(token: symbol): boolean {
    return this.registry.has(token);
  }
}

// Injection tokens
export const TOKENS = {
  BrowserConnectionRepository: Symbol("IBrowserConnectionRepository"),
  SshTunnelRepository: Symbol("ISshTunnelRepository"),
  MetricsExportRepository: Symbol("IMetricsExportRepository"),
  // Use cases
  NavigateUseCase: Symbol("NavigateUseCase"),
  ExecuteScriptUseCase: Symbol("ExecuteScriptUseCase"),
  MeasurePerformanceUseCase: Symbol("MeasurePerformanceUseCase"),
  DevToolsCommandUseCase: Symbol("DevToolsCommandUseCase"),
  SessionManagementUseCase: Symbol("SessionManagementUseCase"),
} as const;
