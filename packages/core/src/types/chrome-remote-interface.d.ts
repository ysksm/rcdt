declare module "chrome-remote-interface" {
  interface Options {
    host?: string;
    port?: number;
    secure?: boolean;
    target?: string;
    protocol?: object;
  }

  interface RemoteObject {
    type: string;
    value?: unknown;
    description?: string;
    preview?: { properties?: Array<{ name: string; value: string }> };
  }

  interface StackTrace {
    callFrames: Array<{
      functionName: string;
      url: string;
      lineNumber: number;
      columnNumber: number;
    }>;
  }

  interface Client {
    Page: {
      enable(): Promise<void>;
      navigate(params: { url: string }): Promise<{ frameId: string }>;
      loadEventFired(): Promise<void>;
      captureScreenshot(params?: { format?: string; quality?: number }): Promise<{ data: string }>;
    };
    Runtime: {
      enable(): Promise<void>;
      evaluate(params: {
        expression: string;
        returnByValue?: boolean;
        awaitPromise?: boolean;
      }): Promise<{
        result: { value: unknown; type: string };
        exceptionDetails?: {
          text?: string;
          exception?: { description?: string };
        };
      }>;
      consoleAPICalled(callback: (params: {
        type: string;
        args: RemoteObject[];
        timestamp: number;
        stackTrace?: StackTrace;
      }) => void): void;
      exceptionThrown(callback: (params: {
        timestamp: number;
        exceptionDetails: {
          text: string;
          url?: string;
          lineNumber?: number;
          stackTrace?: StackTrace;
          exception?: { description?: string };
        };
      }) => void): void;
    };
    Log: {
      enable(): Promise<void>;
      entryAdded(callback: (params: {
        entry: {
          source: string;
          level: string;
          text: string;
          timestamp: number;
          url?: string;
          lineNumber?: number;
          stackTrace?: StackTrace;
        };
      }) => void): void;
    };
    Network: {
      enable(): Promise<void>;
    };
    Performance: {
      enable(): Promise<void>;
      disable(): Promise<void>;
      getMetrics(): Promise<{
        metrics: Array<{ name: string; value: number }>;
      }>;
    };
    send(method: string, params?: Record<string, unknown>): Promise<unknown>;
    close(): Promise<void>;
    on(event: string, callback: (...args: unknown[]) => void): void;
    removeListener(event: string, callback: (...args: unknown[]) => void): void;
  }

  interface Target {
    id: string;
    title: string;
    url: string;
    type: string;
    webSocketDebuggerUrl?: string;
  }

  function CDP(options?: Options): Promise<Client>;

  namespace CDP {
    function List(options?: { host?: string; port?: number }): Promise<Target[]>;
    type Client = import("chrome-remote-interface").Client;
    type Options = import("chrome-remote-interface").Options;
    type RemoteObject = import("chrome-remote-interface").RemoteObject;
    type StackTrace = import("chrome-remote-interface").StackTrace;
  }

  export = CDP;
}
