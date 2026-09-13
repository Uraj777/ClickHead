import { LoadTestConfig } from '../types';

export function generateGoScript(config: LoadTestConfig): string {
  return `// Package main implements an idiomatic, high-concurrency HTTP load testing
// and realistic user traffic simulation engine in Go.
//
// Architected by Senior Backend Systems Engineer standards:
// - Worker Pool pattern using native goroutines, buffered channels, and sync.WaitGroup
// - Tuned http.Transport with connection reuse (Keep-Alive) and custom timeouts
// - Realistic User-Agent rotation and HTTP headers to simulate authentic browsing
// - Pacing and randomized human jitter distribution
// - Thread-safe atomic metrics aggregation and latency percentile calculation (P50, P90, P99)
// - ANSI-styled terminal output with real-time progress and summary statistics
package main

import (
	"context"
	"crypto/tls"
	"flag"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

// ANSI color codes for clean terminal metrics reporting
const (
	ColorReset   = "\\033[0m"
	ColorRed     = "\\033[31m"
	ColorGreen   = "\\033[32m"
	ColorYellow  = "\\033[33m"
	ColorBlue    = "\\033[34m"
	ColorMagenta = "\\033[35m"
	ColorCyan    = "\\033[36m"
	ColorGray    = "\\033[90m"
	ColorBold    = "\\033[1m"
)

// UserAgentProfile defines realistic browser client profiles
type UserAgentProfile struct {
	Name      string
	UserAgent string
	SecChUa   string
	Platform  string
}

// Curated pool of modern, real-world browser User-Agents
var realisticUserAgents = []UserAgentProfile{
	{
		Name:      "Chrome 128 / Windows 11",
		UserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
		SecChUa:   "\\"Chromium\\";v=\\"128\\", \\"Not;A=Brand\\";v=\\"24\\", \\"Google Chrome\\";v=\\"128\\"",
		Platform:  "\\"Windows\\"",
	},
	{
		Name:      "Chrome 128 / macOS Sonoma",
		UserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
		SecChUa:   "\\"Chromium\\";v=\\"128\\", \\"Not;A=Brand\\";v=\\"24\\", \\"Google Chrome\\";v=\\"128\\"",
		Platform:  "\\"macOS\\"",
	},
	{
		Name:      "Safari 17.5 / macOS Sonoma",
		UserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
		SecChUa:   "",
		Platform:  "\\"macOS\\"",
	},
	{
		Name:      "Firefox 129 / Windows 11",
		UserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
		SecChUa:   "",
		Platform:  "\\"Windows\\"",
	},
	{
		Name:      "Edge 128 / Windows 11",
		UserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
		SecChUa:   "\\"Chromium\\";v=\\"128\\", \\"Microsoft Edge\\";v=\\"128\\", \\"Not;A=Brand\\";v=\\"24\\"",
		Platform:  "\\"Windows\\"",
	},
	{
		Name:      "Safari 17.5 / iPhone iOS 17.5",
		UserAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
		SecChUa:   "",
		Platform:  "\\"iOS\\"",
	},
	{
		Name:      "Chrome 128 / Android 14",
		UserAgent: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36",
		SecChUa:   "\\"Chromium\\";v=\\"128\\", \\"Google Chrome\\";v=\\"128\\", \\"Not;A=Brand\\";v=\\"24\\"",
		Platform:  "\\"Android\\"",
	},
}

// Diurnal hourly human traffic curve weights (Hour 0 to Hour 23)
var diurnalHourlyWeights = [24]float64{
	0.020, 0.015, 0.012, 0.010, 0.012, 0.020, // 00:00 - 05:00 Night
	0.035, 0.048, 0.058, 0.062, 0.065, 0.068, // 06:00 - 11:00 Morning
	0.066, 0.069, 0.073, 0.075, 0.072, 0.068, // 12:00 - 17:00 Afternoon Peak
	0.065, 0.060, 0.052, 0.042, 0.032, 0.021, // 18:00 - 23:00 Evening
}

// Config encapsulates all CLI runtime options
type Config struct {
	TargetURL      string
	TotalRequests  int
	Concurrency    int
	BaseDelay      time.Duration
	JitterDelay    time.Duration
	Duration       time.Duration
	DiurnalCurve   bool
	Timeout        time.Duration
	Referer        string
	FollowRedirect bool
	InsecureTLS    bool
	CustomUA       string
	Verbose        bool
}

// RequestResult holds the outcome of a single HTTP call
type RequestResult struct {
	WorkerID     int
	RequestID    int
	StatusCode   int
	Duration     time.Duration
	BytesRead    int64
	Err          error
	Timestamp    time.Time
	UserAgentTag string
}

// MetricsCollector aggregates real-time and summary telemetry
type MetricsCollector struct {
	mu           sync.Mutex
	TotalSent    int64
	Success200   int64
	Redirects3xx int64
	ClientErr4xx int64
	ServerErr5xx int64
	NetworkErrs  int64
	TotalBytes   int64
	Latencies    []time.Duration
	StartTime    time.Time
	EndTime      time.Time
}

// Record appends a single result to thread-safe counters
func (m *MetricsCollector) Record(res RequestResult) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.TotalSent++
	m.TotalBytes += res.BytesRead

	if res.Err != nil {
		m.NetworkErrs++
		return
	}

	m.Latencies = append(m.Latencies, res.Duration)

	switch {
	case res.StatusCode == http.StatusOK:
		m.Success200++
	case res.StatusCode >= 300 && res.StatusCode < 400:
		m.Redirects3xx++
	case res.StatusCode >= 400 && res.StatusCode < 500:
		m.ClientErr4xx++
	case res.StatusCode >= 500:
		m.ServerErr5xx++
	default:
		// Non-200 2xx codes or unusual status codes
	}
}

func main() {
	// Parse CLI flags with sensible production defaults
	cfg := Config{}
	flag.StringVar(&cfg.TargetURL, "url", "${config.targetUrl || 'https://httpbin.org/get'}", "Target URL to test/simulate traffic on")
	flag.IntVar(&cfg.TotalRequests, "requests", ${config.totalRequests || 100}, "Total number of HTTP requests to execute")
	flag.IntVar(&cfg.Concurrency, "concurrency", ${config.concurrency || 5}, "Concurrency limit (number of parallel worker goroutines)")
	flag.DurationVar(&cfg.BaseDelay, "delay", ${config.delayMs || 1000} * time.Millisecond, "Base pacing delay between requests per worker (e.g., 500ms, 1s)")
	flag.DurationVar(&cfg.JitterDelay, "jitter", ${config.jitterMs || 500} * time.Millisecond, "Max randomized jitter added to base delay for realistic human pacing")
	flag.DurationVar(&cfg.Duration, "duration", ${config.distributionMinutes ? config.distributionMinutes + ' * time.Minute' : '0'}, "Total time spread window (e.g., 24h, 6h, 1h, 15m, 0s). 0 = immediate")
	flag.BoolVar(&cfg.DiurnalCurve, "diurnal", ${config.useDiurnalCurve || false}, "Apply natural 24-hour diurnal human waking/sleeping curve")
	flag.DurationVar(&cfg.Timeout, "timeout", ${config.timeoutSeconds || 10} * time.Second, "HTTP request timeout per attempt")
	flag.StringVar(&cfg.Referer, "referer", "${config.referer || 'https://www.google.com/'}", "Custom HTTP Referer header to mimic search or social discovery")
	flag.BoolVar(&cfg.FollowRedirect, "redirects", ${config.followRedirects !== false}, "Follow HTTP 3xx redirects automatically")
	flag.BoolVar(&cfg.InsecureTLS, "insecure", false, "Skip TLS/SSL certificate verification")
	flag.StringVar(&cfg.CustomUA, "ua", "", "Override User-Agent (leave blank for realistic browser rotation)")
	flag.BoolVar(&cfg.Verbose, "v", false, "Print detailed log for every single request")
	flag.Parse()

	// Validate target URL
	parsedURL, err := url.ParseRequestURI(cfg.TargetURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		fmt.Printf("%s[ERROR] Invalid Target URL: %s. Must start with http:// or https://%s\\n", ColorRed, cfg.TargetURL, ColorReset)
		os.Exit(1)
	}

	if cfg.Concurrency < 1 {
		cfg.Concurrency = 1
	}
	if cfg.TotalRequests < 1 {
		cfg.TotalRequests = 1
	}

	printBanner(cfg)

	// Context with graceful cancellation on SIGINT (Ctrl+C) or SIGTERM
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Printf("\\n%s[!] Interrupt received. Draining workers and calculating final metrics...%s\\n", ColorYellow, ColorReset)
		cancel()
	}()

	// Build optimized HTTP Client Transport
	transport := &http.Transport{
		MaxIdleConns:        cfg.Concurrency * 4,
		MaxIdleConnsPerHost: cfg.Concurrency * 2,
		IdleConnTimeout:     90 * time.Second,
		DisableKeepAlives:   false,
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: cfg.InsecureTLS},
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   cfg.Timeout,
	}

	if !cfg.FollowRedirect {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	}

	// Channels for Worker Pool pattern
	jobs := make(chan int, cfg.TotalRequests)
	results := make(chan RequestResult, cfg.TotalRequests)
	var wg sync.WaitGroup

	metrics := &MetricsCollector{
		StartTime: time.Now(),
		Latencies: make([]time.Duration, 0, cfg.TotalRequests),
	}

	// Start Worker Goroutines
	for workerID := 1; workerID <= cfg.Concurrency; workerID++ {
		wg.Add(1)
		go worker(ctx, workerID, &cfg, client, jobs, results, &wg)
	}

	// Queue all request IDs into jobs channel
	go func() {
		for i := 1; i <= cfg.TotalRequests; i++ {
			jobs <- i
		}
		close(jobs)
	}()

	// Result Collector Goroutine
	var collectorWg sync.WaitGroup
	collectorWg.Add(1)
	go func() {
		defer collectorWg.Done()
		var processed int64
		ticker := time.NewTicker(300 * time.Millisecond)
		defer ticker.Stop()

		for res := range results {
			metrics.Record(res)
			curr := atomic.AddInt64(&processed, 1)

			if cfg.Verbose {
				printRequestLog(res)
			} else {
				printLiveProgress(curr, int64(cfg.TotalRequests), metrics)
			}
		}
	}()

	// Wait for workers to finish
	wg.Wait()
	close(results)
	collectorWg.Wait()

	metrics.EndTime = time.Now()
	printFinalReport(cfg, metrics)
}

// worker represents a single consumer in the worker pool
func worker(
	ctx context.Context,
	workerID int,
	cfg *Config,
	client *http.Client,
	jobs <-chan int,
	results chan<- RequestResult,
	wg *sync.WaitGroup,
) {
	defer wg.Done()
	rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(workerID*1000)))

	for {
		select {
		case <-ctx.Done():
			return
		case reqID, ok := <-jobs:
			if !ok {
				return
			}

			// Apply realistic human pacing / diurnal scheduling
			var sleepDuration time.Duration
			if cfg.Duration > 0 {
				totalSecs := cfg.Duration.Seconds()
				viewsPerHour := float64(cfg.TotalRequests) / (totalSecs / 3600.0)
				if cfg.DiurnalCurve && cfg.Duration >= 1*time.Hour {
					curHour := time.Now().Hour()
					hourWeight := diurnalHourlyWeights[curHour]
					viewsPerHour = float64(cfg.TotalRequests) * hourWeight * (24.0 / (totalSecs / 3600.0))
					if viewsPerHour < 0.5 {
						viewsPerHour = 0.5
					}
				}
				intervalSec := (3600.0 / viewsPerHour) * float64(cfg.Concurrency)
				if intervalSec < 0.2 {
					intervalSec = 0.2
				}
				sleepDuration = time.Duration(intervalSec * float64(time.Second))
				jitterMax := int64(float64(sleepDuration) * 0.35)
				if jitterMax > 0 {
					sleepDuration += time.Duration(rng.Int63n(jitterMax))
				}
			} else if cfg.BaseDelay > 0 {
				sleepDuration = cfg.BaseDelay
				if cfg.JitterDelay > 0 {
					jitter := time.Duration(rng.Int63n(int64(cfg.JitterDelay)))
					sleepDuration += jitter
				}
			}

			if sleepDuration > 0 {
				select {
				case <-time.After(sleepDuration):
				case <-ctx.Done():
					return
				}
			}

			// Execute HTTP Request
			result := sendHTTPRequest(ctx, workerID, reqID, cfg, client, rng)

			select {
			case results <- result:
			case <-ctx.Done():
				return
			}
		}
	}
}

// sendHTTPRequest crafts realistic headers and executes the GET request
func sendHTTPRequest(
	ctx context.Context,
	workerID, reqID int,
	cfg *Config,
	client *http.Client,
	rng *rand.Rand,
) RequestResult {
	start := time.Now()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.TargetURL, nil)
	if err != nil {
		return RequestResult{
			WorkerID:  workerID,
			RequestID: reqID,
			Duration:  time.Since(start),
			Err:       err,
			Timestamp: start,
		}
	}

	// Pick User-Agent
	var uaProfile UserAgentProfile
	if cfg.CustomUA != "" {
		uaProfile = UserAgentProfile{
			Name:      "Custom User-Agent",
			UserAgent: cfg.CustomUA,
		}
	} else {
		uaProfile = realisticUserAgents[rng.Intn(len(realisticUserAgents))]
	}

	// Attach realistic browser request headers
	req.Header.Set("User-Agent", uaProfile.UserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Cache-Control", "max-age=0")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "cross-site")
	req.Header.Set("Sec-Fetch-User", "?1")

	if uaProfile.SecChUa != "" {
		req.Header.Set("sec-ch-ua", uaProfile.SecChUa)
		req.Header.Set("sec-ch-ua-mobile", "?0")
		req.Header.Set("sec-ch-ua-platform", uaProfile.Platform)
	}

	if cfg.Referer != "" {
		req.Header.Set("Referer", cfg.Referer)
	}

	resp, err := client.Do(req)
	duration := time.Since(start)

	if err != nil {
		return RequestResult{
			WorkerID:     workerID,
			RequestID:    reqID,
			Duration:     duration,
			Err:          err,
			Timestamp:    start,
			UserAgentTag: uaProfile.Name,
		}
	}
	defer resp.Body.Close()

	// Drain response body to ensure socket reuse
	bytesRead, _ := io.Copy(io.Discard, resp.Body)

	return RequestResult{
		WorkerID:     workerID,
		RequestID:    reqID,
		StatusCode:   resp.StatusCode,
		Duration:     duration,
		BytesRead:    bytesRead,
		Timestamp:    start,
		UserAgentTag: uaProfile.Name,
	}
}

func printBanner(cfg Config) {
	fmt.Printf("%s%s========================================================================%s\\n", ColorCyan, ColorBold, ColorReset)
	fmt.Printf("%s%s       GOLANG REALISTIC HTTP TRAFFIC SIMULATOR & LOAD TESTER           %s\\n", ColorCyan, ColorBold, ColorReset)
	fmt.Printf("%s%s========================================================================%s\\n", ColorCyan, ColorBold, ColorReset)
	fmt.Printf("  %sTarget URL:%s        %s\\n", ColorBold, ColorReset, cfg.TargetURL)
	fmt.Printf("  %sTotal Requests:%s    %d\\n", ColorBold, ColorReset, cfg.TotalRequests)
	fmt.Printf("  %sConcurrency:%s       %d Workers\\n", ColorBold, ColorReset, cfg.Concurrency)
	fmt.Printf("  %sPacing / Delay:%s    %v (+ max %v jitter)\\n", ColorBold, ColorReset, cfg.BaseDelay, cfg.JitterDelay)
	fmt.Printf("  %sTimeout:%s           %v\\n", ColorBold, ColorReset, cfg.Timeout)
	fmt.Printf("  %sUser-Agent Pool:%s   %d Realistic Desktop & Mobile Profiles\\n", ColorBold, ColorReset, len(realisticUserAgents))
	if cfg.Referer != "" {
		fmt.Printf("  %sReferer:%s           %s\\n", ColorBold, ColorReset, cfg.Referer)
	}
	fmt.Printf("%s------------------------------------------------------------------------%s\\n", ColorGray, ColorReset)
	fmt.Printf("%s[*] Launching worker pool goroutines. Press Ctrl+C to stop early...%s\\n\\n", ColorYellow, ColorReset)
}

func printLiveProgress(current, total int64, m *MetricsCollector) {
	percent := float64(current) / float64(total) * 100.0
	barWidth := 25
	filled := int(float64(barWidth) * (float64(current) / float64(total)))
	if filled > barWidth {
		filled = barWidth
	}
	bar := strings.Repeat("█", filled) + strings.Repeat("░", barWidth-filled)

	elapsed := time.Since(m.StartTime).Seconds()
	var currentRPS float64
	if elapsed > 0 {
		currentRPS = float64(current) / elapsed
	}

	fmt.Printf("\\r%s[%s]%s %5.1f%% (%d/%d) | %s200 OK: %d%s | %sFail: %d%s | RPS: %.1f",
		ColorCyan, bar, ColorReset, percent, current, total,
		ColorGreen, atomic.LoadInt64(&m.Success200), ColorReset,
		ColorRed, atomic.LoadInt64(&m.NetworkErrs)+atomic.LoadInt64(&m.ServerErr5xx), ColorReset,
		currentRPS,
	)
}

func printRequestLog(res RequestResult) {
	timeStr := res.Timestamp.Format("15:04:05.000")
	if res.Err != nil {
		fmt.Printf("[%s] [Worker %02d] #%04d %sERROR%s: %v (%v)\\n",
			timeStr, res.WorkerID, res.RequestID, ColorRed, ColorReset, res.Err, res.Duration.Round(time.Millisecond))
		return
	}

	statusColor := ColorGreen
	if res.StatusCode >= 400 {
		statusColor = ColorRed
	} else if res.StatusCode >= 300 {
		statusColor = ColorYellow
	}

	fmt.Printf("[%s] [Worker %02d] #%04d %sHTTP %d%s in %6v | %s | %d bytes\\n",
		timeStr, res.WorkerID, res.RequestID, statusColor, res.StatusCode, ColorReset,
		res.Duration.Round(time.Millisecond), res.UserAgentTag, res.BytesRead)
}

func printFinalReport(cfg Config, m *MetricsCollector) {
	totalTime := m.EndTime.Sub(m.StartTime)
	totalSec := totalTime.Seconds()
	if totalSec <= 0 {
		totalSec = 0.001
	}

	rps := float64(m.TotalSent) / totalSec
	successRate := 0.0
	if m.TotalSent > 0 {
		successRate = (float64(m.Success200) / float64(m.TotalSent)) * 100.0
	}

	// Calculate latency percentiles
	var p50, p90, p95, p99, minLat, maxLat, avgLat time.Duration
	if len(m.Latencies) > 0 {
		sort.Slice(m.Latencies, func(i, j int) bool {
			return m.Latencies[i] < m.Latencies[j]
		})

		minLat = m.Latencies[0]
		maxLat = m.Latencies[len(m.Latencies)-1]

		var sum time.Duration
		for _, lat := range m.Latencies {
			sum += lat
		}
		avgLat = sum / time.Duration(len(m.Latencies))

		p50 = m.Latencies[int(float64(len(m.Latencies))*0.50)]
		p90 = m.Latencies[int(float64(len(m.Latencies))*0.90)]
		p95 = m.Latencies[int(float64(len(m.Latencies))*0.95)]
		p99 = m.Latencies[int(float64(len(m.Latencies))*0.99)]
	}

	fmt.Printf("\\n\\n%s%s========================================================================%s\\n", ColorGreen, ColorBold, ColorReset)
	fmt.Printf("%s%s                     EXECUTION METRICS & SUMMARY                       %s\\n", ColorGreen, ColorBold, ColorReset)
	fmt.Printf("%s%s========================================================================%s\\n", ColorGreen, ColorBold, ColorReset)

	fmt.Printf("  %sTarget URL:%s            %s\\n", ColorBold, ColorReset, cfg.TargetURL)
	fmt.Printf("  %sTotal Time Elapsed:%s    %v\\n", ColorBold, ColorReset, totalTime.Round(time.Millisecond))
	fmt.Printf("  %sTotal Requests Sent:%s   %d\\n", ColorBold, ColorReset, m.TotalSent)
	fmt.Printf("  %sRequests Per Sec (RPS):%s %s%.2f req/s%s\\n", ColorBold, ColorReset, ColorCyan, rps, ColorReset)
	fmt.Printf("  %sData Transferred:%s      %.2f MB\\n", ColorBold, ColorReset, float64(m.TotalBytes)/(1024*1024))
	fmt.Printf("  %sSuccess Rate:%s          %s%.2f%%%s\\n", ColorBold, ColorReset, ColorGreen, successRate, ColorReset)

	fmt.Printf("\\n%s-- HTTP Response Status Breakdown --%s\\n", ColorBold, ColorReset)
	fmt.Printf("  %s[200 OK]:%s              %d\\n", ColorGreen, ColorReset, m.Success200)
	fmt.Printf("  %s[3xx Redirects]:%s       %d\\n", ColorYellow, ColorReset, m.Redirects3xx)
	fmt.Printf("  %s[4xx Client Error]:%s    %d\\n", ColorRed, ColorReset, m.ClientErr4xx)
	fmt.Printf("  %s[5xx Server Error]:%s    %d\\n", ColorRed, ColorReset, m.ServerErr5xx)
	fmt.Printf("  %s[Network / Timeout]:%s   %d\\n", ColorMagenta, ColorReset, m.NetworkErrs)

	if len(m.Latencies) > 0 {
		fmt.Printf("\\n%s-- Latency & Duration Distribution --%s\\n", ColorBold, ColorReset)
		fmt.Printf("  %sFastest (Min):%s         %v\\n", ColorBold, ColorReset, minLat.Round(time.Microsecond))
		fmt.Printf("  %sAverage (Mean):%s        %v\\n", ColorBold, ColorReset, avgLat.Round(time.Microsecond))
		fmt.Printf("  %sMedian (P50):%s          %v\\n", ColorBold, ColorReset, p50.Round(time.Microsecond))
		fmt.Printf("  %s90th Percentile (P90):%s %v\\n", ColorBold, ColorReset, p90.Round(time.Microsecond))
		fmt.Printf("  %s95th Percentile (P95):%s %v\\n", ColorBold, ColorReset, p95.Round(time.Microsecond))
		fmt.Printf("  %s99th Percentile (P99):%s %v\\n", ColorBold, ColorReset, p99.Round(time.Microsecond))
		fmt.Printf("  %sSlowest (Max):%s         %v\\n", ColorBold, ColorReset, maxLat.Round(time.Microsecond))
	}

	fmt.Printf("%s========================================================================%s\\n", ColorGreen, ColorReset)
}
`;
}
