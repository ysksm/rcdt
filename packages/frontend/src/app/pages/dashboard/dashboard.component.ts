import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  ApiService,
  type SessionInfo,
  type BrowserTab,
  type ScriptResult,
  type PerformanceMetricsResponse,
  type SshTunnelConfig,
} from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  // Connection
  host = signal('127.0.0.1');
  port = signal(9222);
  session = signal<SessionInfo | null>(null);
  tabs = signal<BrowserTab[]>([]);

  // SSH Tunnel
  useSshTunnel = signal(false);
  sshHost = signal('');
  sshPort = signal(22);
  sshUser = signal('root');
  sshKeyPath = signal('');
  remoteHost = signal('127.0.0.1');
  remotePort = signal(9222);
  localPort = signal(9223);

  // Navigation
  navUrl = signal('');

  // Script
  scriptExpression = signal('');
  scriptResult = signal<ScriptResult | null>(null);

  // Performance
  perfMetrics = signal<PerformanceMetricsResponse | null>(null);
  exportFormat = signal('json');
  exportPath = signal('./perf-report');

  // DevTools
  devtoolsMethod = signal('');
  devtoolsParams = signal('{}');
  devtoolsResult = signal<unknown>(null);

  // UI state
  loading = signal(false);
  error = signal('');
  activeTab = signal<'navigate' | 'script' | 'performance' | 'devtools' | 'screenshot'>(
    'navigate',
  );
  screenshotUrl = signal('');

  constructor(private api: ApiService) {}

  private getSshConfig(): SshTunnelConfig | undefined {
    if (!this.useSshTunnel()) return undefined;
    return {
      sshHost: this.sshHost(),
      sshPort: this.sshPort(),
      sshUser: this.sshUser(),
      privateKeyPath: this.sshKeyPath() || undefined,
      remoteHost: this.remoteHost(),
      remotePort: this.remotePort(),
      localPort: this.localPort(),
    };
  }

  listTabs(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.listTabs(this.host(), this.port(), this.getSshConfig()).subscribe({
      next: (tabs) => {
        this.tabs.set(tabs);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message);
        this.loading.set(false);
      },
    });
  }

  connect(tabId?: string): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .connect({
        host: this.host(),
        port: this.port(),
        tabId,
        sshTunnel: this.getSshConfig(),
      })
      .subscribe({
        next: (session) => {
          this.session.set(session);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.error || err.message);
          this.loading.set(false);
        },
      });
  }

  disconnect(): void {
    this.loading.set(true);
    this.api.disconnect().subscribe({
      next: () => {
        this.session.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message);
        this.loading.set(false);
      },
    });
  }

  navigate(): void {
    if (!this.navUrl()) return;
    this.loading.set(true);
    this.error.set('');
    this.api.navigate(this.navUrl()).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message);
        this.loading.set(false);
      },
    });
  }

  evalScript(): void {
    if (!this.scriptExpression()) return;
    this.loading.set(true);
    this.error.set('');
    this.api.evalScript(this.scriptExpression()).subscribe({
      next: (result) => {
        this.scriptResult.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message);
        this.loading.set(false);
      },
    });
  }

  measurePerformance(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getPerformance().subscribe({
      next: (metrics) => {
        this.perfMetrics.set(metrics);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message);
        this.loading.set(false);
      },
    });
  }

  exportPerformance(): void {
    this.loading.set(true);
    this.error.set('');
    const ext = this.exportFormat();
    const path = `${this.exportPath()}.${ext}`;
    this.api.exportPerformance(ext, path).subscribe({
      next: (result) => {
        this.error.set('');
        alert(`Exported to: ${result.filePath}`);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message);
        this.loading.set(false);
      },
    });
  }

  sendDevToolsCommand(): void {
    if (!this.devtoolsMethod()) return;
    this.loading.set(true);
    this.error.set('');
    let params: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(this.devtoolsParams());
      params = Object.keys(parsed).length > 0 ? parsed : undefined;
    } catch {
      this.error.set('Invalid JSON params');
      this.loading.set(false);
      return;
    }
    this.api.sendCommand(this.devtoolsMethod(), params).subscribe({
      next: (result) => {
        this.devtoolsResult.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message);
        this.loading.set(false);
      },
    });
  }

  captureScreenshot(): void {
    this.screenshotUrl.set(this.api.getScreenshotUrl('png') + '&t=' + Date.now());
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  formatMs(seconds: number): string {
    return (seconds * 1000).toFixed(2) + ' ms';
  }

  formatJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }
}
