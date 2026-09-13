import express from 'express';
import path from 'path';
import http from 'http';
import https from 'https';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// List of realistic modern user agents
const USER_AGENTS = [
  {
    name: 'Chrome 128 (Windows 11)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    secChUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    platform: '"Windows"',
  },
  {
    name: 'Chrome 128 (macOS Sonoma)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    secChUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    platform: '"macOS"',
  },
  {
    name: 'Safari 17.5 (macOS Sonoma)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    secChUa: '',
    platform: '"macOS"',
  },
  {
    name: 'Firefox 129 (Windows 11)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0',
    secChUa: '',
    platform: '"Windows"',
  },
  {
    name: 'Edge 128 (Windows 11)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    secChUa: '"Chromium";v="128", "Microsoft Edge";v="128", "Not;A=Brand";v="24"',
    platform: '"Windows"',
  },
  {
    name: 'Safari 17.5 (iPhone iOS 17.5)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    secChUa: '',
    platform: '"iOS"',
  },
  {
    name: 'Chrome 128 (Android 14)',
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
    secChUa: '"Chromium";v="128", "Google Chrome";v="128", "Not;A=Brand";v="24"',
    platform: '"Android"',
  },
];

// Diurnal hourly human traffic curve weights (Hour 0 to Hour 23)
const DIURNAL_WEIGHTS = [
  0.020, 0.015, 0.012, 0.010, 0.012, 0.020, // 00:00 - 05:00 Night
  0.035, 0.048, 0.058, 0.062, 0.065, 0.068, // 06:00 - 11:00 Morning
  0.066, 0.069, 0.073, 0.075, 0.072, 0.068, // 12:00 - 17:00 Afternoon Peak
  0.065, 0.060, 0.052, 0.042, 0.032, 0.021, // 18:00 - 23:00 Evening
];

// Active running tasks map for stop/abort functionality
const activeSessions = new Map<string, { abort: () => void }>();

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API: Abort an active traffic session
app.post('/api/traffic/stop', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && activeSessions.has(sessionId)) {
    activeSessions.get(sessionId)?.abort();
    activeSessions.delete(sessionId);
    res.json({ success: true, message: 'Session aborted' });
  } else {
    res.json({ success: false, message: 'Session not found or already completed' });
  }
});

