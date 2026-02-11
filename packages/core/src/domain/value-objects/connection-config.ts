import type { ChromeLaunchConfig } from "./chrome-launch-config.js";

export interface SshTunnelConfig {
  readonly sshHost: string;
  readonly sshPort: number;
  readonly sshUser: string;
  readonly privateKeyPath?: string;
  readonly remoteHost: string;
  readonly remotePort: number;
  readonly localPort: number;
}

export class ConnectionConfig {
  constructor(
    public readonly host: string,
    public readonly port: number,
    public readonly secure: boolean = false,
    public readonly sshTunnel?: SshTunnelConfig,
    public readonly chromeLaunch?: ChromeLaunchConfig,
  ) {}

  get effectiveHost(): string {
    return this.sshTunnel ? "127.0.0.1" : this.host;
  }

  get effectivePort(): number {
    return this.sshTunnel ? this.sshTunnel.localPort : this.port;
  }

  get wsUrl(): string {
    const protocol = this.secure ? "wss" : "ws";
    return `${protocol}://${this.effectiveHost}:${this.effectivePort}`;
  }

  /**
   * Returns the scenario description:
   * - local-attach: Connect to locally running Chrome
   * - local-launch: Launch Chrome locally and connect
   * - remote-attach: SSH forward to remote running Chrome
   * - remote-launch: SSH to remote, launch Chrome, forward and connect
   */
  get scenario(): "local-attach" | "local-launch" | "remote-attach" | "remote-launch" {
    if (this.sshTunnel) {
      return this.chromeLaunch ? "remote-launch" : "remote-attach";
    }
    return this.chromeLaunch ? "local-launch" : "local-attach";
  }
}
