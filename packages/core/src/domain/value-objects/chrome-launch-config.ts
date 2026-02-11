/**
 * Configuration for launching Chrome in remote-debugging mode.
 */
export interface ChromeLaunchConfig {
  /** Path to Chrome executable (auto-detected if not provided) */
  readonly executablePath?: string;
  /** User data directory for Chrome profile */
  readonly userDataDir?: string;
  /** Launch in headless mode */
  readonly headless?: boolean;
  /** Additional Chrome flags */
  readonly additionalFlags?: string[];
}
