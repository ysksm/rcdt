import type { PerformanceMetrics } from "../value-objects/performance-metrics.js";

export type ExportFormat = "json" | "csv" | "html";

/**
 * Repository interface for exporting performance metrics (DIP).
 */
export interface IMetricsExportRepository {
  export(metrics: PerformanceMetrics, format: ExportFormat, outputPath: string): Promise<string>;
}
