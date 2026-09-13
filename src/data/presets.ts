import { TrafficPreset } from '../types';

export const TRAFFIC_PRESETS: TrafficPreset[] = [
  {
    id: 'organic-drip',
    name: 'Normal Organic Traffic (Recommended)',
    tagline: 'Natural human browsing session simulation with variable jitter',
    category: 'organic',
    icon: 'Sparkles',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
    config: {
      totalRequests: 100,
      concurrency: 3,
      delayMs: 1500,
      jitterMs: 800,
      timeoutSeconds: 10,
      userAgentMode: 'realistic-rotation',
      referer: 'https://www.google.com/',
      followRedirects: true,
      keepAlive: true,
    },
    description:
      'Ideal for generating realistic, natural website visits without triggering rate limiters, CDN bot filters (Cloudflare/AWS WAF), or abnormal server spikes. Simulates 3 concurrent readers reading content with 1.5s - 2.3s pacing.',
    recommendedFor: 'Normal view generation, personal portfolio/blog warmup, baseline analytics testing.',
    riskLevel: 'Very Low (Safe)'
  },
  {
    id: 'steady-day-traffic',
    name: 'Steady Moderate Stream',
    tagline: 'Continuous gentle stream mimicking a live active community',
    category: 'moderate',
    icon: 'TrendingUp',
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80',
    config: {
      totalRequests: 500,
      concurrency: 6,
      delayMs: 800,
      jitterMs: 400,
      timeoutSeconds: 10,
      userAgentMode: 'realistic-rotation',
      referer: 'https://news.ycombinator.com/',
      followRedirects: true,
      keepAlive: true,
    },
    description:
      'Provides a consistent flow of 500 distributed requests across 6 workers with modest human pacing. Simulates a viral post or newsletter traffic spike.',
    recommendedFor: 'Simulating product launch traffic, caching layer validation, uptime monitor validation.',
    riskLevel: 'Low (Normal)'
  },
  {
    id: 'peak-hour-surge',
    name: 'Peak Hour Surge',
    tagline: 'Higher concurrency with tight pacing for load testing',
    category: 'benchmark',
    icon: 'Zap',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
    config: {
      totalRequests: 1500,
      concurrency: 15,
      delayMs: 250,
      jitterMs: 100,
      timeoutSeconds: 8,
      userAgentMode: 'realistic-rotation',
      referer: '',
      followRedirects: true,
      keepAlive: true,
    },
    description:
      'Pushes 15 parallel workers with 250ms pacing to simulate heavy concurrent usage, verifying if your web server auto-scales or handles concurrent socket pools.',
    recommendedFor: 'Backend performance tuning, database connection pool stress test.',
    riskLevel: 'Medium (Spike)'
  },
  {
    id: 'stress-capacity-test',
    name: 'High Concurrency Benchmark',
    tagline: 'Maximum throughput without pacing to find breaking points',
    category: 'benchmark',
    icon: 'Flame',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800/80',
    config: {
      totalRequests: 3000,
      concurrency: 30,
      delayMs: 0,
      jitterMs: 0,
      timeoutSeconds: 5,
      userAgentMode: 'desktop-only',
      referer: '',
      followRedirects: true,
      keepAlive: true,
    },
    description:
      'Full throttle benchmark with 0ms delay to calculate maximum requests per second (RPS) and latency percentiles (P50/P90/P99).',
    recommendedFor: 'Server capacity planning, CDN benchmark, microservice load testing.',
    riskLevel: 'High (Stress)'
  }
];
