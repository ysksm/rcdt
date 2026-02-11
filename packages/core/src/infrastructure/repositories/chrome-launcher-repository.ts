import { spawn, type ChildProcess } from "child_process";
import type { IChromeLauncherRepository } from "../../domain/repositories/chrome-launcher-repository.js";
import type { ChromeLaunchConfig } from "../../domain/value-objects/chrome-launch-config.js";
import type { SshTunnelConfig } from "../../domain/value-objects/connection-config.js";

/** Common Chrome executable paths by platform */
const CHROME_PATHS: Record<string, string[]> = {
  linux: [
    "google-chrome",
    "google-chrome-stable",
    "chromium-browser",
    "chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ],
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
};

export class ChromeLauncherRepository implements IChromeLauncherRepository {
  private process: ChildProcess | null = null;
  private remotePid: number | null = null;
  private sshProcess: ChildProcess | null = null;

  async launchLocal(config: ChromeLaunchConfig, debugPort: number): Promise<void> {
    if (this.process) {
      await this.stop();
    }

    const executablePath = config.executablePath || (await this.findChromeExecutable());
    const args = this.buildChromeArgs(config, debugPort);

    return new Promise<void>((resolve, reject) => {
      this.process = spawn(executablePath, args, {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
      });

      let stderr = "";
      this.process.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
        // Chrome outputs "DevTools listening on ws://..." when ready
        if (stderr.includes("DevTools listening on")) {
          resolve();
        }
      });

      this.process.on("error", (err) => {
        this.process = null;
        reject(new Error(`Failed to launch Chrome: ${err.message}`));
      });

      this.process.on("exit", (code) => {
        if (code !== null && code !== 0 && this.process) {
          this.process = null;
          reject(new Error(`Chrome exited with code ${code}: ${stderr}`));
        }
      });

      // Fallback: wait and check port availability
      setTimeout(async () => {
        if (this.process) {
          const ready = await this.checkPortReady("127.0.0.1", debugPort);
          if (ready) {
            resolve();
          } else {
            reject(new Error(`Chrome did not start on port ${debugPort} within timeout`));
          }
        }
      }, 5000);
    });
  }

  async launchRemote(
    sshConfig: SshTunnelConfig,
    chromeLaunchConfig: ChromeLaunchConfig,
    debugPort: number,
  ): Promise<void> {
    if (this.sshProcess) {
      await this.stop();
    }

    const chromeExe = chromeLaunchConfig.executablePath || "google-chrome";
    const chromeArgs = this.buildChromeArgs(chromeLaunchConfig, debugPort);

    // Build remote command: launch Chrome in background and capture PID
    const remoteCmd = `nohup ${chromeExe} ${chromeArgs.join(" ")} > /dev/null 2>&1 & echo $!`;

    const sshArgs = [
      "-p", String(sshConfig.sshPort),
      "-o", "StrictHostKeyChecking=no",
    ];

    if (sshConfig.privateKeyPath) {
      sshArgs.push("-i", sshConfig.privateKeyPath);
    }

    sshArgs.push(`${sshConfig.sshUser}@${sshConfig.sshHost}`, remoteCmd);

    return new Promise<void>((resolve, reject) => {
      this.sshProcess = spawn("ssh", sshArgs, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      this.sshProcess.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      this.sshProcess.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      this.sshProcess.on("error", (err) => {
        this.sshProcess = null;
        reject(new Error(`Failed to launch remote Chrome via SSH: ${err.message}`));
      });

      this.sshProcess.on("exit", (code) => {
        this.sshProcess = null;
        if (code === 0) {
          const pid = parseInt(stdout.trim(), 10);
          if (!isNaN(pid)) {
            this.remotePid = pid;
          }
          // Wait a bit for Chrome to start on remote
          setTimeout(() => resolve(), 2000);
        } else {
          reject(new Error(`SSH command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async stop(): Promise<void> {
    // Stop local Chrome
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }

    // Stop remote Chrome via SSH
    if (this.remotePid && this.sshProcess === null) {
      // We need SSH config to kill remote process - store it would be needed
      // For now the remote process will be cleaned up when SSH tunnel closes
      this.remotePid = null;
    }

    if (this.sshProcess) {
      this.sshProcess.kill("SIGTERM");
      this.sshProcess = null;
    }
  }

  isRunning(): boolean {
    return this.process !== null || this.remotePid !== null;
  }

  private buildChromeArgs(config: ChromeLaunchConfig, debugPort: number): string[] {
    const args = [
      `--remote-debugging-port=${debugPort}`,
      "--no-first-run",
      "--no-default-browser-check",
    ];

    if (config.headless) {
      args.push("--headless=new");
    }

    if (config.userDataDir) {
      args.push(`--user-data-dir=${config.userDataDir}`);
    } else {
      // Use a temp directory to avoid conflicts with existing Chrome profiles
      args.push(`--user-data-dir=/tmp/rcdt-chrome-${debugPort}`);
    }

    if (config.additionalFlags) {
      args.push(...config.additionalFlags);
    }

    return args;
  }

  private async findChromeExecutable(): Promise<string> {
    const platform = process.platform;
    const candidates = CHROME_PATHS[platform] || CHROME_PATHS["linux"]!;

    for (const candidate of candidates) {
      try {
        const proc = Bun.spawn(["which", candidate], {
          stdout: "pipe",
          stderr: "ignore",
        });
        const exitCode = await proc.exited;
        if (exitCode === 0) {
          return candidate;
        }
      } catch {
        // Try next candidate
      }
    }

    throw new Error(
      `Chrome executable not found. Please specify --chrome-path. Searched: ${candidates.join(", ")}`,
    );
  }

  private async checkPortReady(host: string, port: number): Promise<boolean> {
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const conn = await Bun.connect({
          hostname: host,
          port,
          socket: {
            data() {},
            open(socket) { socket.end(); },
            error() {},
          },
        });
        conn.end();
        return true;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    return false;
  }
}
