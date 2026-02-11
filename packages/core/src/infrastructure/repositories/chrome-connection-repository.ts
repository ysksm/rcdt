import CDP from "chrome-remote-interface";
import type { IBrowserConnectionRepository, ConsoleEventCallback } from "../../domain/repositories/browser-connection-repository.js";
import { BrowserTab } from "../../domain/entities/browser-tab.js";
import { ScriptResult } from "../../domain/value-objects/script-result.js";
import { PerformanceMetrics } from "../../domain/value-objects/performance-metrics.js";
import type { TimingMetric, ResourceMetric } from "../../domain/value-objects/performance-metrics.js";
import { ConsoleEntry, type ConsoleLogLevel } from "../../domain/value-objects/console-entry.js";
import { PerformanceMonitorSnapshot, type PerformanceSample } from "../../domain/value-objects/performance-monitor-snapshot.js";

export class ChromeConnectionRepository implements IBrowserConnectionRepository {
  private client: CDP.Client | null = null;

  // Console capture state
  private consoleLogs: ConsoleEntry[] = [];
  private consoleCapturing = false;
  private consoleCallback: ConsoleEventCallback | undefined;

  // Performance monitor state
  private perfMonitorTimer: ReturnType<typeof setInterval> | null = null;
  private perfMonitorSamples: PerformanceSample[] = [];
  private perfMonitorStartTime: number = 0;
  private perfMonitorInterval: number = 1000;

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
    if (this.perfMonitorTimer) {
      clearInterval(this.perfMonitorTimer);
      this.perfMonitorTimer = null;
    }
    this.consoleCapturing = false;
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

    await this.client!.Performance.enable();

    const { metrics: rawMetrics } = await this.client!.Performance.getMetrics();
    const metricsMap = new Map(rawMetrics.map((m: { name: string; value: number }) => [m.name, m.value]));

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

  // ─── Console Capture ───

  async startConsoleCapture(callback?: ConsoleEventCallback): Promise<void> {
    this.ensureConnected();
    this.consoleLogs = [];
    this.consoleCapturing = true;
    this.consoleCallback = callback;

    await this.client!.Log.enable();

    const formatStack = (st: CDP.StackTrace): string =>
      st.callFrames
        .map((f: CDP.StackTrace["callFrames"][0]) => `  at ${f.functionName || "(anonymous)"} (${f.url}:${f.lineNumber}:${f.columnNumber})`)
        .join("\n");

    // Runtime.consoleAPICalled - console.log/error/warn/info/debug
    this.client!.Runtime.consoleAPICalled((params: { type: string; args: CDP.RemoteObject[]; timestamp: number; stackTrace?: CDP.StackTrace }) => {
      if (!this.consoleCapturing) return;

      const text = params.args
        .map((arg: CDP.RemoteObject) => {
          if (arg.value !== undefined) return String(arg.value);
          if (arg.description) return arg.description;
          return `[${arg.type}]`;
        })
        .join(" ");

      const level = this.mapConsoleType(params.type);
      const frame = params.stackTrace?.callFrames[0];

      const entry = new ConsoleEntry(
        new Date(params.timestamp),
        level,
        text,
        "console-api",
        frame?.url || "",
        frame?.lineNumber ?? 0,
        params.stackTrace ? formatStack(params.stackTrace) : undefined,
      );

      this.consoleLogs.push(entry);
      this.consoleCallback?.(entry);
    });

    // Runtime.exceptionThrown - uncaught exceptions
    this.client!.Runtime.exceptionThrown((params: { timestamp: number; exceptionDetails: { text: string; url?: string; lineNumber?: number; stackTrace?: CDP.StackTrace; exception?: { description?: string } } }) => {
      if (!this.consoleCapturing) return;

      const details = params.exceptionDetails;
      const text = details.exception?.description || details.text;

      const entry = new ConsoleEntry(
        new Date(params.timestamp),
        "error",
        text,
        "exception",
        details.url || "",
        details.lineNumber ?? 0,
        details.stackTrace ? formatStack(details.stackTrace) : undefined,
      );

      this.consoleLogs.push(entry);
      this.consoleCallback?.(entry);
    });

    // Log.entryAdded - browser-level logs (network errors, security, etc.)
    this.client!.Log.entryAdded((params: { entry: { source: string; level: string; text: string; timestamp: number; url?: string; lineNumber?: number; stackTrace?: CDP.StackTrace } }) => {
      if (!this.consoleCapturing) return;

      const e = params.entry;
      const entry = new ConsoleEntry(
        new Date(e.timestamp),
        this.mapLogLevel(e.level),
        e.text,
        e.source,
        e.url || "",
        e.lineNumber ?? 0,
        e.stackTrace ? formatStack(e.stackTrace) : undefined,
      );

      this.consoleLogs.push(entry);
      this.consoleCallback?.(entry);
    });
  }

