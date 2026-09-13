import React, { useState, useRef, useEffect } from 'react';
import { AggregatedMetrics, LoadTestConfig, RequestMetric, TerminalLogEntry } from '../types';
import { TrafficSimulator } from '../utils/trafficSimulator';
import { Play, Square, RotateCcw, Activity, CheckCircle, AlertTriangle, XCircle, Gauge, Cpu, Zap, Radio } from 'lucide-react';

interface LiveSimulatorProps {
  config: LoadTestConfig;
  onSimulationStateChange?: (isRunning: boolean) => void;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({ config, onSimulationStateChange }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<AggregatedMetrics>({
    totalSent: 0,
    completed: 0,
    successful: 0,
    redirects: 0,
    clientErrors: 0,
    serverErrors: 0,
    networkErrors: 0,
    elapsedSeconds: 0,
    currentRps: 0,
    avgRps: 0,
    avgDurationMs: 0,
    minDurationMs: 0,
    maxDurationMs: 0,
    p50Ms: 0,
    p90Ms: 0,
    p95Ms: 0,
    p99Ms: 0,
    totalBytes: 0,
  });

  const [logs, setLogs] = useState<TerminalLogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL');
  const simulatorRef = useRef<TrafficSimulator | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const isAutoScroll = useRef<boolean>(true);

  const startSimulation = () => {
    if (isRunning) return;

    // Reset previous run data
    setLogs([]);
    setMetrics({
      totalSent: 0,
      completed: 0,
      successful: 0,
      redirects: 0,
      clientErrors: 0,
      serverErrors: 0,
      networkErrors: 0,
      elapsedSeconds: 0,
      currentRps: 0,
      avgRps: 0,
      avgDurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      p50Ms: 0,
      p90Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      totalBytes: 0,
    });

    setIsRunning(true);
    onSimulationStateChange?.(true);

    const sim = new TrafficSimulator(config, {
      onMetric: (metric: RequestMetric, currentAggregated: AggregatedMetrics) => {
        setMetrics(currentAggregated);
      },
      onLog: (log: TerminalLogEntry) => {
        setLogs((prev) => {
          const next = [...prev, log];
          return next.slice(-400); // keep last 400 entries in buffer
        });
      },
      onComplete: (finalMetrics: AggregatedMetrics) => {
        setMetrics(finalMetrics);
        setIsRunning(false);
        onSimulationStateChange?.(false);
      },
    });

    simulatorRef.current = sim;
    sim.start();
  };

  const stopSimulation = () => {
    if (simulatorRef.current) {
      simulatorRef.current.stop();
    }
    setIsRunning(false);
    onSimulationStateChange?.(false);
  };

  const resetAll = () => {
    stopSimulation();
    setLogs([]);
    setMetrics({
      totalSent: 0,
      completed: 0,
      successful: 0,
      redirects: 0,
      clientErrors: 0,
      serverErrors: 0,
      networkErrors: 0,
      elapsedSeconds: 0,
      currentRps: 0,
      avgRps: 0,
      avgDurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      p50Ms: 0,
      p90Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      totalBytes: 0,
    });
  };

  useEffect(() => {
    if (isAutoScroll.current && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const progressPercent = config.totalRequests > 0
    ? Math.min(100, Math.round((metrics.completed / config.totalRequests) * 100))
    : 0;

  const successPercent = metrics.totalSent > 0
    ? ((metrics.successful / metrics.totalSent) * 100).toFixed(1)
    : '100.0';

  const filteredLogs = logs.filter((l) => {
    if (filterLevel === 'ALL') return true;
    if (filterLevel === 'SUCCESS') return l.level === 'SUCCESS';
    if (filterLevel === 'ERROR') return l.level === 'ERROR';
    return true;
  });

  return (
    <div className="bg-[#0C1A12] border-2 border-[#1B3827] rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
      {/* Simulation Controls & Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1B3827]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3.5 h-3.5 rounded-full ${isRunning ? 'bg-[#B4F82C] animate-ping' : 'bg-[#254C34]'}`} />
            <div className={`absolute inset-0 w-3.5 h-3.5 rounded-full ${isRunning ? 'bg-[#B4F82C]' : 'bg-[#254C34]'}`} />
          </div>
          <div>
            <h3
              style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }}
              className="text-base sm:text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"
            >
              DISPATCH ENGINE TELEMETRY
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                isRunning
                  ? 'bg-[#152E20] text-[#B4F82C] border-[#B4F82C]'
                  : 'bg-[#112419] text-[#9BB0A3] border-[#1E3E2B]'
              }`}>
                {isRunning ? 'TRANSMITTING' : 'READY'}
              </span>
            </h3>
            <p className="text-xs text-[#9BB0A3] font-mono mt-0.5">
              Target: <span className="text-[#B4F82C] font-semibold truncate max-w-xs inline-block align-bottom">{config.targetUrl}</span>
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              id="btn-start-simulation"
              onClick={startSimulation}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B4F82C] hover:bg-[#C8FF47] text-black font-extrabold text-xs transition-all shadow-md shadow-[#B4F82C]/20 cursor-pointer uppercase tracking-wider"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Start Dispatch</span>
            </button>
          ) : (
            <button
              id="btn-stop-simulation"
              onClick={stopSimulation}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition-all shadow-md shadow-red-600/30 cursor-pointer uppercase tracking-wider"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Stop (SIGINT)</span>
            </button>
          )}

          <button
            id="btn-reset-simulation"
            onClick={resetAll}
            disabled={isRunning}
            className="p-2.5 rounded-xl bg-[#07110C] hover:bg-[#142C1E] text-[#9BB0A3] hover:text-white border border-[#1E3E2B] disabled:opacity-40 transition-colors cursor-pointer"
            title="Reset telemetry"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#E8EDE0] flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-[#B4F82C]" />
            Transmission Progress
          </span>
          <span className="text-[#B4F82C] font-black">
            {metrics.completed} / {config.totalRequests} DELIVERED ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-3 bg-[#07110C] rounded-full overflow-hidden border border-[#1E3E2B]">
          <div
            className="h-full bg-[#B4F82C] transition-all duration-200 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Successful Requests */}
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4">
          <div className="text-[11px] font-bold text-[#9BB0A3] flex items-center justify-between uppercase tracking-wider">
            <span>200 OK Hits</span>
            <CheckCircle className="w-3.5 h-3.5 text-[#B4F82C]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#B4F82C] mt-1">
            {metrics.successful}
          </div>
          <div className="text-[10px] text-[#9BB0A3] font-mono mt-0.5">
            {successPercent}% success rate
          </div>
        </div>

        {/* Metric 2: Requests Per Second */}
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4">
          <div className="text-[11px] font-bold text-[#9BB0A3] flex items-center justify-between uppercase tracking-wider">
            <span>Throughput</span>
            <Gauge className="w-3.5 h-3.5 text-[#B4F82C]" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {metrics.currentRps.toFixed(1)} <span className="text-xs text-[#9BB0A3]">RPS</span>
          </div>
          <div className="text-[10px] text-[#9BB0A3] font-mono mt-0.5">
            across {config.concurrency} workers
          </div>
        </div>

        {/* Metric 3: Average Latency */}
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4">
          <div className="text-[11px] font-bold text-[#9BB0A3] flex items-center justify-between uppercase tracking-wider">
            <span>Avg Latency</span>
            <Activity className="w-3.5 h-3.5 text-[#B4F82C]" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {metrics.avgDurationMs} <span className="text-xs font-sans text-[#9BB0A3]">ms</span>
          </div>
          <div className="text-[10px] text-[#9BB0A3] font-mono mt-0.5">
            Min: {metrics.minDurationMs}ms &bull; Max: {metrics.maxDurationMs}ms
          </div>
        </div>

        {/* Metric 4: Elapsed Time & Transfer */}
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4">
          <div className="text-[11px] font-bold text-[#9BB0A3] flex items-center justify-between uppercase tracking-wider">
            <span>Elapsed</span>
            <Zap className="w-3.5 h-3.5 text-[#B4F82C]" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {metrics.elapsedSeconds.toFixed(1)} <span className="text-xs font-sans text-[#9BB0A3]">s</span>
          </div>
          <div className="text-[10px] text-[#9BB0A3] font-mono mt-0.5">
            {(metrics.totalBytes / 1024).toFixed(1)} KB read
          </div>
        </div>
      </div>

      {/* Latency Percentiles & Status Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {/* Percentiles */}
        <div className="bg-[#07110C] border border-[#1E3E2B] rounded-2xl p-4">
          <div className="font-extrabold text-white uppercase tracking-wider mb-2.5">Latency Percentiles</div>
          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div className="p-2.5 bg-[#0C1A12] rounded-xl border border-[#1E3E2B]">
              <span className="text-[10px] text-[#9BB0A3] block uppercase font-bold">P50</span>
              <span className="font-black text-white">{metrics.p50Ms}ms</span>
            </div>
            <div className="p-2.5 bg-[#0C1A12] rounded-xl border border-[#1E3E2B]">
              <span className="text-[10px] text-[#9BB0A3] block uppercase font-bold">P90</span>
              <span className="font-black text-[#B4F82C]">{metrics.p90Ms}ms</span>
            </div>
            <div className="p-2.5 bg-[#0C1A12] rounded-xl border border-[#1E3E2B]">
              <span className="text-[10px] text-[#9BB0A3] block uppercase font-bold">P95</span>
              <span className="font-black text-amber-400">{metrics.p95Ms}ms</span>
            </div>
            <div className="p-2.5 bg-[#0C1A12] rounded-xl border border-[#1E3E2B]">
              <span className="text-[10px] text-[#9BB0A3] block uppercase font-bold">P99</span>
              <span className="font-black text-rose-400">{metrics.p99Ms}ms</span>
            </div>
          </div>
        </div>

        {/* HTTP Status Code Distribution */}
        <div className="bg-[#07110C] border border-[#1E3E2B] rounded-2xl p-4">
          <div className="font-extrabold text-white uppercase tracking-wider mb-2.5">Response Breakdown</div>
          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div className="p-2.5 bg-[#0C1A12] rounded-xl border border-[#1E3E2B]">
              <span className="text-[10px] text-[#B4F82C] block font-bold uppercase">200 OK</span>
              <span className="font-black text-[#B4F82C]">{metrics.successful}</span>
            </div>
            <div className="p-2.5 bg-[#0C1A12] rounded-xl border border-[#1E3E2B]">
              <span className="text-[10px] text-yellow-400 block font-bold uppercase">3xx</span>
              <span className="font-black text-yellow-300">{metrics.redirects}</span>
            </div>
            <div className="p-2.5 bg-[#0C1A12] rounded-xl border border-[#1E3E2B]">
              <span className="text-[10px] text-rose-400 block font-bold uppercase">4xx/5xx</span>
              <span className="font-black text-rose-300">{metrics.clientErrors + metrics.serverErrors}</span>
            </div>
            <div className="p-2.5 bg-[#0C1A12] rounded-xl border border-[#1E3E2B]">
              <span className="text-[10px] text-[#9BB0A3] block font-bold uppercase">Errors</span>
              <span className="font-black text-white">{metrics.networkErrors}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Output TTY */}
      <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl overflow-hidden font-mono text-xs shadow-inner">
        <div className="bg-[#0A1810] px-4 py-2.5 border-b border-[#1E3E2B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#B4F82C]" />
            <span className="text-white font-sans font-bold text-[11px] uppercase tracking-wider">
              Live Goroutines Terminal Log
            </span>
          </div>

          {/* Filter Level */}
          <div className="flex items-center gap-1.5 font-sans">
            <button
              onClick={() => setFilterLevel('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer uppercase tracking-wider ${
                filterLevel === 'ALL' ? 'bg-[#B4F82C] text-black' : 'text-[#9BB0A3] hover:text-white'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilterLevel('SUCCESS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer uppercase tracking-wider ${
                filterLevel === 'SUCCESS' ? 'bg-[#183624] text-[#B4F82C] border border-[#27533B]' : 'text-[#9BB0A3] hover:text-white'
              }`}
            >
              200 OK
            </button>
            <button
              onClick={() => setFilterLevel('ERROR')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer uppercase tracking-wider ${
                filterLevel === 'ERROR' ? 'bg-red-950 text-red-300 border border-red-800' : 'text-[#9BB0A3] hover:text-white'
              }`}
            >
              Fails
            </button>
          </div>
        </div>

        {/* Log Entries */}
        <div className="p-4 max-h-64 overflow-y-auto space-y-1.5 select-text bg-[#050C08]">
          {filteredLogs.length === 0 ? (
            <div className="text-[#567362] py-8 text-center italic font-sans text-xs">
              Click &ldquo;Start Dispatch&rdquo; above to launch worker goroutines and stream live HTTP events...
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              let colorClass = 'text-[#E8EDE0]';
              if (log.level === 'SUCCESS') colorClass = 'text-[#B4F82C] font-semibold';
              if (log.level === 'ERROR') colorClass = 'text-rose-400 font-semibold';
              if (log.level === 'WARN') colorClass = 'text-amber-400';
              if (log.level === 'INFO') colorClass = 'text-[#E8EDE0]';

              return (
                <div key={idx} className="leading-relaxed flex items-start gap-2 text-[11px]">
                  <span className="text-[#43634F] shrink-0">[{log.timestamp}]</span>
                  <span className={colorClass}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};

