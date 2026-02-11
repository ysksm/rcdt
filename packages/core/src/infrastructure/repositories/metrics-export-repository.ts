import { writeFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import type { IMetricsExportRepository, ExportFormat } from "../../domain/repositories/metrics-export-repository.js";
import type { PerformanceMetrics } from "../../domain/value-objects/performance-metrics.js";

export class MetricsExportRepository implements IMetricsExportRepository {
  async export(
    metrics: PerformanceMetrics,
    format: ExportFormat,
    outputPath: string,
  ): Promise<string> {
    const fullPath = resolve(outputPath);
    await mkdir(dirname(fullPath), { recursive: true });

    let content: string;

    switch (format) {
      case "json":
        content = JSON.stringify(metrics.toJSON(), null, 2);
        break;
      case "csv":
        content = this.toCsv(metrics);
        break;
      case "html":
        content = this.toHtml(metrics);
        break;
    }

    await writeFile(fullPath, content, "utf-8");
    return fullPath;
  }

  private toCsv(metrics: PerformanceMetrics): string {
    const lines: string[] = [];

    // Summary
    lines.push("Section,Key,Value");
    lines.push(`Summary,URL,${metrics.url}`);
    lines.push(`Summary,Timestamp,${metrics.timestamp.toISOString()}`);
    lines.push(`Memory,JSHeapUsed,${metrics.jsHeapUsedSize}`);
    lines.push(`Memory,JSHeapTotal,${metrics.jsHeapTotalSize}`);
    lines.push(`DOM,NodeCount,${metrics.domNodes}`);
    lines.push(`Duration,Layout,${metrics.layoutDuration}`);
    lines.push(`Duration,Script,${metrics.scriptDuration}`);
    lines.push("");

    // Timings
    lines.push("Timing Name,Start Time,Duration");
    for (const t of metrics.timings) {
      lines.push(`${t.name},${t.startTime},${t.duration}`);
    }
    lines.push("");

    // Resources
    lines.push("Resource URL,Type,Size,Duration,Start Time");
    for (const r of metrics.resources) {
      lines.push(`"${r.url}",${r.type},${r.size},${r.duration},${r.startTime}`);
    }

    return lines.join("\n");
  }

  private toHtml(metrics: PerformanceMetrics): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Performance Report - ${metrics.url}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .metric-card { display: inline-block; padding: 16px; margin: 8px; border: 1px solid #ddd; border-radius: 8px; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .metric-label { color: #666; font-size: 14px; }
    h1, h2 { color: #333; }
  </style>
</head>
<body>
  <h1>Performance Report</h1>
  <p><strong>URL:</strong> ${metrics.url}</p>
  <p><strong>Timestamp:</strong> ${metrics.timestamp.toISOString()}</p>

  <h2>Summary</h2>
  <div>
    <div class="metric-card">
      <div class="metric-value">${(metrics.jsHeapUsedSize / 1048576).toFixed(2)} MB</div>
      <div class="metric-label">JS Heap Used</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.domNodes}</div>
      <div class="metric-label">DOM Nodes</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${(metrics.layoutDuration * 1000).toFixed(2)} ms</div>
      <div class="metric-label">Layout Duration</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${(metrics.scriptDuration * 1000).toFixed(2)} ms</div>
      <div class="metric-label">Script Duration</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.resources.length}</div>
      <div class="metric-label">Resources</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${(metrics.totalResourceSize / 1024).toFixed(2)} KB</div>
      <div class="metric-label">Total Transfer</div>
    </div>
  </div>

  <h2>Resources</h2>
  <table>
    <thead><tr><th>URL</th><th>Type</th><th>Size</th><th>Duration</th></tr></thead>
    <tbody>
      ${metrics.resources.map((r) => `<tr><td>${r.url}</td><td>${r.type}</td><td>${(r.size / 1024).toFixed(2)} KB</td><td>${r.duration.toFixed(2)} ms</td></tr>`).join("\n      ")}
    </tbody>
  </table>
</body>
</html>`;
  }
}
