import { AggregatedMetrics, LoadTestConfig, RequestMetric, TerminalLogEntry } from '../types';

export class TrafficSimulator {
  private config: LoadTestConfig;
  private isRunning: boolean = false;
  private eventSource: EventSource | null = null;
  private sessionId: string;
  private onMetric: (metric: RequestMetric, currentAggregated: AggregatedMetrics) => void;
  private onLog: (log: TerminalLogEntry) => void;
  private onComplete: (finalMetrics: AggregatedMetrics) => void;

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

    this.onLog({
      timestamp: new Date().toISOString().substring(11, 23),
      level: 'INFO',
      message: `Connecting to Real Backend Engine: Dispatching ${this.config.concurrency} concurrent worker goroutines/threads to ${this.config.targetUrl}...`,
    });

    const queryParams = new URLSearchParams({
      targetUrl: this.config.targetUrl,
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
    const es = new EventSource(streamUrl);
    this.eventSource = es;

    es.addEventListener('init', (e) => {
      this.onLog({
        timestamp: new Date().toISOString().substring(11, 23),
        level: 'INFO',
        message: `Backend worker pool active: ${this.config.totalRequests} requests queued with ${this.config.delayMs}ms pacing (+${this.config.jitterMs}ms jitter). Real HTTP packets in flight.`,
      });
    });

    es.addEventListener('metric', (e: MessageEvent) => {
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
          message: `Finished: ${data.message || 'All requests processed successfully by backend engine.'}`,
        });
        if (data.finalMetrics) {
          this.onComplete(data.finalMetrics);
        }
      } catch (err) {
        console.error('Failed to parse complete payload', err);
      }
    });

    es.onerror = (err) => {
      if (this.isRunning) {
        this.onLog({
          timestamp: new Date().toISOString().substring(11, 23),
          level: 'WARN',
          message: `Stream ended or connection closed by backend.`,
        });
      }
      this.isRunning = false;
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    };
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    // Send abort to backend
    fetch('/api/traffic/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId }),
    }).catch((err) => console.error('Error aborting session:', err));

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.onLog({
      timestamp: new Date().toISOString().substring(11, 23),
      level: 'WARN',
      message: `Stop signal sent (SIGINT). Terminated backend worker pool and active HTTP sockets.`,
    });
  }
}
