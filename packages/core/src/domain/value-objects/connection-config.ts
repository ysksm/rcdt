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
}
