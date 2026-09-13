import { AggregatedMetrics, LoadTestConfig, RequestMetric, TerminalLogEntry } from '../types';
import { REALISTIC_USER_AGENTS } from '../data/userAgents';

export class TrafficSimulator {
  private config: LoadTestConfig;
  private isRunning = false;
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
    if (this.isRunning || !this.config.targetUrl.trim()) return;
    this.isRunning = true;
    this.clientWorkersActive = false;

    this.onLog({
      timestamp: new Date().toISOString().substring(11, 23),
      level: 'INFO',
      message: `Initializing ${this.config.concurrency} concurrent workers for ${this.config.targetUrl}...`,
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
      enableWordPressTracking: String(this.config.enableWordPressTracking || false),
      jetpackBlogId: this.config.jetpackBlogId || '',
      wpPostId: this.config.wpPostId || '',
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
          message: `${this.config.totalRequests} requests queued with ${this.config.delayMs}ms pacing (+${this.config.jitterMs}ms jitter).`,
        });
      });

      es.addEventListener('metric', (e: MessageEvent) => {
        hasReceivedData = true;
        try {
          const data = JSON.parse(e.data);
          if (data.metric && data.aggregated) this.onMetric(data.metric, data.aggregated);
          if (data.log) this.onLog(data.log);
        } catch (err) {
          console.error('Failed to parse telemetry payload', err);
        }
      });

      es.addEventListener('complete', (e: MessageEvent) => {
        hasReceivedData = true;
        try {
          const data = JSON.parse(e.data);
          this.isRunning = false;
          this.eventSource?.close();
          this.eventSource = null;
          this.onLog({
            timestamp: new Date().toISOString().substring(11, 23),
            level: 'SUCCESS',
            message: `Finished: ${data.message || 'All requests processed.'}`,
          });
          if (data.finalMetrics) this.onComplete(data.finalMetrics);
        } catch (err) {
          console.error('Failed to parse completion payload', err);
        }
      });

      es.onerror = () => {
        if (!hasReceivedData && this.isRunning && !this.clientWorkersActive) {
          this.onLog({
            timestamp: new Date().toISOString().substring(11, 23),
            level: 'WARN',
            message: 'Server telemetry is unavailable. Using the browser transport test instead.',
          });
          es.close();
          this.eventSource = null;
          this.runClientSideSimulation();
        } else if (this.isRunning) {
          this.isRunning = false;
          es.close();
          this.eventSource = null;
          this.onLog({
            timestamp: new Date().toISOString().substring(11, 23),
            level: 'ERROR',
            message: 'Telemetry connection lost before the test completed.',
          });
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
    let nextRequestId = 1;

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
        avgDurationMs: count ? Math.round(sorted.reduce((a, b) => a + b, 0) / count) : 0,
        minDurationMs: count ? sorted[0] : 0,
        maxDurationMs: count ? sorted[count - 1] : 0,
        p50Ms: count ? sorted[Math.min(count - 1, Math.floor(count * 0.5))] : 0,
        p90Ms: count ? sorted[Math.min(count - 1, Math.floor(count * 0.9))] : 0,
        p95Ms: count ? sorted[Math.min(count - 1, Math.floor(count * 0.95))] : 0,
        p99Ms: count ? sorted[Math.min(count - 1, Math.floor(count * 0.99))] : 0,
      };
    };

    const runWorker = async (workerId: number) => {
      while (this.isRunning && nextRequestId <= totalRequests) {
        const reqId = nextRequestId++;
        const ua = REALISTIC_USER_AGENTS[Math.floor(Math.random() * REALISTIC_USER_AGENTS.length)];
        const reqStart = performance.now();
        let requestUrl = targetUrl;

        if (enableMultiPage && subPaths?.length) {
          const chosen = subPaths[Math.floor(Math.random() * subPaths.length)];
          requestUrl = chosen.startsWith('http') ? chosen : `${targetUrl.replace(/\/+$/, '')}${chosen}`;
        }

        let success = false;
        let statusCode = 0;
        let error: string | undefined;
        let bytesReceived = 0;

        try {
          if (!requestUrl.startsWith('http')) throw new Error('Target must use HTTP or HTTPS.');
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), Math.max(1000, this.config.timeoutSeconds * 1000));
          try {
            const response = await fetch(requestUrl, { mode: 'no-cors', signal: controller.signal });
            success = true;
            // no-cors responses are opaque; the browser intentionally does not expose status/body size.
            if (response.type !== 'opaque') {
              statusCode = response.status;
              const length = response.headers.get('content-length');
              bytesReceived = length ? Number(length) || 0 : 0;
            }
          } finally {
            clearTimeout(timeout);
          }
        } catch (err) {
          error = err instanceof Error ? err.message : 'Network request failed';
        }

        const duration = Math.max(1, Math.round(performance.now() - reqStart));
        completed++;
        if (success) successful++;
        totalBytes += bytesReceived;
        latencies.push(duration);

        const metric: RequestMetric = {
          id: reqId,
          timestamp: Date.now(),
          workerId,
          url: requestUrl,
          statusCode,
          durationMs: duration,
          bytesReceived,
          userAgent: ua.name,
          referer: referer || 'Direct',
          success,
          error,
        };

        this.onMetric(metric, getAggregated());
        this.onLog({
          timestamp: new Date().toISOString().substring(11, 23),
          level: success ? 'INFO' : 'ERROR',
          message: `Worker #${workerId} [Req #${reqId}/${totalRequests}] → ${requestUrl} [${success ? 'transport OK' : error || 'failed'}${statusCode ? ` / HTTP ${statusCode}` : ''}, ${duration}ms]`,
        });

        const actualJitter = jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0;
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, delayMs + actualJitter)));
      }
    };

    const workers = Array.from({ length: Math.min(Math.max(1, concurrency), totalRequests) }, (_, i) => runWorker(i + 1));
    await Promise.all(workers);

    if (this.isRunning) {
      this.isRunning = false;
      const finalMetrics = getAggregated();
      this.onLog({
        timestamp: new Date().toISOString().substring(11, 23),
        level: 'SUCCESS',
        message: `Browser transport test complete: ${completed} requests dispatched. Avg RPS: ${finalMetrics.avgRps.toFixed(1)}`,
      });
      this.onComplete(finalMetrics);
    }
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    fetch('/api/traffic/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId }),
    }).catch(() => {});
    this.eventSource?.close();
    this.eventSource = null;
    this.onLog({
      timestamp: new Date().toISOString().substring(11, 23),
      level: 'WARN',
      message: 'Stop signal sent. Test terminated.',
    });
  }
}
