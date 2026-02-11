import CDP from "chrome-remote-interface";
import type { IBrowserConnectionRepository } from "../../domain/repositories/browser-connection-repository.js";
import { BrowserTab } from "../../domain/entities/browser-tab.js";
import { ScriptResult } from "../../domain/value-objects/script-result.js";
import { PerformanceMetrics } from "../../domain/value-objects/performance-metrics.js";
import type { TimingMetric, ResourceMetric } from "../../domain/value-objects/performance-metrics.js";

export class ChromeConnectionRepository implements IBrowserConnectionRepository {
  private client: CDP.Client | null = null;

  async connect(host: string, port: number, tabId?: string): Promise<void> {
    const options: CDP.Options = { host, port };
    if (tabId) {
      options.target = tabId;
    }
    this.client = await CDP(options);

    // Enable essential domains
    await Promise.all([
      this.client.Page.enable(),
      this.client.Runtime.enable(),
      this.client.Network.enable(),
    ]);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  async listTabs(host: string, port: number): Promise<BrowserTab[]> {
    const targets = await CDP.List({ host, port });
    return targets.map(
      (t: { id: string; title: string; url: string; type: string; webSocketDebuggerUrl?: string }) =>
        new BrowserTab(t.id, t.title, t.url, t.type, t.webSocketDebuggerUrl),
    );
  }

  async navigateTo(url: string): Promise<void> {
    this.ensureConnected();
    await this.client!.Page.navigate({ url });
    await this.client!.Page.loadEventFired();
  }

  async evaluateScript(expression: string): Promise<ScriptResult> {
    this.ensureConnected();
    const result = await this.client!.Runtime.evaluate({
      expression,
      returnByValue: true,
      awaitPromise: true,
    });

    if (result.exceptionDetails) {
      return new ScriptResult(
        undefined,
        "error",
        result.exceptionDetails.text ||
          result.exceptionDetails.exception?.description ||
          "Unknown error",
      );
    }

    return new ScriptResult(result.result.value, result.result.type);
  }

  async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    this.ensureConnected();

    // Enable Performance domain
    await this.client!.Performance.enable();

    // Get performance metrics from CDP
    const { metrics: rawMetrics } = await this.client!.Performance.getMetrics();
    const metricsMap = new Map(rawMetrics.map((m: { name: string; value: number }) => [m.name, m.value]));

    // Get navigation timing via JS
    const timingResult = await this.client!.Runtime.evaluate({
      expression: `JSON.stringify(performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource')))`,
      returnByValue: true,
    });

    let timings: TimingMetric[] = [];
    let resources: ResourceMetric[] = [];

    if (timingResult.result.value) {
      try {
        const entries = JSON.parse(timingResult.result.value as string);
        for (const entry of entries) {
          if (entry.entryType === "navigation") {
            timings.push({
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration,
            });
          } else if (entry.entryType === "resource") {
            resources.push({
              url: entry.name,
              type: entry.initiatorType || "other",
              size: entry.transferSize || 0,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    // Get current URL
    const urlResult = await this.client!.Runtime.evaluate({
      expression: "location.href",
      returnByValue: true,
    });

    return new PerformanceMetrics(
      new Date(),
      (urlResult.result.value as string) || "",
      timings,
      resources,
      (metricsMap.get("JSHeapUsedSize") as number) || 0,
      (metricsMap.get("JSHeapTotalSize") as number) || 0,
      (metricsMap.get("Nodes") as number) || 0,
      (metricsMap.get("LayoutDuration") as number) || 0,
      (metricsMap.get("ScriptDuration") as number) || 0,
    );
  }

  async getPageContent(): Promise<string> {
    this.ensureConnected();
    const result = await this.client!.Runtime.evaluate({
      expression: "document.documentElement.outerHTML",
      returnByValue: true,
    });
    return (result.result.value as string) || "";
  }

  async captureScreenshot(format: "png" | "jpeg" | "webp" = "png"): Promise<Buffer> {
    this.ensureConnected();
    const { data } = await this.client!.Page.captureScreenshot({ format });
    return Buffer.from(data, "base64");
  }

  async enableDomain(domain: string, params?: Record<string, unknown>): Promise<void> {
    this.ensureConnected();
    await this.client!.send(`${domain}.enable` as any, params || {});
  }

  async sendCommand(method: string, params?: Record<string, unknown>): Promise<unknown> {
    this.ensureConnected();
    return this.client!.send(method as any, params || {});
  }

  private ensureConnected(): void {
    if (!this.client) {
      throw new Error("Not connected to Chrome. Call connect() first.");
    }
  }
}
