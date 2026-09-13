<div align="center">

# ⚡ CLICKHEAD

### Enterprise-Grade Organic Traffic Simulator & HTTP Load Engine in Go

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-24-hour-diurnal-curve">Diurnal Curve</a> •
  <a href="#-rotating-proxies">Proxy Pool</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-view-counter-test-bench">Test Bench</a>
</p>

<!-- Animated Badges & Status -->
<p align="center">
  <img src="https://img.shields.io/badge/Language-Go%201.21+-07110C?style=for-the-badge&logo=go&logoColor=B4F82C" alt="Go Version" />
  <img src="https://img.shields.io/badge/Architecture-Goroutine%20Worker%20Pool-07110C?style=for-the-badge&logo=webassembly&logoColor=B4F82C" alt="Architecture" />
  <img src="https://img.shields.io/badge/Detection%20Risk-Zero%20(Human%20Pacing)-07110C?style=for-the-badge&logo=shield&logoColor=B4F82C" alt="Zero Risk" />
  <img src="https://img.shields.io/badge/Telemetry-Atomic%20Percentiles-07110C?style=for-the-badge&logo=prometheus&logoColor=B4F82C" alt="Telemetry" />
</p>

```
========================================================================
         CLICKHEAD • REALISTIC GO TRAFFIC ENGINE & DAEMON               
========================================================================
  Target URL:        https://yourwebsite.com/article
  Total Requests:    100
  Concurrency:       3 Workers
  Pacing / Delay:    1.5s (+ max 800ms jitter)
  Rotating Proxies:  Direct / SOCKS5 / HTTP Pool
  User-Agent Pool:   7 Realistic Desktop & Mobile Profiles
------------------------------------------------------------------------
[*] Launching worker pool goroutines. Press Ctrl+C to stop early...

[█████████████████████████] 100.0% (100/100) | 200 OK: 100 | Fail: 0 | RPS: 1.8
```

</div>

---

## 🚀 Overview

**ClickHead** is a high-concurrency, realistic HTTP traffic simulation engine engineered in Go. Unlike primitive stress test tools (like ApacheBench or wrk) that bombard servers with unnatural, instantaneous spikes that trigger WAF bot-filters, **ClickHead** simulates authentic human browsing behavior:

- **24-Hour Diurnal Activity Scheduling**: Natural human waking/sleeping traffic weights.
- **Multi-Page Browsing Depth**: Simulated visitors land and explore subpages (`/about`, `/pricing`, `/blog`) rather than hitting one URL repeatedly.
- **Client Hints & User-Agent Rotation**: Modern Chrome 128, Safari 17.5 macOS & iOS, Firefox 129, and Edge 128 with matching `Sec-CH-UA` headers.
- **Cookie Jar Persistence**: Per-worker `net/http/cookiejar` retaining session cookies across requests.
- **SOCKS5 / HTTP Proxy Pool**: Worker-level proxy rotation to distribute traffic across distinct IP addresses.
- **Zero-Allocation Atomic Metrics**: Real-time throughput calculations, latency percentiles (**P50, P90, P95, P99**), and graceful SIGINT cleanup.

---

## 📦 Quick Start

### 1. Run Directly with Go (Zero Dependencies)

```bash
# Clone the repository
git clone https://github.com/your-username/clickhead.git
cd clickhead

# Run a natural 100-request organic delivery test
go run main.go -url="https://yourwebsite.com" -requests=100 -concurrency=3 -delay=1500ms -jitter=800ms
```

### 2. Compile Standalone Native Binary

```bash
# Build binary
go build -o clickhead main.go

# Run anywhere (Linux, macOS, Windows)
./clickhead -url="https://yourwebsite.com" -requests=500 -duration=1h -diurnal
```

---

