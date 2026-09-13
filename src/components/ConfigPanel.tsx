import React from 'react';
import { LoadTestConfig } from '../types';
import { TRAFFIC_PRESETS } from '../data/presets';
import { Sliders, Globe, Users, Clock } from 'lucide-react';

interface ConfigPanelProps {
  config: LoadTestConfig;
  onChange: (updated: Partial<LoadTestConfig>) => void;
  onApplyPreset: (presetId: string) => void;
  activePresetId?: string;
  isSimulating: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onChange,
  onApplyPreset,
  activePresetId,
  isSimulating,
}) => {
  // Estimated runtime computation
  const avgDelaySec = (config.delayMs + config.jitterMs / 2) / 1000;
  const effectiveWorkers = Math.max(1, config.concurrency);
  const estRps = avgDelaySec > 0 ? effectiveWorkers / avgDelaySec : effectiveWorkers * 25;
  const estDurationSec = estRps > 0 ? config.totalRequests / estRps : 1;

  return (
    <div className="bg-[#0C1A12] border-2 border-[#1B3827] rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
      {/* Title and Preset Bar */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2
            style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }}
            className="text-base sm:text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight"
          >
            <Sliders className="w-4 h-4 text-[#B4F82C]" />
            Advanced Engine Controls
          </h2>
          <span className="text-xs text-[#9BB0A3] font-mono">
            {config.totalRequests} REQS &bull; {config.concurrency} GOROUTINES
          </span>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {TRAFFIC_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                id={`preset-${preset.id}`}
                disabled={isSimulating}
                onClick={() => onApplyPreset(preset.id)}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#152E20] border-[#B4F82C] shadow-md shadow-[#B4F82C]/10'
                    : 'bg-[#07110C] border-[#1E3E2B] hover:border-[#336848]'
                } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-white uppercase tracking-wider line-clamp-1">
                    {preset.name.split(' (')[0]}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-lg border border-[#27533B] bg-[#0C1A12] text-[#B4F82C] font-mono font-bold inline-block uppercase">
                  {preset.riskLevel.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#E8EDE0] uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#B4F82C]" />
            Target Web Page / API URL
          </span>
          <span className="text-[11px] text-[#9BB0A3] font-mono">HTTP/HTTPS</span>
        </label>
        <div className="relative">
          <input
            id="input-target-url"
            type="url"
            disabled={isSimulating}
            value={config.targetUrl}
            onChange={(e) => onChange({ targetUrl: e.target.value })}
            placeholder="https://yourwebsite.com or https://httpbin.org/get"
            className="w-full px-4 py-3 rounded-2xl bg-[#07110C] border-2 border-[#1E3E2B] text-sm text-white placeholder-[#43634F] focus:outline-none focus:border-[#B4F82C] disabled:opacity-60 font-mono"
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-[#9BB0A3]">Quick Test Targets:</span>
          <button
            type="button"
            disabled={isSimulating}
            onClick={() => onChange({ targetUrl: 'https://httpbin.org/get' })}
            className="text-[11px] font-mono text-[#B4F82C] hover:underline cursor-pointer bg-[#07110C] px-2.5 py-1 rounded-lg border border-[#1E3E2B]"
          >
            httpbin.org/get
          </button>
          <button
            type="button"
            disabled={isSimulating}
            onClick={() => onChange({ targetUrl: 'https://cloudflare.com/cdn-cgi/trace' })}
            className="text-[11px] font-mono text-[#B4F82C] hover:underline cursor-pointer bg-[#07110C] px-2.5 py-1 rounded-lg border border-[#1E3E2B]"
          >
            cloudflare.com/trace
          </button>
        </div>
      </div>

      {/* Numerical Sliders (Requests & Concurrency) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Requests */}
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-white uppercase tracking-wider">Total Requests</span>
            <span className="font-mono font-black text-[#B4F82C] bg-[#152E20] px-2.5 py-0.5 rounded-lg border border-[#27533B]">
              {config.totalRequests}
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="2000"
            step="10"
            disabled={isSimulating}
            value={config.totalRequests}
            onChange={(e) => onChange({ totalRequests: Number(e.target.value) })}
            className="w-full accent-[#B4F82C] cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-[#9BB0A3] font-mono">
            <span>10</span>
            <span>100 (Normal)</span>
            <span>500</span>
            <span>2000</span>
          </div>
        </div>

        {/* Concurrency (Worker Goroutines) */}
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#B4F82C]" />
              Concurrency (Workers)
            </span>
            <span className="font-mono font-black text-[#B4F82C] bg-[#152E20] px-2.5 py-0.5 rounded-lg border border-[#27533B]">
              {config.concurrency} workers
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            disabled={isSimulating}
            value={config.concurrency}
            onChange={(e) => onChange({ concurrency: Number(e.target.value) })}
            className="w-full accent-[#B4F82C] cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-[#9BB0A3] font-mono">
            <span>1 (Single)</span>
            <span>3-5 (Organic)</span>
            <span>15 (Heavy)</span>
            <span>30 (Stress)</span>
          </div>
        </div>
      </div>

      {/* Pacing Delay & Jitter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Base Delay */}
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#B4F82C]" />
              Base Pacing Delay
            </span>
            <span className="font-mono font-black text-[#B4F82C] bg-[#152E20] px-2.5 py-0.5 rounded-lg border border-[#27533B]">
              {config.delayMs} ms
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="3000"
            step="50"
            disabled={isSimulating}
            value={config.delayMs}
            onChange={(e) => onChange({ delayMs: Number(e.target.value) })}
            className="w-full accent-[#B4F82C] cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-[#9BB0A3] font-mono">
            <span>0ms</span>
            <span>500ms</span>
            <span>1500ms (Human)</span>
            <span>3000ms</span>
          </div>
        </div>

        {/* Jitter */}
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-white uppercase tracking-wider">Randomized Jitter</span>
            <span className="font-mono font-black text-[#B4F82C] bg-[#152E20] px-2.5 py-0.5 rounded-lg border border-[#27533B]">
              +{config.jitterMs} ms max
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1500"
            step="50"
            disabled={isSimulating}
            value={config.jitterMs}
            onChange={(e) => onChange({ jitterMs: Number(e.target.value) })}
            className="w-full accent-[#B4F82C] cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-[#9BB0A3] font-mono">
            <span>0ms</span>
            <span>400ms</span>
            <span>800ms (Organic)</span>
            <span>1500ms</span>
          </div>
        </div>
      </div>

      {/* User-Agent Mode & Referrer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* User-Agent Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white uppercase tracking-wider block">
            User-Agent Client Header
          </label>
          <select
            disabled={isSimulating}
            value={config.userAgentMode}
            onChange={(e) => onChange({ userAgentMode: e.target.value as any })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#07110C] border-2 border-[#1E3E2B] text-xs text-white focus:outline-none focus:border-[#B4F82C]"
          >
            <option value="realistic-rotation">Realistic Rotation (Chrome, Safari, Firefox, iOS, Android)</option>
            <option value="desktop-only">Desktop Only (Windows 11, macOS Sonoma)</option>
            <option value="mobile-only">Mobile Only (iPhone iOS 17.5, Android 14)</option>
            <option value="custom">Custom Specified User-Agent</option>
          </select>
        </div>

        {/* Referer Header */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white uppercase tracking-wider block">
            HTTP Referer Header
          </label>
          <select
            disabled={isSimulating}
            value={config.referer}
            onChange={(e) => onChange({ referer: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#07110C] border-2 border-[#1E3E2B] text-xs text-white focus:outline-none focus:border-[#B4F82C]"
          >
            <option value="https://www.google.com/">Google Search (https://www.google.com/)</option>
            <option value="https://news.ycombinator.com/">Hacker News (https://news.ycombinator.com/)</option>
            <option value="https://www.reddit.com/">Reddit (https://www.reddit.com/)</option>
            <option value="https://twitter.com/">X / Twitter (https://twitter.com/)</option>
            <option value="https://duckduckgo.com/">DuckDuckGo (https://duckduckgo.com/)</option>
            <option value="">Direct Visit / No Referer</option>
          </select>
        </div>
      </div>

      {/* Time-of-Day Diurnal Distribution Toggle */}
      <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#B4F82C]" />
            24-Hour Diurnal Human Traffic Curve
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              disabled={isSimulating}
              checked={config.useDiurnalCurve}
              onChange={(e) => onChange({ useDiurnalCurve: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-[#142D1F] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#B4F82C] peer-checked:after:bg-black"></div>
          </label>
        </div>
        <p className="text-[11px] text-[#9BB0A3]">
          When active, traffic dynamically matches human waking hours (e.g., higher volume during afternoon/evening peaks, very light volume at night).
        </p>
      </div>

      {/* Traffic Characteristics Badge */}
      <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#B4F82C] animate-pulse"></div>
          <span className="text-[#9BB0A3]">
            Estimated Throughput: <strong className="text-[#B4F82C] font-mono font-bold">~{estRps.toFixed(1)} req/sec</strong>
          </span>
        </div>
        <span className="text-[#9BB0A3]">
          Estimated Window: <strong className="text-white font-mono font-bold">~{estDurationSec.toFixed(1)}s</strong>
        </span>
      </div>
    </div>
  );
};

