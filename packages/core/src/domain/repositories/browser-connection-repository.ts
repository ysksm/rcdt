import type { BrowserTab } from "../entities/browser-tab.js";
import type { ScriptResult } from "../value-objects/script-result.js";
import type { PerformanceMetrics } from "../value-objects/performance-metrics.js";

/**
 * Repository interface for browser connection operations (DIP).
 * Infrastructure layer provides the concrete implementation.
 */
export interface IBrowserConnectionRepository {
  connect(host: string, port: number, tabId?: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  listTabs(host: string, port: number): Promise<BrowserTab[]>;
  navigateTo(url: string): Promise<void>;
  evaluateScript(expression: string): Promise<ScriptResult>;
  collectPerformanceMetrics(): Promise<PerformanceMetrics>;
  getPageContent(): Promise<string>;
  captureScreenshot(format?: "png" | "jpeg" | "webp"): Promise<Buffer>;
  enableDomain(domain: string, params?: Record<string, unknown>): Promise<void>;
  sendCommand(method: string, params?: Record<string, unknown>): Promise<unknown>;
}
