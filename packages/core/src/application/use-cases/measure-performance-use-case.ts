import type { IBrowserConnectionRepository } from "../../domain/repositories/browser-connection-repository.js";
import type { IMetricsExportRepository, ExportFormat } from "../../domain/repositories/metrics-export-repository.js";
import type { PerformanceMetrics } from "../../domain/value-objects/performance-metrics.js";

export class MeasurePerformanceUseCase {
  constructor(
    private readonly browserRepo: IBrowserConnectionRepository,
    private readonly metricsExportRepo: IMetricsExportRepository,
  ) {}

  async measure(): Promise<PerformanceMetrics> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    return this.browserRepo.collectPerformanceMetrics();
  }

  async measureAndExport(
    format: ExportFormat,
    outputPath: string,
  ): Promise<{ metrics: PerformanceMetrics; filePath: string }> {
    const metrics = await this.measure();
    const filePath = await this.metricsExportRepo.export(metrics, format, outputPath);
    return { metrics, filePath };
  }
}
