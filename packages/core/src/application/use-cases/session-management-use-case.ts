import { DebugSession } from "../../domain/entities/debug-session.js";
import type { BrowserTab } from "../../domain/entities/browser-tab.js";
import type { ConnectionConfig } from "../../domain/value-objects/connection-config.js";
import type { IBrowserConnectionRepository } from "../../domain/repositories/browser-connection-repository.js";
import type { ISshTunnelRepository } from "../../domain/repositories/ssh-tunnel-repository.js";
import type { IChromeLauncherRepository } from "../../domain/repositories/chrome-launcher-repository.js";

export class SessionManagementUseCase {
  private session: DebugSession | null = null;
  private launchedChrome = false;

  constructor(
    private readonly browserRepo: IBrowserConnectionRepository,
    private readonly sshTunnelRepo: ISshTunnelRepository,
    private readonly chromeLauncherRepo: IChromeLauncherRepository,
  ) {}

  async connect(config: ConnectionConfig): Promise<DebugSession> {
    const sessionId = crypto.randomUUID();
    this.session = new DebugSession(sessionId, config);
    this.session.connect();

    try {
      await this.setupConnection(config);

      await this.browserRepo.connect(
        config.effectiveHost,
        config.effectivePort,
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
      await this.setupConnection(config);

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

    // Stop Chrome if we launched it
    if (this.launchedChrome) {
      await this.chromeLauncherRepo.stop();
      this.launchedChrome = false;
    }

    this.session?.disconnect();
    this.session = null;
  }

  async listTabs(config: ConnectionConfig): Promise<BrowserTab[]> {
    // Setup SSH tunnel if needed for tab listing
    if (config.sshTunnel && !this.sshTunnelRepo.isOpen()) {
      await this.sshTunnelRepo.open(config.sshTunnel);
    }

    // Launch Chrome if needed for tab listing
    if (config.chromeLaunch && !this.chromeLauncherRepo.isRunning()) {
      await this.launchChrome(config);
    }

    return this.browserRepo.listTabs(config.effectiveHost, config.effectivePort);
  }

  getSession(): DebugSession | null {
    return this.session;
  }

  /**
   * Setup connection infrastructure based on scenario:
   *
   * 1. local-attach: No setup needed, just connect
   * 2. local-launch: Launch Chrome locally, then connect
   * 3. remote-attach: Open SSH tunnel, then connect
   * 4. remote-launch: Launch Chrome on remote via SSH, open SSH tunnel, then connect
   */
  private async setupConnection(config: ConnectionConfig): Promise<void> {
    const scenario = config.scenario;

    switch (scenario) {
      case "local-attach":
        // Nothing extra to do
        break;

      case "local-launch":
        await this.launchChrome(config);
        break;

      case "remote-attach":
        await this.sshTunnelRepo.open(config.sshTunnel!);
        break;

      case "remote-launch":
        // 1. Launch Chrome on remote machine via SSH
        await this.launchChrome(config);
        // 2. Open SSH tunnel to forward debug port
        await this.sshTunnelRepo.open(config.sshTunnel!);
        break;
    }
  }

  private async launchChrome(config: ConnectionConfig): Promise<void> {
    if (!config.chromeLaunch) return;

    const debugPort = config.sshTunnel
      ? config.sshTunnel.remotePort  // Remote: Chrome listens on remotePort
      : config.port;                  // Local: Chrome listens on port

    if (config.sshTunnel) {
      await this.chromeLauncherRepo.launchRemote(
        config.sshTunnel,
        config.chromeLaunch,
        debugPort,
      );
    } else {
      await this.chromeLauncherRepo.launchLocal(config.chromeLaunch, debugPort);
    }

    this.launchedChrome = true;
  }
}
