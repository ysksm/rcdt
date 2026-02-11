import type { ChromeLaunchConfig } from "../value-objects/chrome-launch-config.js";
import type { SshTunnelConfig } from "../value-objects/connection-config.js";

/**
 * Repository interface for launching Chrome in remote-debugging mode (DIP).
 *
 * Supports two scenarios:
 * - Local launch: spawn Chrome process directly
 * - Remote launch: launch Chrome on remote server via SSH
 */
export interface IChromeLauncherRepository {
  /** Launch Chrome locally with remote-debugging enabled */
  launchLocal(config: ChromeLaunchConfig, debugPort: number): Promise<void>;

  /** Launch Chrome on a remote server via SSH with remote-debugging enabled */
  launchRemote(
    sshConfig: SshTunnelConfig,
    chromeLaunchConfig: ChromeLaunchConfig,
    debugPort: number,
  ): Promise<void>;

  /** Stop the launched Chrome process */
  stop(): Promise<void>;

  /** Check if a launched Chrome process is running */
  isRunning(): boolean;
}
