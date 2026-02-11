import { spawn, type ChildProcess } from "child_process";
import type { ISshTunnelRepository } from "../../domain/repositories/ssh-tunnel-repository.js";
import type { SshTunnelConfig } from "../../domain/value-objects/connection-config.js";

export class SshTunnelRepository implements ISshTunnelRepository {
  private process: ChildProcess | null = null;
  private localPort: number | undefined;

  async open(config: SshTunnelConfig): Promise<void> {
    if (this.process) {
      await this.close();
    }

    this.localPort = config.localPort;

    const args = [
      "-N", // No remote command
      "-L", `${config.localPort}:${config.remoteHost}:${config.remotePort}`,
      "-p", String(config.sshPort),
      "-o", "StrictHostKeyChecking=no",
      "-o", "ExitOnForwardFailure=yes",
    ];

    if (config.privateKeyPath) {
      args.push("-i", config.privateKeyPath);
    }

    args.push(`${config.sshUser}@${config.sshHost}`);

    return new Promise<void>((resolve, reject) => {
      this.process = spawn("ssh", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";

      this.process.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      this.process.on("error", (err) => {
        this.process = null;
        reject(new Error(`SSH tunnel failed to start: ${err.message}`));
      });

      this.process.on("exit", (code) => {
        if (code !== null && code !== 0) {
          this.process = null;
          reject(new Error(`SSH tunnel exited with code ${code}: ${stderr}`));
        }
      });

      // Wait for the tunnel to be ready by checking port availability
      const checkPort = async () => {
        const maxAttempts = 20;
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const conn = await Bun.connect({
              hostname: "127.0.0.1",
              port: config.localPort,
              socket: {
                data() {},
                open(socket) { socket.end(); },
                error() {},
              },
            });
            conn.end();
            resolve();
            return;
          } catch {
            await new Promise((r) => setTimeout(r, 250));
          }
        }
        // If we can't verify, just resolve (tunnel might still work)
        resolve();
      };

      // Small delay to let SSH start, then check
      setTimeout(() => checkPort(), 500);
    });
  }

  async close(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
      this.localPort = undefined;
    }
  }

  isOpen(): boolean {
    return this.process !== null;
  }

  getLocalPort(): number | undefined {
    return this.localPort;
  }
}
