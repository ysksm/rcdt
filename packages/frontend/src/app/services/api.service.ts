import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SshTunnelConfig {
  sshHost: string;
  sshPort: number;
  sshUser: string;
  privateKeyPath?: string;
  remoteHost: string;
  remotePort: number;
  localPort: number;
}

export interface ConnectRequest {
  host: string;
  port: number;
  tabId?: string;
  sshTunnel?: SshTunnelConfig;
}

export interface SessionInfo {
  id?: string;
  status: string;
  currentUrl?: string;
  config?: {
    host: string;
    port: number;
    hasSshTunnel: boolean;
  };
  error?: string;
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  type: string;
  webSocketDebuggerUrl?: string;
}

export interface ScriptResult {
  value: unknown;
  type: string;
  isError: boolean;
  error?: string;
}

export interface PerformanceMetricsResponse {
  timestamp: string;
  url: string;
  timings: { name: string; startTime: number; duration: number }[];
  resources: { url: string; type: string; size: number; duration: number; startTime: number }[];
  memory: { jsHeapUsedSize: number; jsHeapTotalSize: number };
  dom: { nodeCount: number };
  durations: { layout: number; script: number };
  summary: { totalResourceSize: number; totalResourceDuration: number };
}

export interface DevToolsCommandResult {
  result: unknown;
}

export interface ConsoleLogEntry {
  timestamp: string;
  level: string;
  text: string;
  source: string;
  url: string;
  lineNumber: number;
  stackTrace?: string;
}

export interface PerfMonitorSnapshot {
  capturedAt: string;
  duration: number;
  interval: number;
  sampleCount: number;
  samples: { timestamp: number; metrics: Record<string, number> }[];
  summary: {
    avgCpu: number;
    maxCpu: number;
    avgJsHeap: number;
    maxJsHeap: number;
    avgDomNodes: number;
    maxDomNodes: number;
  };
}

export interface WorkflowRequest {
  url?: string;
  script?: string;
  format?: string;
  outputPath?: string;
  waitMs?: number;
  monitorIntervalMs?: number;
}

export interface WorkflowResult {
  steps: string[];
  performance: PerformanceMetricsResponse;
  monitor: PerfMonitorSnapshot;
  consoleLogs: ConsoleLogEntry[];
  exportedPath?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  // Session
  connect(req: ConnectRequest): Observable<SessionInfo> {
    return this.http.post<SessionInfo>(`${this.baseUrl}/session/connect`, req);
  }

  disconnect(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/session/disconnect`, {});
  }

  getSession(): Observable<SessionInfo> {
    return this.http.get<SessionInfo>(`${this.baseUrl}/session`);
  }

  listTabs(host: string, port: number, sshTunnel?: SshTunnelConfig): Observable<BrowserTab[]> {
    return this.http.post<BrowserTab[]>(`${this.baseUrl}/tabs`, { host, port, sshTunnel });
  }

  // Navigation
  navigate(url: string): Observable<{ status: string; url: string }> {
    return this.http.post<{ status: string; url: string }>(`${this.baseUrl}/navigate`, { url });
  }

  // Script
  evalScript(expression: string): Observable<ScriptResult> {
    return this.http.post<ScriptResult>(`${this.baseUrl}/script/eval`, { expression });
  }

  // Performance
  getPerformance(): Observable<PerformanceMetricsResponse> {
    return this.http.get<PerformanceMetricsResponse>(`${this.baseUrl}/performance`);
  }

  exportPerformance(format: string, outputPath: string): Observable<{ filePath: string }> {
    return this.http.post<{ filePath: string }>(`${this.baseUrl}/performance/export`, {
      format,
      outputPath,
    });
  }

  // DevTools
  sendCommand(method: string, params?: Record<string, unknown>): Observable<DevToolsCommandResult> {
    return this.http.post<DevToolsCommandResult>(`${this.baseUrl}/devtools/command`, {
      method,
      params,
    });
  }

  enableDomain(domain: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/devtools/enable-domain`, {
      domain,
    });
  }

  getScreenshotUrl(format: string = 'png'): string {
    return `${this.baseUrl}/devtools/screenshot?format=${format}`;
  }

  // Console
  startConsoleCapture(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/console/start`, {});
  }

  stopConsoleCapture(): Observable<ConsoleLogEntry[]> {
    return this.http.post<ConsoleLogEntry[]>(`${this.baseUrl}/console/stop`, {});
  }

  getConsoleLogs(): Observable<ConsoleLogEntry[]> {
    return this.http.get<ConsoleLogEntry[]>(`${this.baseUrl}/console/logs`);
  }

  clearConsoleLogs(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/console/clear`, {});
  }

  // Performance Monitor
  startPerfMonitor(intervalMs: number = 1000): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/perf-monitor/start`, { intervalMs });
  }

  stopPerfMonitor(): Observable<PerfMonitorSnapshot> {
    return this.http.post<PerfMonitorSnapshot>(`${this.baseUrl}/perf-monitor/stop`, {});
  }

  getPerfMonitorSnapshot(): Observable<PerfMonitorSnapshot> {
    return this.http.get<PerfMonitorSnapshot>(`${this.baseUrl}/perf-monitor/snapshot`);
  }

  // Workflow
  runWorkflow(req: WorkflowRequest): Observable<WorkflowResult> {
    return this.http.post<WorkflowResult>(`${this.baseUrl}/workflow/run`, req);
  }
}
