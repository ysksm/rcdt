import type { SshTunnelConfig } from "../value-objects/connection-config.js";

/**
 * Repository interface for SSH tunnel operations (DIP).
 */
export interface ISshTunnelRepository {
  open(config: SshTunnelConfig): Promise<void>;
  close(): Promise<void>;
  isOpen(): boolean;
  getLocalPort(): number | undefined;
}