## 🛠️ CLI Reference & Flags

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `-url` | `string` | `https://httpbin.org/get` | Target website or API endpoint URL |
| `-requests` | `int` | `100` | Total number of HTTP sessions / requests to execute |
| `-concurrency` | `int` | `3` | Parallel worker goroutines count |
| `-delay` | `duration` | `1000ms` | Base pacing delay between requests per worker (e.g. `1500ms`) |
| `-jitter` | `duration` | `500ms` | Maximum randomized jitter added to base delay for human rhythm |
| `-duration` | `duration` | `0s` | Total time spread window (e.g. `24h`, `6h`, `1h`, `15m`). `0s` = immediate |
| `-diurnal` | `bool` | `false` | Apply natural 24-hour diurnal human waking/sleeping traffic bell curve |
| `-multipage` | `bool` | `false` | Distribute requests across landing + subpages |
| `-paths` | `string` | `/,/about,/pricing` | Comma-separated sub-paths for multi-page session simulation |
| `-proxy` | `string` | `""` | Single or comma-separated proxy pool (`http://`, `https://`, `socks5://`) |
| `-referer` | `string` | `https://www.google.com/` | Custom HTTP Referer header to mimic search or social discovery |
| `-timeout` | `duration` | `10s` | HTTP request timeout per attempt |
| `-redirects` | `bool` | `true` | Follow HTTP 3xx redirects automatically |
| `-v` | `bool` | `false` | Verbose mode: print full log for every single HTTP response |

---

## 🕒 24-Hour Diurnal Traffic Curve

Real human visitors don't browse websites in a flat linear line. **ClickHead** utilizes diurnal curve modeling based on global web traffic distribution:

```
Hour (00:00 - 23:00)       Relative Traffic Weight
------------------------------------------------------
00:00 - 05:00 (Night)     ██░░░░░░░░  (1.0% - 2.0% / hr)
06:00 - 11:00 (Morning)   ███████░░░  (4.5% - 6.8% / hr)
12:00 - 17:00 (Peak Day)  ██████████  (7.0% - 7.5% / hr)
18:00 - 23:00 (Evening)   ██████░░░░  (3.0% - 6.5% / hr)
```

Enable with:
```bash
./clickhead -url="https://yourwebsite.com" -requests=1000 -duration=24h -diurnal
```

---

## 🛡️ Rotating Proxies & Session Cookie Jars

Distribute traffic over your proxy fleet to avoid single-IP rate limits:

```bash
./clickhead \
  -url="https://yourwebsite.com" \
  -proxy="http://user:pass@proxy1.com:8080,http://proxy2.com:8080,socks5://127.0.0.1:9050" \
  -requests=500 \
  -concurrency=5
```

Each worker retains its own **isolated cookie jar** and rotates across the proxy pool.

---

## 🧪 View Counter Test Bench

ClickHead includes an independent test endpoint to verify that view counts increment accurately and persist in browser storage:

- **Live Standalone Test Page**: `http://localhost:3000/test-page`
- **Counter API Endpoint**: `http://localhost:3000/api/test/visit`

```bash
# Test local persistent counter
./clickhead -url="http://localhost:3000/api/test/visit" -requests=50 -concurrency=3
```

---

## 🏗️ Architecture & Concurrency Model

ClickHead uses native Go runtime concurrency primitives:

```
[ Job Producer ] ──> (Buffered Job Channel) 
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
        [ Worker 1 ]  [ Worker 2 ]  [ Worker N ]
        (HTTP Client) (HTTP Client) (HTTP Client)
             │             │             │
             └─────────────┬─────────────┘
                           ▼
               (Buffered Results Channel)
                           │
                           ▼
                [ Metrics Collector ] ──> Terminal / SSE Stream
```

- **Thread Safety**: `sync/atomic` for zero-allocation real-time counters.
- **Graceful Shutdown**: Intercepts `os.Interrupt` (SIGINT / Ctrl+C) to drain workers and output final latency distributions.

---

<div align="center">

Built with ⚡ **ClickHead Engine** • High-Performance Systems Architecture

</div>
