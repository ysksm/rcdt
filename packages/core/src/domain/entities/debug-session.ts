import type { ConnectionConfig } from "../value-objects/connection-config.js";

export type SessionStatus = "disconnected" | "connecting" | "connected" | "error";

export class DebugSession {
  private _status: SessionStatus = "disconnected";
  private _currentUrl: string = "";
  private _error?: string;

  constructor(
    public readonly id: string,
    public readonly config: ConnectionConfig,
    public readonly tabId?: string,
  ) {}

  get status(): SessionStatus {
    return this._status;
  }

  get currentUrl(): string {
    return this._currentUrl;
  }

  get error(): string | undefined {
    return this._error;
  }

  connect(): void {
    this._status = "connecting";
    this._error = undefined;
  }

  connected(): void {
    this._status = "connected";
  }

  disconnect(): void {
    this._status = "disconnected";
  }

  fail(error: string): void {
    this._status = "error";
    this._error = error;
  }

  updateUrl(url: string): void {
    this._currentUrl = url;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      status: this._status,
      currentUrl: this._currentUrl,
      config: {
        host: this.config.host,
        port: this.config.port,
        hasSshTunnel: !!this.config.sshTunnel,
      },
      tabId: this.tabId,
      error: this._error,
    };
  }
}
