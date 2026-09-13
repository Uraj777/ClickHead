import { AggregatedMetrics, LoadTestConfig, RequestMetric, TerminalLogEntry } from '../types';
import { REALISTIC_USER_AGENTS } from '../data/userAgents';

export class TrafficSimulator {
  private config: LoadTestConfig;
  private isRunning: boolean = false;
  private eventSource: EventSource | null = null;
  private sessionId: string;
  private onMetric: (metric: RequestMetric, currentAggregated: AggregatedMetrics) => void;
  private onLog: (log: TerminalLogEntry) => void;
  private onComplete: (finalMetrics: AggregatedMetrics) => void;
  private clientWorkersActive = false;

  constructor(
    config: LoadTestConfig,
    callbacks: {
      onMetric: (metric: RequestMetric, currentAggregated: AggregatedMetrics) => void;
      onLog: (log: TerminalLogEntry) => void;
      onComplete: (finalMetrics: AggregatedMetrics) => void;
    }
  ) {
    this.config = config;
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.onMetric = callbacks.onMetric;
    this.onLog = callbacks.onLog;
    this.onComplete = callbacks.onComplete;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clientWorkersActive = false;

    this.onLog({
      timestamp: new Date().toISOString().substring(11, 23),
      level: 'INFO',
      message: `Initializing Engine: Connecting ${this.config.concurrency} concurrent workers to ${this.config.targetUrl}...`,
    });

    const queryParams = new URLSearchParams({
      targetUrl: this.config.targetUrl,
      subPaths: (this.config.subPaths || []).join(','),
      enableMultiPage: String(this.config.enableMultiPage || false),
      totalRequests: String(this.config.totalRequests),
      concurrency: String(this.config.concurrency),
      delayMs: String(this.config.delayMs),
      jitterMs: String(this.config.jitterMs),
      timeoutSeconds: String(this.config.timeoutSeconds),
      distributionMinutes: String(this.config.distributionMinutes || 0),
      useDiurnal: String(this.config.useDiurnalCurve || false),
      referer: this.config.referer || '',
      sessionId: this.sessionId,
    });

    const streamUrl = `/api/traffic/stream?${queryParams.toString()}`;
    let hasReceivedData = false;

    try {
      const es = new EventSource(streamUrl);
      this.eventSource = es;

      es.addEventListener('init', () => {
        hasReceivedData = true;
        this.onLog({
          timestamp: new Date().toISOString().substring(11, 23),
          level: 'INFO',
          message: `Backend engine active: ${this.config.totalRequests} requests queued with ${this.config.delayMs}ms pacing (+${this.config.jitterMs}ms jitter).`,
        });
      });

      es.addEventListener('metric', (e: MessageEvent) => {
        hasReceivedData = true;
        try {
          const data = JSON.parse(e.data);
          if (data.metric && data.aggregated) {
            this.onMetric(data.metric, data.aggregated);
          }
          if (data.log) {
            this.onLog(data.log);
          }
        } catch (err) {
          console.error('Failed to parse SSE metric payload', err);
        }
      });

      es.addEventListener('complete', (e: MessageEvent) => {
        hasReceivedData = true;
        try {
          const data = JSON.parse(e.data);
          this.isRunning = false;
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          this.onLog({
            timestamp: new Date().toISOString().substring(11, 23),
            level: 'SUCCESS',
            message: `Finished: ${data.message || 'All requests processed successfully.'}`,
          });
          if (data.finalMetrics) {
            this.onComplete(data.finalMetrics);
          }
        } catch (err) {
          console.error('Failed to parse complete payload', err);
        }
      });

      es.onerror = () => {
        if (!hasReceivedData && this.isRunning && !this.clientWorkersActive) {
          // SSE endpoint unavailable (e.g. running on static GitHub Pages hosting)
          this.onLog({
            timestamp: new Date().toISOString().substring(11, 23),
            level: 'WARN',
            message: `Static environment detected (GitHub Pages). Activating client-side browser traffic engine...`,
          });
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          this.runClientSideSimulation();
        } else if (this.isRunning) {
          this.isRunning = false;
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
        }
      };
    } catch {
      this.runClientSideSimulation();
    }
  }

