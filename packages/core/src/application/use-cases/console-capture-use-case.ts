import type { IBrowserConnectionRepository, ConsoleEventCallback } from "../../domain/repositories/browser-connection-repository.js";
import type { ConsoleEntry } from "../../domain/value-objects/console-entry.js";

export class ConsoleCaptureUseCase {
  constructor(private readonly browserRepo: IBrowserConnectionRepository) {}

  async start(callback?: ConsoleEventCallback): Promise<void> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    await this.browserRepo.startConsoleCapture(callback);
  }

  async stop(): Promise<ConsoleEntry[]> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    return this.browserRepo.stopConsoleCapture();
  }

  getLogs(): ConsoleEntry[] {
    return this.browserRepo.getConsoleLogs();
  }

  clear(): void {
    this.browserRepo.clearConsoleLogs();
  }
}
