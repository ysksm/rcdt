#!/usr/bin/env bun
import {
  createContainer,
  TOKENS,
  ConnectionConfig,
  type SessionManagementUseCase,
  type NavigateUseCase,
  type ExecuteScriptUseCase,
  type MeasurePerformanceUseCase,
  type DevToolsCommandUseCase,
  type ConsoleCaptureUseCase,
  type PerformanceMonitorUseCase,
  type ExportFormat,
} from "@rcdt/core";
import type { SshTunnelConfig } from "@rcdt/core";

const container = createContainer();

const sessionUC = container.resolve<SessionManagementUseCase>(TOKENS.SessionManagementUseCase);
const navigateUC = container.resolve<NavigateUseCase>(TOKENS.NavigateUseCase);
const executeScriptUC = container.resolve<ExecuteScriptUseCase>(TOKENS.ExecuteScriptUseCase);
const measureUC = container.resolve<MeasurePerformanceUseCase>(TOKENS.MeasurePerformanceUseCase);
const devtoolsUC = container.resolve<DevToolsCommandUseCase>(TOKENS.DevToolsCommandUseCase);
const consoleUC = container.resolve<ConsoleCaptureUseCase>(TOKENS.ConsoleCaptureUseCase);
const perfMonitorUC = container.resolve<PerformanceMonitorUseCase>(TOKENS.PerformanceMonitorUseCase);

function printHelp(): void {
  console.log(`
rcdt - Chrome Remote Debug Tool

Usage:
  rcdt <command> [options]

Commands:
  tabs                          List browser tabs
  connect                       Connect to browser
  navigate <url>                Navigate to URL
  eval <expression>             Execute JavaScript
  perf [--format json|csv|html] [--output <path>]  Measure performance
  screenshot [--output <path>]  Capture screenshot
  content [--output <path>]     Get page HTML content
  console                       Capture console logs (Ctrl+C to stop)
  perf-monitor [--interval ms] [--duration sec]  Performance monitor
  devtools <method> [params]    Send raw DevTools command
  interactive                   Interactive REPL mode

Connection Options:
  --host <host>                 Chrome host (default: 127.0.0.1)
  --port <port>                 Chrome debug port (default: 9222)

SSH Tunnel Options:
  --ssh-host <host>             SSH server host
  --ssh-port <port>             SSH server port (default: 22)
  --ssh-user <user>             SSH username
  --ssh-key <path>              SSH private key path
  --remote-host <host>          Remote Chrome host (default: 127.0.0.1)
  --remote-port <port>          Remote Chrome port (default: 9222)
  --local-port <port>           Local tunnel port (default: 9223)
`);
}

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        parsed[key] = nextArg;
        i++;
      } else {
        parsed[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }

  positional.forEach((v, i) => {
    parsed[`_${i}`] = v;
  });
  parsed["_length"] = String(positional.length);

  return parsed;
}

function buildConnectionConfig(opts: Record<string, string>): ConnectionConfig {
  const host = opts["host"] || "127.0.0.1";
  const port = parseInt(opts["port"] || "9222", 10);

  let sshTunnel: SshTunnelConfig | undefined;
  if (opts["ssh-host"]) {
    sshTunnel = {
      sshHost: opts["ssh-host"],
      sshPort: parseInt(opts["ssh-port"] || "22", 10),
      sshUser: opts["ssh-user"] || "root",
      privateKeyPath: opts["ssh-key"],
      remoteHost: opts["remote-host"] || "127.0.0.1",
      remotePort: parseInt(opts["remote-port"] || "9222", 10),
      localPort: parseInt(opts["local-port"] || "9223", 10),
    };
  }

  return new ConnectionConfig(host, port, false, sshTunnel);
}

