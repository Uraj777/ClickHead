export type DistributionMode = 'instant' | 'spread-15m' | 'spread-1h' | 'spread-6h' | 'spread-12h' | 'spread-24h' | 'custom';

export interface LoadTestConfig {
  targetUrl: string;
  subPaths: string[];         // e.g. ["/", "/about", "/pricing", "/blog"] for realistic multi-page sessions
  enableMultiPage: boolean;   // simulate authentic multi-page browsing journeys
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
  // Proxy pool rotation
  proxyUrl?: string;          // single proxy or comma-separated list of proxies (http/https/socks5)
  enableProxyRotation: boolean;
  // WordPress & Jetpack / Analytics Tracking
  enableWordPressTracking?: boolean; // Automatically fires Jetpack stats pixel (pixel.wp.com) & WP AJAX counters
  jetpackBlogId?: string;           // Optional explicit Jetpack Blog ID (e.g. 175376211)
  wpPostId?: string;                // Optional WordPress Post ID (e.g. 1234)
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
  referer?: string;
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
