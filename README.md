<div align="center">

# ⚡ CLICKHEAD

### HTTP Traffic Testing & Load Diagnostics in Go

Controlled request pacing, configurable load profiles, live telemetry, and a native Go execution engine.

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#load-profiles">Load Profiles</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#test-bench">Test Bench</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Language-Go%201.21+-07110C?style=for-the-badge&logo=go&logoColor=B4F82C" alt="Go Version" />
  <img src="https://img.shields.io/badge/Worker%20Pool-Goroutines-07110C?style=for-the-badge&logo=go&logoColor=B4F82C" alt="Worker Pool" />
  <img src="https://img.shields.io/badge/Telemetry-P50%20%2F%20P95%20%2F%20P99-07110C?style=for-the-badge&logo=prometheus&logoColor=B4F82C" alt="Telemetry" />
</p>

</div>

---

## Overview

**ClickHead** is a focused HTTP traffic testing tool for developers and operators who need to understand how a website or service behaves under controlled request volume.

It supports paced traffic, concurrency controls, multi-path requests, browser-profile headers, proxy pools, latency percentiles, graceful cancellation, and live telemetry.

> Use it only against systems you own or are explicitly authorized to test.

## Features

- **Controlled pacing** — base delay plus configurable jitter.
- **Concurrency limits** — predictable worker-pool execution using native Go goroutines.
- **Multi-page journeys** — distribute requests across configured paths.
- **Client profiles** — configurable desktop/mobile user-agent profiles.
- **Session cookies** — isolated cookie jars per worker.
- **Proxy pools** — HTTP/HTTPS/SOCKS5 proxy support for controlled environments.
- **Latency telemetry** — P50, P90, P95 and P99 measurements.
- **24-hour scheduling** — optional diurnal distribution for long-running test plans.
- **Graceful shutdown** — Ctrl+C/SIGTERM cancellation and final reporting.
- **Live browser dashboard** — configure tests and inspect telemetry without using the CLI directly.

## Quick Start

### Web dashboard

```bash
npm install
npm run dev
```

Open the local development URL shown by Vite.

### Go engine

```bash
go run main.go -url="https://example.com" -requests=100 -concurrency=3 -delay=1500ms -jitter=800ms
```

### Standalone binary

```bash
go build -o clickhead main.go
./clickhead -url="https://example.com" -requests=500 -duration=1h
```

## Load Profiles

ClickHead ships with conservative profiles for different testing goals:

| Profile | Purpose |
| --- | --- |
| **Steady Browser Traffic** | Small baseline request stream |
| **Moderate Stream** | Sustained application-load validation |
| **Peak Load** | Controlled concurrency and connection-pool testing |
| **Capacity Benchmark** | High-throughput testing in authorized environments |

All profiles are configurable before execution.

## CLI Reference

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `-url` | `string` | `https://httpbin.org/get` | Target URL |
| `-requests` | `int` | `100` | Total requests |
| `-concurrency` | `int` | `3` | Parallel workers |
| `-delay` | `duration` | `1000ms` | Base delay per worker |
| `-jitter` | `duration` | `500ms` | Maximum randomized delay |
| `-duration` | `duration` | `0s` | Optional distribution window |
| `-diurnal` | `bool` | `false` | Apply the 24-hour traffic curve |
| `-multipage` | `bool` | `false` | Enable configured sub-path selection |
| `-paths` | `string` | `/,/about,/pricing` | Comma-separated paths |
| `-proxy` | `string` | `""` | HTTP/HTTPS/SOCKS5 proxy or pool |
| `-referer` | `string` | `https://www.google.com/` | Optional Referer header |
| `-timeout` | `duration` | `10s` | Per-request timeout |
| `-redirects` | `bool` | `true` | Follow redirects |
| `-v` | `bool` | `false` | Verbose request logging |

## 24-Hour Scheduling

For long-running authorized tests, the optional diurnal curve distributes work across a configurable time window instead of firing the entire workload immediately.

```bash
./clickhead -url="https://example.com" -requests=1000 -duration=24h -diurnal
```

## Proxy & Session Controls

A proxy pool can be supplied for environments where traffic needs to originate through controlled network infrastructure:

```bash
./clickhead \
  -url="https://example.com" \
  -proxy="http://proxy1.example:8080,http://proxy2.example:8080,socks5://127.0.0.1:9050" \
  -requests=500 \
  -concurrency=5
```

Each worker maintains its own cookie jar and HTTP client.

## Test Bench

ClickHead includes a local test bench for validating request counters and telemetry during development:

- `http://localhost:3000/test-page`
- `http://localhost:3000/api/test/visit`

```bash
./clickhead -url="http://localhost:3000/api/test/visit" -requests=50 -concurrency=3
```

## Architecture

```text
[ Job Producer ]
        │
        ▼
[ Buffered Job Channel ]
        │
   ┌────┼────┐
   ▼    ▼    ▼
 Worker Worker Worker ...
   │    │    │
   └────┼────┘
        ▼
[ Results Channel ]
        │
        ▼
[ Metrics Collector ] ──► Dashboard / Terminal
```

The core engine uses native Go concurrency primitives, isolated HTTP clients, buffered channels, synchronized metrics collection, and graceful signal handling.

## Project Structure

```text
ClickHead/
├── src/                 # React dashboard
│   ├── components/      # UI, diagnostics and telemetry views
│   ├── data/            # presets, profiles and Go source generator
│   └── utils/            # scheduling and browser-side transport
├── server.ts            # local API + SSE engine
├── public/              # static assets
└── package.json
```

## License & Use

ClickHead is intended for legitimate performance testing, diagnostics, development, and infrastructure validation. Always obtain authorization before generating load against a system you do not control.

---

<div align="center">

**ClickHead** · A `.dot` microtool

</div>
