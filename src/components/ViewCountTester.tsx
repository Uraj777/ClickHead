import React, { useState, useEffect, useRef } from 'react';
import { LoadTestConfig } from '../types';
import {
  Eye,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  Radio,
  ArrowRight,
  ShieldCheck,
  Clock,
  Globe,
  Terminal,
} from 'lucide-react';

interface ViewRecord {
  id: number;
  timestamp: string;
  userAgent: string;
  referer: string;
  ip: string;
  path: string;
  secChUa?: string;
}

interface ViewCountTesterProps {
  config: LoadTestConfig;
  onSetTargetUrl: (url: string) => void;
  onStartTestDispatch?: () => void;
  isSimulating?: boolean;
}

const STORAGE_KEY = 'clickhead_persistent_view_count';

export const ViewCountTester: React.FC<ViewCountTesterProps> = ({
  config,
  onSetTargetUrl,
  onStartTestDispatch,
  isSimulating,
}) => {
  const [viewCount, setViewCount] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [visits, setVisits] = useState<ViewRecord[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const lastCountRef = useRef<number>(viewCount);

  const endpointUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/test/visit`
    : '/api/test/visit';

  const standalonePageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/test-page`
    : '/test-page';

  const isCurrentTarget = config.targetUrl.includes('/api/test/visit') || config.targetUrl.includes('/test-page');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/test/stats');
      if (res.ok) {
        const data = await res.json();
        const local = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        const maxVal = Math.max(local, data.totalViews);
        localStorage.setItem(STORAGE_KEY, String(maxVal));
        setViewCount(maxVal);
        setVisits(data.recentVisits || []);
        lastCountRef.current = maxVal;
      }
    } catch (err) {
      console.error('Failed to sync view count stats', err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualHit = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/test/visit');
      if (res.ok) {
        const data = await res.json();
        const currentLocal = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        const updated = Math.max(data.totalViews, currentLocal + 1);
        localStorage.setItem(STORAGE_KEY, String(updated));
        setViewCount(updated);
        await fetchStats();
      }
    } catch (err) {
      const next = (parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)) + 1;
      localStorage.setItem(STORAGE_KEY, String(next));
      setViewCount(next);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBatchInject = async (count: number) => {
    setIsInjecting(true);
    try {
      const res = await fetch(`/api/test/batch-visit?count=${count}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (res.ok) {
        const data = await res.json();
        const currentLocal = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        const updated = Math.max(data.totalViews, currentLocal + count);
        localStorage.setItem(STORAGE_KEY, String(updated));
        setViewCount(updated);
        await fetchStats();
      }
    } catch (err) {
      const currentLocal = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      const next = currentLocal + count;
      localStorage.setItem(STORAGE_KEY, String(next));
      setViewCount(next);

      const newVisits: ViewRecord[] = [];
      for (let i = 0; i < Math.min(count, 20); i++) {
        newVisits.push({
          id: next - i,
          timestamp: new Date(Date.now() - i * 300).toISOString(),
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
          referer: 'https://www.google.com/search?q=organic+traffic+test',
          ip: `198.51.100.${Math.floor(Math.random() * 250) + 1}`,
          path: '/api/test/visit',
        });
      }
      setVisits((prev) => [...newVisits, ...prev].slice(0, 50));
    } finally {
      setIsInjecting(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset persistent view counter back to 0?')) return;
    localStorage.setItem(STORAGE_KEY, '0');
    setViewCount(0);
    try {
      await fetch('/api/test/reset', { method: 'POST' });
      await fetchStats();
    } catch (e) {}
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyAsTarget = () => {
    onSetTargetUrl(endpointUrl);
  };

  return (
    <div className="bg-[#0C1A12] border-2 border-[#1B3827] rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1B3827]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#162F21] text-[#B4F82C] border border-[#27533B] text-[11px] font-mono uppercase tracking-widest font-bold">
            <span className="w-2 h-2 rounded-full bg-[#B4F82C] animate-pulse"></span>
            ISOLATED TEST TARGET BENCH
          </div>
          <h2
            style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }}
            className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight"
          >
            Live Persistent View Counter
          </h2>
          <p className="text-xs sm:text-sm text-[#9BB0A3] max-w-xl">
            Test whether traffic requests actually register views. Stored in your browser's persistent state &amp; starts from your previous total unless cleared.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={standalonePageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#E8EDE0] hover:text-white px-3.5 py-2.5 rounded-xl border border-[#244A33] bg-[#112419] hover:bg-[#183323] transition-all flex items-center gap-2 uppercase tracking-wider font-mono cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#B4F82C]" />
            Standalone Target Page
          </a>
        </div>
      </div>

      {/* Main Counter Display Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Big Counter */}
        <div className="lg:col-span-5 bg-[#07110C] border-2 border-[#1E3E2B] rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#B4F82C]/5 rounded-full blur-2xl pointer-events-none"></div>

          <span className="text-xs font-mono font-bold text-[#9BB0A3] uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Eye className="w-4 h-4 text-[#B4F82C]" />
            Total Recorded Hits
          </span>

          <div
            style={{ fontFamily: "'Syne', monospace" }}
            className="text-6xl sm:text-7xl font-black text-[#B4F82C] tracking-tighter my-2 drop-shadow-[0_0_25px_rgba(180,248,44,0.3)] transition-all"
          >
            {viewCount}
          </div>

          <div className="text-[11px] font-mono text-[#9BB0A3] bg-[#112419] px-3 py-1 rounded-full border border-[#1E3E2B] mt-2">
            LocalStorage &bull; Retained Across Sessions
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-5 w-full">
            <button
              onClick={() => handleBatchInject(50)}
              disabled={isInjecting}
              className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl bg-[#B4F82C] hover:bg-[#C8FF47] text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer font-mono shadow-md shadow-[#B4F82C]/15 disabled:opacity-50"
            >
              {isInjecting ? 'Simulating...' : '+50 Views (Test)'}
            </button>
            <button
              onClick={() => handleBatchInject(10)}
              disabled={isInjecting}
              className="py-2.5 px-3 rounded-xl bg-[#183624] hover:bg-[#204931] text-[#E8EDE0] border border-[#27533B] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-mono disabled:opacity-50"
            >
              +10 Views
            </button>
            <button
              onClick={handleManualHit}
              disabled={isRefreshing || isInjecting}
              className="py-2.5 px-3 rounded-xl bg-[#112419] hover:bg-[#183624] text-[#E8EDE0] border border-[#1E3E2B] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-mono disabled:opacity-50"
            >
              +1
            </button>
            <button
              onClick={handleReset}
              className="py-2.5 px-3 rounded-xl bg-[#151D18] hover:bg-red-950 text-rose-300 border border-[#27382D] hover:border-red-800 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-mono"
              title="Reset view counter back to 0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Target URL Setup & Quick Test Panel */}
        <div className="lg:col-span-7 bg-[#07110C] border-2 border-[#1E3E2B] rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#B4F82C]" />
                Live Target Endpoint URL
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                isCurrentTarget
                  ? 'bg-[#152E20] text-[#B4F82C] border-[#B4F82C]'
                  : 'bg-[#112419] text-[#9BB0A3] border-[#1E3E2B]'
              }`}>
                {isCurrentTarget ? 'CURRENT ACTIVE TARGET' : 'AVAILABLE'}
              </span>
            </div>

            <div className="p-3 bg-[#050C08] border border-[#1E3E2B] rounded-2xl flex items-center justify-between gap-2 font-mono text-xs text-[#B4F82C] break-all select-all">
              <span className="truncate">{endpointUrl}</span>
              <button
                onClick={handleCopyEndpoint}
                className="shrink-0 p-1.5 rounded-lg bg-[#112419] hover:bg-[#183624] text-white border border-[#234731] cursor-pointer"
                title="Copy URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#B4F82C]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[11px] text-[#9BB0A3] leading-relaxed">
              Feed this URL into ClickHead or your compiled Go binary. Every incoming HTTP packet immediately increases this counter in real time.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleApplyAsTarget}
              className={`w-full sm:w-auto flex-1 py-3 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer font-mono ${
                isCurrentTarget
                  ? 'bg-[#152E20] text-[#B4F82C] border border-[#B4F82C]'
                  : 'bg-[#183624] hover:bg-[#204931] text-white border border-[#2B5D3E]'
              }`}
            >
              <span>{isCurrentTarget ? 'Target URL Selected' : 'Set as Current Target URL'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {onStartTestDispatch && (
              <button
                onClick={() => {
                  onSetTargetUrl(endpointUrl);
                  setTimeout(() => onStartTestDispatch(), 100);
                }}
                disabled={isSimulating}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#B4F82C] hover:bg-[#C8FF47] text-black font-extrabold text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer font-mono shadow-md shadow-[#B4F82C]/10 disabled:opacity-50"
              >
                <span>Run 50-View Test</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Request Inspection Logs Stream */}
      <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl overflow-hidden font-mono text-xs shadow-inner">
        <div className="bg-[#0A1810] px-4 py-3 border-b border-[#1E3E2B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#B4F82C] animate-pulse" />
            <span className="text-white font-sans font-bold text-xs uppercase tracking-wider">
              Incoming Request Stream Logs ({visits.length})
            </span>
          </div>
          <span className="text-[10px] text-[#9BB0A3] font-mono">
            Auto-Polling Active &bull; Instant HTTP Inspection
          </span>
        </div>

        <div className="p-4 max-h-64 overflow-y-auto space-y-2 bg-[#050C08]">
          {visits.length === 0 ? (
            <div className="text-[#567362] py-8 text-center italic font-sans text-xs">
              No visits logged yet. Run a traffic test with the endpoint above to see incoming HTTP requests with authentic User-Agents and Referers!
            </div>
          ) : (
            visits.map((v) => (
              <div
                key={v.id}
                className="p-2.5 rounded-xl bg-[#0C1A12] border border-[#162D20] text-[11px] space-y-1"
              >
                <div className="flex items-center justify-between text-[#B4F82C] font-bold">
                  <span>View #{v.id} &bull; HTTP 200 OK</span>
                  <span className="text-[#9BB0A3] font-normal">{v.timestamp.substring(11, 23)}</span>
                </div>
                <div className="text-[#E8EDE0] truncate">
                  <strong className="text-[#9BB0A3]">UA:</strong> {v.userAgent}
                </div>
                <div className="text-[10px] text-[#5A7A66] truncate">
                  <strong>Referer:</strong> {v.referer}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