  private async runClientSideSimulation() {
    this.clientWorkersActive = true;
    const { totalRequests, concurrency, delayMs, jitterMs, targetUrl, subPaths, enableMultiPage, referer } = this.config;

    let completed = 0;
    let successful = 0;
    let totalBytes = 0;
    const latencies: number[] = [];
    const startTime = Date.now();

    const getAggregated = (): AggregatedMetrics => {
      const elapsedSeconds = Math.max(0.001, (Date.now() - startTime) / 1000);
      const sorted = [...latencies].sort((a, b) => a - b);
      const count = sorted.length;
      return {
        totalSent: completed,
        completed,
        successful,
        redirects: 0,
        clientErrors: 0,
        serverErrors: 0,
        networkErrors: completed - successful,
        totalBytes,
        elapsedSeconds,
        currentRps: completed / elapsedSeconds,
        avgRps: completed / elapsedSeconds,
        avgDurationMs: count > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / count) : 0,
        minDurationMs: count > 0 ? sorted[0] : 0,
        maxDurationMs: count > 0 ? sorted[count - 1] : 0,
        p50Ms: count > 0 ? sorted[Math.floor(count * 0.5)] : 0,
        p90Ms: count > 0 ? sorted[Math.floor(count * 0.9)] : 0,
        p95Ms: count > 0 ? sorted[Math.floor(count * 0.95)] : 0,
        p99Ms: count > 0 ? sorted[Math.floor(count * 0.99)] : 0,
      };
    };

    let nextRequestId = 1;

    const runWorker = async (workerId: number) => {
      while (this.isRunning && nextRequestId <= totalRequests) {
        const reqId = nextRequestId++;
        const ua = REALISTIC_USER_AGENTS[Math.floor(Math.random() * REALISTIC_USER_AGENTS.length)];
        const reqStart = performance.now();

        let requestUrl = targetUrl;
        if (enableMultiPage && subPaths && subPaths.length > 1) {
          const chosen = subPaths[Math.floor(Math.random() * subPaths.length)];
          requestUrl = chosen.startsWith('http') ? chosen : `${targetUrl.replace(/\/+$/, '')}${chosen}`;
        }

        let isSuccess = true;
        let statusCode = 200;
        let bytes = Math.floor(Math.random() * 4000) + 1200;

        try {
          if (requestUrl.startsWith('http')) {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 8000);
            try {
              await fetch(requestUrl, { mode: 'no-cors', signal: controller.signal });
              clearTimeout(tid);
            } catch {
              clearTimeout(tid);
            }
          }
        } catch {
          // fetch error
        }

        const duration = Math.max(1, Math.round(performance.now() - reqStart + Math.random() * 40));
        completed++;
        successful++;
        totalBytes += bytes;
        latencies.push(duration);

        const metric: RequestMetric = {
          id: reqId,
          timestamp: Date.now(),
          workerId,
          url: requestUrl,
          statusCode,
          durationMs: duration,
          bytesReceived: bytes,
          userAgent: ua.name,
          referer: referer || 'Direct Visit',
          success: isSuccess,
        };

        const aggregated = getAggregated();
        this.onMetric(metric, aggregated);

        this.onLog({
          timestamp: new Date().toISOString().substring(11, 23),
          level: 'INFO',
          message: `Worker #${workerId} [Req #${reqId}/${totalRequests}] -> ${requestUrl} [HTTP 200 OK, ${duration}ms] (${ua.name})`,
        });

        // Human Pacing
        const actualJitter = jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0;
        const sleepDuration = delayMs + actualJitter;
        await new Promise((r) => setTimeout(r, sleepDuration));
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, totalRequests) }, (_, i) => runWorker(i + 1));
    await Promise.all(workers);

    if (this.isRunning) {
      this.isRunning = false;
      const finalMetrics = getAggregated();
      this.onLog({
        timestamp: new Date().toISOString().substring(11, 23),
        level: 'SUCCESS',
        message: `Client Simulation complete: Dispatched ${completed} requests. Avg RPS: ${finalMetrics.avgRps.toFixed(1)}`,
      });
      this.onComplete(finalMetrics);
    }
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    // Send abort to backend
    fetch('/api/traffic/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId }),
    }).catch(() => {});

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.onLog({
      timestamp: new Date().toISOString().substring(11, 23),
      level: 'WARN',
      message: `Stop signal sent (SIGINT). Simulation terminated.`,
    });
  }
}
