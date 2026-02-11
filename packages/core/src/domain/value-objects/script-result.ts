export class ScriptResult {
  constructor(
    public readonly value: unknown,
    public readonly type: string,
    public readonly exceptionDetails?: string,
  ) {}

  get isError(): boolean {
    return this.exceptionDetails !== undefined;
  }

  toJSON(): Record<string, unknown> {
    return {
      value: this.value,
      type: this.type,
      isError: this.isError,
      ...(this.exceptionDetails && { error: this.exceptionDetails }),
    };
  }
}
