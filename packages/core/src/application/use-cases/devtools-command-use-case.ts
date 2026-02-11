import type { IBrowserConnectionRepository } from "../../domain/repositories/browser-connection-repository.js";

export class DevToolsCommandUseCase {
  constructor(private readonly browserRepo: IBrowserConnectionRepository) {}

  async enableDomain(domain: string, params?: Record<string, unknown>): Promise<void> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    await this.browserRepo.enableDomain(domain, params);
  }

  async sendCommand(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    return this.browserRepo.sendCommand(method, params);
  }

  async captureScreenshot(format: "png" | "jpeg" | "webp" = "png"): Promise<Buffer> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    return this.browserRepo.captureScreenshot(format);
  }

  async getPageContent(): Promise<string> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    return this.browserRepo.getPageContent();
  }
}
