# RCDT - Chrome Remote Debug Tool

Chrome DevTools Protocol (CDP) を使ったリモートデバッグツール。
SSH トンネリング経由でのリモート接続に対応。

## Architecture

DDD + DIP + DI + Layered Architecture + Repository Pattern

```
packages/
  core/       - Domain / Application / Infrastructure 層 (共有ライブラリ)
  cli/        - CLI インターフェース
  web/        - Bun HTTP API サーバー
  frontend/   - Angular フロントエンド
```

### Layer Structure (Core)

```
Domain Layer        - Entity, Value Object, Repository Interface (DIP)
Application Layer   - Use Cases
Infrastructure Layer - CDP 実装, SSH Tunnel, ファイル出力 (DI)
```

## Features

- URL ナビゲーション
- JavaScript 実行
- パフォーマンス計測 (メモリ、DOM、リソース)
- 計測結果のファイル出力 (JSON / CSV / HTML)
- スクリーンショット取得
- DevTools Protocol コマンド直接実行
- SSH フォワーディング対応

## Setup

```bash
# Backend dependencies
bun install

# Frontend dependencies
cd packages/frontend && npm install
```

## Usage

### CLI

```bash
# List browser tabs
bun run cli -- tabs --host 127.0.0.1 --port 9222

# Navigate to URL
bun run cli -- navigate https://example.com --host 127.0.0.1 --port 9222

# Execute JavaScript
bun run cli -- eval "document.title"

# Measure performance
bun run cli -- perf --format json --output ./report.json

# With SSH tunnel
bun run cli -- tabs --host 10.0.0.5 --port 9222 \
  --ssh-host bastion.example.com --ssh-user deploy --ssh-key ~/.ssh/id_rsa \
  --remote-host 127.0.0.1 --remote-port 9222 --local-port 9223

# Interactive REPL
bun run cli -- interactive --host 127.0.0.1 --port 9222
```

### Web Server

```bash
# Start API server (port 3000)
bun run dev:web

# Start Angular dev server (port 4200, proxy to API)
cd packages/frontend && npm start
```

### Build

```bash
# Build frontend
cd packages/frontend && npx ng build

# Start production server (serves API + Angular SPA)
bun run packages/web/src/index.ts
```

## Chrome Setup

Start Chrome with remote debugging enabled:

```bash
google-chrome --remote-debugging-port=9222
```
