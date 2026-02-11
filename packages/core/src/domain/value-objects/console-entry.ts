export type ConsoleLogLevel = "log" | "info" | "warn" | "error" | "debug" | "verbose";

export class ConsoleEntry {
  constructor(
    public readonly timestamp: Date,
    public readonly level: ConsoleLogLevel,
    public readonly text: string,
    public readonly source: string,
    public readonly url: string,
    public readonly lineNumber: number,
    public readonly stackTrace?: string,
  ) {}

  toJSON(): Record<string, unknown> {
    return {
      timestamp: this.timestamp.toISOString(),
      level: this.level,
      text: this.text,
      source: this.source,
      url: this.url,
      lineNumber: this.lineNumber,
      ...(this.stackTrace && { stackTrace: this.stackTrace }),
    };
  }
}
