import type { IBrowserConnectionRepository } from "../../domain/repositories/browser-connection-repository.js";

export class NavigateUseCase {
  constructor(private readonly browserRepo: IBrowserConnectionRepository) {}

  async execute(url: string): Promise<void> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    await this.browserRepo.navigateTo(url);
  }
}