// API: Real Server-Side Concurrent HTTP Traffic Stream (SSE)
app.get('/api/traffic/stream', async (req, res) => {
  const targetUrl = (req.query.targetUrl as string) || 'https://httpbin.org/get';
  const totalRequests = Math.min(2000, Math.max(1, parseInt(req.query.totalRequests as string, 10) || 20));
  const concurrency = Math.min(50, Math.max(1, parseInt(req.query.concurrency as string, 10) || 3));
  let delayMs = Math.max(0, parseInt(req.query.delayMs as string, 10) || 1000);
  let jitterMs = Math.max(0, parseInt(req.query.jitterMs as string, 10) || 500);
  const distributionMinutes = Math.max(0, parseInt(req.query.distributionMinutes as string, 10) || 0);
  const useDiurnal = req.query.useDiurnal === 'true';
  const referer = (req.query.referer as string) || '';
  const timeoutSeconds = Math.max(1, parseInt(req.query.timeoutSeconds as string, 10) || 10);
  const sessionId = (req.query.sessionId as string) || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // If time distribution window is set (> 0 minutes), compute realistic human interval
  if (distributionMinutes > 0) {
    const totalSeconds = distributionMinutes * 60;
    let effectiveViewsPerHour = totalRequests / (distributionMinutes / 60);
    
    if (useDiurnal && distributionMinutes >= 60) {
      const currentHour = new Date().getHours();
      const hourWeight = DIURNAL_WEIGHTS[currentHour];
      const viewsThisHour = Math.max(1, totalRequests * hourWeight * (24 / (distributionMinutes / 60)));
      effectiveViewsPerHour = viewsThisHour;
    }
    
    const avgIntervalSec = Math.max(0.5, (3600 / Math.max(1, effectiveViewsPerHour)) * concurrency);
    delayMs = Math.round(avgIntervalSec * 1000);
    jitterMs = Math.round(delayMs * 0.35); // 35% natural jitter
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      res.status(400).json({ error: 'URL must use http or https protocol' });
      return;
    }
  } catch (err) {
    res.status(400).json({ error: 'Invalid URL format' });
    return;
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let isAborted = false;
  const abortSession = () => {
    isAborted = true;
  };

  activeSessions.set(sessionId, { abort: abortSession });
  req.on('close', () => {
    isAborted = true;
    activeSessions.delete(sessionId);
  });

  const sendSSE = (event: string, data: any) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendSSE('init', {
    sessionId,
    targetUrl,
    totalRequests,
    concurrency,
    delayMs,
    jitterMs,
    distributionMinutes,
    useDiurnal,
    referer,
  });

  // Custom HTTP/HTTPS agents with connection pooling
  const httpAgent = new http.Agent({ keepAlive: true, maxSockets: concurrency * 4 });
  const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: concurrency * 4, rejectUnauthorized: false });

  // Telemetry state
  let totalSent = 0;
  let completed = 0;
  let successful = 0;
  let redirects = 0;
  let clientErrors = 0;
  let serverErrors = 0;
  let networkErrors = 0;
  let totalBytes = 0;
  const latencies: number[] = [];
  const startTime = Date.now();

  const getAggregated = () => {
    const elapsedSeconds = Math.max(0.001, (Date.now() - startTime) / 1000);
    const sorted = [...latencies].sort((a, b) => a - b);
    const count = sorted.length;
    return {
      totalSent,
      completed,
      successful,
      redirects,
      clientErrors,
      serverErrors,
      networkErrors,
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

  // Job queue for workers
  const jobQueue: number[] = Array.from({ length: totalRequests }, (_, i) => i + 1);
  let jobIndex = 0;

  // Single HTTP Request Executor executed natively in Node.js
  const executeSingleRequest = async (workerId: number, reqId: number): Promise<void> => {
    const uaObj = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const reqStart = performance.now();
    const timestamp = Date.now();

    const headers: Record<string, string> = {
      'User-Agent': uaObj.ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
    };

    if (uaObj.secChUa) {
      headers['sec-ch-ua'] = uaObj.secChUa;
      headers['sec-ch-ua-mobile'] = '?0';
      headers['sec-ch-ua-platform'] = uaObj.platform;
    }

    if (referer) {
      headers['Referer'] = referer;
    }

    let statusCode = 0;
    let bytesRead = 0;
    let isSuccess = false;
    let errorMsg: string | undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

      const fetchPromise = fetch(targetUrl, {
        method: 'GET',
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });

      const response = await fetchPromise;
      clearTimeout(timeoutId);

      statusCode = response.status;
      const arrayBuf = await response.arrayBuffer();
      bytesRead = arrayBuf.byteLength || 0;
      isSuccess = statusCode >= 200 && statusCode < 400;
    } catch (err: any) {
      isSuccess = false;
      if (err.name === 'AbortError') {
        errorMsg = 'Timeout reached';
      } else {
        errorMsg = err.message || 'Connection failed';
      }
    }

    const durationMs = Math.max(1, Math.round(performance.now() - reqStart));

    totalSent++;
    completed++;
    totalBytes += bytesRead;

    if (isSuccess) {
      if (statusCode >= 300 && statusCode < 400) {
        redirects++;
      } else {
        successful++;
      }
      latencies.push(durationMs);
    } else {
      if (statusCode >= 400 && statusCode < 500) {
        clientErrors++;
      } else if (statusCode >= 500) {
        serverErrors++;
      } else {
        networkErrors++;
      }
    }

    const metric = {
      id: reqId,
      workerId,
      url: targetUrl,
      statusCode,
      durationMs,
      timestamp,
      success: isSuccess,
      error: errorMsg,
      userAgent: uaObj.name,
      bytesReceived: bytesRead,
    };

    const aggregated = getAggregated();

    sendSSE('metric', {
      metric,
      aggregated,
      log: {
        timestamp: new Date(timestamp).toISOString().substring(11, 23),
        level: isSuccess ? 'SUCCESS' : 'ERROR',
        workerId,
        statusCode,
        latencyMs: durationMs,
        message: isSuccess
          ? `[Worker ${String(workerId).padStart(2, '0')}] #${String(reqId).padStart(4, '0')} HTTP ${statusCode} in ${durationMs}ms | ${uaObj.name} | ${bytesRead} bytes`
          : `[Worker ${String(workerId).padStart(2, '0')}] #${String(reqId).padStart(4, '0')} FAIL (${errorMsg || `HTTP ${statusCode}`}) in ${durationMs}ms`,
      },
    });
  };

  // Worker routine
  const runWorker = async (workerId: number) => {
    while (!isAborted) {
      let currentReqId: number | null = null;
      if (jobIndex < jobQueue.length) {
        currentReqId = jobQueue[jobIndex];
        jobIndex++;
      } else {
        break;
      }

      // Pacing & Jitter delay
      if (delayMs > 0) {
        const jitter = jitterMs > 0 ? Math.random() * jitterMs : 0;
        const sleepTime = delayMs + jitter;
        await new Promise((r) => setTimeout(r, sleepTime));
      }

      if (isAborted) break;

      await executeSingleRequest(workerId, currentReqId);
    }
  };

  // Launch worker pool
  const workers: Promise<void>[] = [];
  for (let w = 1; w <= concurrency; w++) {
    workers.push(runWorker(w));
  }

  await Promise.all(workers);

  const finalAggregated = getAggregated();
  sendSSE('complete', {
    finalMetrics: finalAggregated,
    message: `Completed ${completed} requests in ${finalAggregated.elapsedSeconds.toFixed(2)}s.`,
  });

  activeSessions.delete(sessionId);
  res.end();
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

startServer();
