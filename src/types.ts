export type DistributionMode = 'instant' | 'spread-15m' | 'spread-1h' | 'spread-6h' | 'spread-12h' | 'spread-24h' | 'custom';

export interface LoadTestConfig {
  targetUrl: string;
  totalRequests: number;
  concurrency: number;
  delayMs: number;
  jitterMs: number;
  timeoutSeconds: number;
  userAgentMode: 'realistic-rotation' | 'desktop-only' | 'mobile-only' | 'custom';
  customUserAgent?: string;
  followRedirects: boolean;
  referer: string;
  acceptEncoding: boolean;
  keepAlive: boolean;
  // Day distribution parameters
  distributionMode: DistributionMode;
  distributionMinutes: number; // total window in minutes
  useDiurnalCurve: boolean;    // human 24h bell curve
}

export interface TrafficPreset {
  id: string;
  name: string;
  tagline: string;
  category: 'organic' | 'moderate' | 'benchmark';
  icon: string;
  badgeColor: string;
  config: Partial<LoadTestConfig>;
  description: string;
  recommendedFor: string;
  riskLevel: 'Very Low (Safe)' | 'Low (Normal)' | 'Medium (Spike)' | 'High (Stress)';
}

export interface RequestMetric {
  id: number;
  workerId: number;
  url: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
  success: boolean;
  error?: string;
  userAgent: string;
  bytesReceived: number;
}

export interface AggregatedMetrics {
  totalSent: number;
  completed: number;
  successful: number; // 200 OK
  redirects: number;  // 3xx
  clientErrors: number; // 4xx
  serverErrors: number; // 5xx
  networkErrors: number;
  elapsedSeconds: number;
  currentRps: number;
  avgRps: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  totalBytes: number;
}

export interface TerminalLogEntry {
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'METRIC';
  workerId?: number;
  message: string;
  statusCode?: number;
  latencyMs?: number;
}
