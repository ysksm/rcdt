declare module "chrome-remote-interface" {
  interface Options {
    host?: string;
    port?: number;
    secure?: boolean;
    target?: string;
    protocol?: object;
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
    };
    Network: {
      enable(): Promise<void>;
    };
    Performance: {
      enable(): Promise<void>;
      getMetrics(): Promise<{
        metrics: Array<{ name: string; value: number }>;
      }>;
    };
    send(method: string, params?: Record<string, unknown>): Promise<unknown>;
    close(): Promise<void>;
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
  }

  export = CDP;
}