async function runInteractive(config: ConnectionConfig): Promise<void> {
  console.log("Connecting...");
  const session = await sessionUC.connect(config);
  console.log(`Connected! Session: ${session.id}`);
  console.log('Type "help" for commands, "exit" to quit.\n');

  const prompt = () => process.stdout.write("rcdt> ");
  prompt();

  for await (const line of console) {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];

    try {
      switch (cmd) {
        case "help":
          console.log("  nav <url>     - Navigate to URL");
          console.log("  eval <expr>   - Execute JavaScript");
          console.log("  perf          - Measure performance");
          console.log("  screenshot    - Capture screenshot");
          console.log("  tabs          - List tabs");
          console.log("  console start - Start console capture");
          console.log("  console stop  - Stop and show console logs");
          console.log("  console show  - Show captured logs");
          console.log("  console clear - Clear logs");
          console.log("  monitor start - Start perf monitor");
          console.log("  monitor stop  - Stop and show snapshot");
          console.log("  monitor show  - Show current snapshot");
          console.log("  workflow <url> [format] - Record perf, navigate, stop, export");
          console.log("  devtools <m>  - Send DevTools command");
          console.log("  exit          - Disconnect and exit");
          break;

        case "nav":
        case "navigate": {
          const url = parts.slice(1).join(" ");
          if (!url) {
            console.log("Usage: nav <url>");
            break;
          }
          await navigateUC.execute(url);
          console.log(`Navigated to: ${url}`);
          break;
        }

        case "eval": {
          const expr = parts.slice(1).join(" ");
          if (!expr) {
            console.log("Usage: eval <expression>");
            break;
          }
          const result = await executeScriptUC.execute(expr);
          if (result.isError) {
            console.error(`Error: ${result.exceptionDetails}`);
          } else {
            console.log(result.value);
          }
          break;
        }

        case "perf": {
          const metrics = await measureUC.measure();
          console.log(JSON.stringify(metrics.toJSON(), null, 2));
          break;
        }

        case "screenshot": {
          const buf = await devtoolsUC.captureScreenshot();
          const path = `screenshot-${Date.now()}.png`;
          await Bun.write(path, buf);
          console.log(`Screenshot saved: ${path}`);
          break;
        }

        case "tabs": {
          const tabs = await sessionUC.listTabs(config);
          tabs.forEach((t, i) => console.log(`  [${i}] ${t.title} - ${t.url}`));
          break;
        }

        case "console": {
          const sub = parts[1];
          if (sub === "start") {
            await consoleUC.start((entry) => {
              const color = entry.level === "error" ? "\x1b[31m" : entry.level === "warn" ? "\x1b[33m" : "\x1b[0m";
              console.log(`${color}[${entry.level}] ${entry.text}\x1b[0m`);
            });
            console.log("Console capture started. Use 'console stop' to stop.");
          } else if (sub === "stop") {
            const logs = await consoleUC.stop();
            console.log(`Captured ${logs.length} log(s).`);
            logs.forEach((l) => console.log(`  [${l.level}] ${l.text}`));
          } else if (sub === "show") {
            const logs = consoleUC.getLogs();
            console.log(`${logs.length} log(s):`);
            logs.forEach((l) => console.log(`  [${l.level}] ${l.text}`));
          } else if (sub === "clear") {
            consoleUC.clear();
            console.log("Console logs cleared.");
          } else {
            console.log("Usage: console start|stop|show|clear");
          }
          break;
        }

        case "monitor": {
          const sub = parts[1];
          if (sub === "start") {
            const interval = parts[2] ? parseInt(parts[2], 10) : 1000;
            await perfMonitorUC.start(interval);
            console.log(`Performance monitor started (interval: ${interval}ms). Use 'monitor stop' to stop.`);
          } else if (sub === "stop") {
            const snapshot = await perfMonitorUC.stop();
            console.log(JSON.stringify(snapshot.toJSON(), null, 2));
          } else if (sub === "show") {
            const snapshot = perfMonitorUC.getSnapshot();
            if (snapshot) {
              console.log(JSON.stringify(snapshot.toJSON(), null, 2));
            } else {
              console.log("No monitoring data available.");
            }
          } else {
            console.log("Usage: monitor start [intervalMs]|stop|show");
          }
          break;
        }

        case "workflow": {
          const url = parts[1];
          const format = (parts[2] || "html") as "json" | "csv" | "html";
          if (!url) {
            console.log("Usage: workflow <url> [json|csv|html]");
            break;
          }
          console.log("1. Starting performance monitor...");
          await perfMonitorUC.start(500);
          console.log(`2. Navigating to: ${url}`);
          await navigateUC.execute(url);
          console.log("3. Collecting performance metrics...");
          await new Promise((r) => setTimeout(r, 2000));
          const snapshot = await perfMonitorUC.stop();
          const metrics = await measureUC.measure();
          const outPath = `./perf-report-${Date.now()}.${format}`;
          const { filePath } = await measureUC.measureAndExport(format, outPath);
          console.log(`4. Performance report exported: ${filePath}`);
          console.log(`   Monitor samples: ${snapshot.samples.length}`);
          console.log(`   JS Heap: ${(metrics.jsHeapUsedSize / 1048576).toFixed(2)} MB`);
          console.log(`   DOM Nodes: ${metrics.domNodes}`);
          if (format === "html") {
            console.log(`5. Open in Chrome: file://${filePath}`);
          }
          break;
        }

        case "devtools": {
          const method = parts[1];
          if (!method) {
            console.log("Usage: devtools <method> [json-params]");
            break;
          }
          const params = parts.length > 2 ? JSON.parse(parts.slice(2).join(" ")) : undefined;
          const res = await devtoolsUC.sendCommand(method, params);
          console.log(JSON.stringify(res, null, 2));
          break;
        }

        case "exit":
        case "quit":
          await sessionUC.disconnect();
          console.log("Disconnected.");
          process.exit(0);
          break;

        case "":
          break;

        default:
          console.log(`Unknown command: ${cmd}. Type "help" for available commands.`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    prompt();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const opts = parseArgs(args);
  const command = opts["_0"];
  const config = buildConnectionConfig(opts);

  try {
    switch (command) {
      case "tabs": {
        if (config.sshTunnel) {
          console.log("Setting up SSH tunnel...");
        }
        const tabs = await sessionUC.listTabs(config);
        console.log(`Found ${tabs.length} tab(s):\n`);
        tabs.forEach((tab, i) => {
          console.log(`  [${i}] ${tab.title}`);
          console.log(`      URL: ${tab.url}`);
          console.log(`      ID:  ${tab.id}`);
          console.log(`      Type: ${tab.type}`);
          console.log();
        });
        break;
      }

      case "connect": {
        console.log(`Connecting to ${config.host}:${config.port}...`);
        if (config.sshTunnel) {
          console.log(`Via SSH tunnel: ${config.sshTunnel.sshUser}@${config.sshTunnel.sshHost}`);
        }
        const session = await sessionUC.connect(config);
        console.log(`Connected! Session ID: ${session.id}`);
        break;
      }

      case "navigate":
      case "nav": {
        const url = opts["_1"];
        if (!url) {
          console.error("Error: URL is required. Usage: rcdt navigate <url>");
          process.exit(1);
        }
        await sessionUC.connect(config);
        await navigateUC.execute(url);
        console.log(`Navigated to: ${url}`);
        await sessionUC.disconnect();
        break;
      }

      case "eval": {
        const expression = opts["_1"];
        if (!expression) {
          console.error("Error: Expression is required. Usage: rcdt eval <expression>");
          process.exit(1);
        }
        await sessionUC.connect(config);
        const result = await executeScriptUC.execute(expression);
        if (result.isError) {
          console.error(`Error: ${result.exceptionDetails}`);
          process.exit(1);
        }
        console.log(JSON.stringify(result.value, null, 2));
        await sessionUC.disconnect();
        break;
      }

      case "perf": {
        const format = (opts["format"] || "json") as ExportFormat;
        const output = opts["output"];

        await sessionUC.connect(config);

        if (output) {
          const { metrics, filePath } = await measureUC.measureAndExport(format, output);
          console.log(`Performance metrics exported to: ${filePath}`);
          console.log(`\nSummary:`);
          console.log(`  JS Heap: ${(metrics.jsHeapUsedSize / 1048576).toFixed(2)} MB`);
          console.log(`  DOM Nodes: ${metrics.domNodes}`);
          console.log(`  Resources: ${metrics.resources.length}`);
        } else {
          const metrics = await measureUC.measure();
          console.log(JSON.stringify(metrics.toJSON(), null, 2));
        }
        await sessionUC.disconnect();
        break;
      }

      case "screenshot": {
        const output = opts["output"] || `screenshot-${Date.now()}.png`;
        await sessionUC.connect(config);
        const buf = await devtoolsUC.captureScreenshot();
        await Bun.write(output, buf);
        console.log(`Screenshot saved: ${output}`);
        await sessionUC.disconnect();
        break;
      }

      case "content": {
        const output = opts["output"];
        await sessionUC.connect(config);
        const html = await devtoolsUC.getPageContent();
        if (output) {
          await Bun.write(output, html);
          console.log(`Page content saved: ${output}`);
        } else {
          console.log(html);
        }
        await sessionUC.disconnect();
        break;
      }

      case "devtools": {
        const method = opts["_1"];
        if (!method) {
          console.error("Error: Method is required. Usage: rcdt devtools <method> [json-params]");
          process.exit(1);
        }
        const params = opts["_2"] ? JSON.parse(opts["_2"]) : undefined;
        await sessionUC.connect(config);
        const res = await devtoolsUC.sendCommand(method, params);
        console.log(JSON.stringify(res, null, 2));
        await sessionUC.disconnect();
        break;
      }

      case "console": {
        await sessionUC.connect(config);
        console.log("Console capture started. Press Ctrl+C to stop...\n");
        await consoleUC.start((entry) => {
          const color = entry.level === "error" ? "\x1b[31m" : entry.level === "warn" ? "\x1b[33m" : "\x1b[0m";
          process.stdout.write(`${color}[${entry.level}] ${entry.text}\x1b[0m\n`);
        });

        await new Promise<void>((resolve) => {
          process.on("SIGINT", async () => {
            const logs = await consoleUC.stop();
            console.log(`\nCapture stopped. Total: ${logs.length} log(s).`);
            const output = opts["output"];
            if (output) {
              await Bun.write(output, JSON.stringify(logs.map((l) => l.toJSON()), null, 2));
              console.log(`Logs saved to: ${output}`);
            }
            await sessionUC.disconnect();
            resolve();
          });
        });
        break;
      }

      case "perf-monitor": {
        const interval = parseInt(opts["interval"] || "1000", 10);
        const duration = parseInt(opts["duration"] || "10", 10);
        const output = opts["output"];

        await sessionUC.connect(config);
        console.log(`Performance monitor started (interval: ${interval}ms, duration: ${duration}s)...\n`);
        await perfMonitorUC.start(interval);

        await new Promise((r) => setTimeout(r, duration * 1000));
        const snapshot = await perfMonitorUC.stop();

        if (output) {
          await Bun.write(output, JSON.stringify(snapshot.toJSON(), null, 2));
          console.log(`Monitor data saved to: ${output}`);
        } else {
          console.log(JSON.stringify(snapshot.toJSON(), null, 2));
        }
        console.log(`\nSamples: ${snapshot.samples.length}`);
        await sessionUC.disconnect();
        break;
      }

      case "workflow": {
        const url = opts["_1"];
        const format = (opts["format"] || "html") as ExportFormat;
        const output = opts["output"] || `./perf-report-${Date.now()}.${format}`;
        const wait = parseInt(opts["wait"] || "2", 10);

        if (!url) {
          console.error("Error: URL is required. Usage: rcdt workflow <url> [--format html|json|csv] [--output path] [--wait seconds]");
          process.exit(1);
        }

        await sessionUC.connect(config);

        console.log("1. Starting performance monitor...");
        await perfMonitorUC.start(500);
        await consoleUC.start();

        console.log(`2. Navigating to: ${url}`);
        await navigateUC.execute(url);

        console.log(`3. Waiting ${wait}s for page to stabilize...`);
        await new Promise((r) => setTimeout(r, wait * 1000));

        console.log("4. Stopping monitor and collecting metrics...");
        const snapshot = await perfMonitorUC.stop();
        const consoleLogs = await consoleUC.stop();
        const { metrics, filePath } = await measureUC.measureAndExport(format, output);

        console.log(`5. Report exported: ${filePath}`);
        console.log(`\nResults:`);
        console.log(`  Monitor samples: ${snapshot.samples.length}`);
        console.log(`  JS Heap: ${(metrics.jsHeapUsedSize / 1048576).toFixed(2)} MB`);
        console.log(`  DOM Nodes: ${metrics.domNodes}`);
        console.log(`  Resources: ${metrics.resources.length}`);
        console.log(`  Console logs: ${consoleLogs.length}`);

        if (format === "html") {
          console.log(`\n  Open report: file://${filePath}`);
        }

        await sessionUC.disconnect();
        break;
      }

      case "interactive":
      case "repl":
        await runInteractive(config);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    await sessionUC.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
