export class BrowserTab {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly url: string,
    public readonly type: string,
    public readonly webSocketDebuggerUrl?: string,
  ) {}
}