  async stopConsoleCapture(): Promise<ConsoleEntry[]> {
    this.consoleCapturing = false;
    this.consoleCallback = undefined;
    return [...this.consoleLogs];
  }

  getConsoleLogs(): ConsoleEntry[] {
    return [...this.consoleLogs];
  }

  clearConsoleLogs(): void {
    this.consoleLogs = [];
  }

  private mapConsoleType(type: string): ConsoleLogLevel {
    const map: Record<string, ConsoleLogLevel> = {
      log: "log",
      info: "info",
      warning: "warn",
      error: "error",
      debug: "debug",
      trace: "verbose",
      dir: "log",
      table: "log",
      assert: "error",
    };
    return map[type] || "log";
  }

  private mapLogLevel(level: string): ConsoleLogLevel {
    const map: Record<string, ConsoleLogLevel> = {
      verbose: "verbose",
      info: "info",
      warning: "warn",
      error: "error",
    };
    return map[level] || "log";
  }

  // ─── Performance Monitor ───

  async startPerformanceMonitor(intervalMs: number = 1000): Promise<void> {
    this.ensureConnected();
    await this.client!.Performance.enable();

    this.perfMonitorSamples = [];
    this.perfMonitorInterval = intervalMs;
    this.perfMonitorStartTime = Date.now();

    let prevMetricsMap: Map<string, number> | null = null;

    this.perfMonitorTimer = setInterval(async () => {
      if (!this.client) return;

      try {
        const { metrics: rawMetrics } = await this.client!.Performance.getMetrics();
        const currentMap = new Map<string, number>(
          rawMetrics.map((m: { name: string; value: number }) => [m.name, m.value] as [string, number]),
        );

        const sample: Record<string, number> = {};
        for (const [key, value] of currentMap) {
          sample[key] = value;
        }

        // Compute per-interval deltas for cumulative counters
        if (prevMetricsMap) {
          const taskDelta = (currentMap.get("TaskDuration") ?? 0) - (prevMetricsMap.get("TaskDuration") ?? 0);
          sample["TaskDuration"] = taskDelta / (intervalMs / 1000);
          sample["LayoutCount"] = (currentMap.get("LayoutCount") ?? 0) - (prevMetricsMap.get("LayoutCount") ?? 0);
          sample["RecalcStyleCount"] = (currentMap.get("RecalcStyleCount") ?? 0) - (prevMetricsMap.get("RecalcStyleCount") ?? 0);
        }

        prevMetricsMap = currentMap;

        this.perfMonitorSamples.push({
          timestamp: Date.now(),
          metrics: sample,
        });
      } catch {
        // connection may have closed
      }
    }, intervalMs);
  }

  async stopPerformanceMonitor(): Promise<PerformanceMonitorSnapshot> {
    if (this.perfMonitorTimer) {
      clearInterval(this.perfMonitorTimer);
      this.perfMonitorTimer = null;
    }

    const snapshot = new PerformanceMonitorSnapshot(
      new Date(),
      [...this.perfMonitorSamples],
      Date.now() - this.perfMonitorStartTime,
      this.perfMonitorInterval,
    );

    this.perfMonitorSamples = [];
    return snapshot;
  }

  getPerformanceMonitorSnapshot(): PerformanceMonitorSnapshot | null {
    if (this.perfMonitorSamples.length === 0) return null;

    return new PerformanceMonitorSnapshot(
      new Date(),
      [...this.perfMonitorSamples],
      Date.now() - this.perfMonitorStartTime,
      this.perfMonitorInterval,
    );
  }

  private ensureConnected(): void {
    if (!this.client) {
      throw new Error("Not connected to Chrome. Call connect() first.");
    }
  }
}
