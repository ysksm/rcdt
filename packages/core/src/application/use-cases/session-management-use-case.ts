import { DebugSession } from "../../domain/entities/debug-session.js";
import type { BrowserTab } from "../../domain/entities/browser-tab.js";
import type { ConnectionConfig } from "../../domain/value-objects/connection-config.js";
import type { IBrowserConnectionRepository } from "../../domain/repositories/browser-connection-repository.js";
import type { ISshTunnelRepository } from "../../domain/repositories/ssh-tunnel-repository.js";

export class SessionManagementUseCase {
  private session: DebugSession | null = null;

  constructor(
    private readonly browserRepo: IBrowserConnectionRepository,
    private readonly sshTunnelRepo: ISshTunnelRepository,
  ) {}

  async connect(config: ConnectionConfig): Promise<DebugSession> {
    const sessionId = crypto.randomUUID();
    this.session = new DebugSession(sessionId, config);
    this.session.connect();

    try {
      // SSH tunnel setup if needed
      if (config.sshTunnel) {
        await this.sshTunnelRepo.open(config.sshTunnel);
      }

      await this.browserRepo.connect(
        config.effectiveHost,
        config.effectivePort,
        config.sshTunnel ? undefined : undefined,
      );

      this.session.connected();
      return this.session;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.session.fail(message);
      throw error;
    }
  }

  async connectToTab(config: ConnectionConfig, tabId: string): Promise<DebugSession> {
    const sessionId = crypto.randomUUID();
    this.session = new DebugSession(sessionId, config, tabId);
    this.session.connect();

    try {
      if (config.sshTunnel) {
        await this.sshTunnelRepo.open(config.sshTunnel);
      }

      await this.browserRepo.connect(config.effectiveHost, config.effectivePort, tabId);
      this.session.connected();
      return this.session;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.session.fail(message);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.browserRepo.disconnect();
    await this.sshTunnelRepo.close();
    this.session?.disconnect();
    this.session = null;
  }

  async listTabs(config: ConnectionConfig): Promise<BrowserTab[]> {
    if (config.sshTunnel && !this.sshTunnelRepo.isOpen()) {
      await this.sshTunnelRepo.open(config.sshTunnel);
    }
    return this.browserRepo.listTabs(config.effectiveHost, config.effectivePort);
  }

  getSession(): DebugSession | null {
    return this.session;
  }
}
