export type DistributionMode = 'instant' | 'spread-15m' | 'spread-1h' | 'spread-6h' | 'spread-12h' | 'spread-24h' | 'custom';

export interface LoadTestConfig {
  targetUrl: string;
  subPaths: string[];
  enableMultiPage: boolean;
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
  proxyUrl?: string;
  enableProxyRotation: boolean;
  enableWordPressTracking?: boolean;
  jetpackBlogId?: string;
  wpPostId?: string;
  distributionMode: DistributionMode;
  distributionMinutes: number;
  useDiurnalCurve: boolean;
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
  riskLevel: 'Low (Test)' | 'Medium (Load)' | 'High (Stress)';
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
  referer?: string;
  bytesReceived: number;
}

export interface AggregatedMetrics {
  totalSent: number;
  completed: number;
  successful: number;
  redirects: number;
  clientErrors: number;
  serverErrors: number;
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
