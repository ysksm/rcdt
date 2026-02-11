import type { IBrowserConnectionRepository } from "../../domain/repositories/browser-connection-repository.js";
import type { PerformanceMonitorSnapshot } from "../../domain/value-objects/performance-monitor-snapshot.js";

export class PerformanceMonitorUseCase {
  constructor(private readonly browserRepo: IBrowserConnectionRepository) {}

  async start(intervalMs: number = 1000): Promise<void> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    await this.browserRepo.startPerformanceMonitor(intervalMs);
  }

  async stop(): Promise<PerformanceMonitorSnapshot> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    return this.browserRepo.stopPerformanceMonitor();
  }

  getSnapshot(): PerformanceMonitorSnapshot | null {
    return this.browserRepo.getPerformanceMonitorSnapshot();
  }
}
