import type { IBrowserConnectionRepository } from "../../domain/repositories/browser-connection-repository.js";
import type { ScriptResult } from "../../domain/value-objects/script-result.js";

export class ExecuteScriptUseCase {
  constructor(private readonly browserRepo: IBrowserConnectionRepository) {}

  async execute(expression: string): Promise<ScriptResult> {
    if (!this.browserRepo.isConnected()) {
      throw new Error("Not connected to browser");
    }
    return this.browserRepo.evaluateScript(expression);
  }
}
