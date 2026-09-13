import React, { useState } from 'react';
import { LoadTestConfig, DistributionMode } from '../types';
import { calculatePacingInterval } from '../utils/diurnal';
import { HourlyCurveChart } from './HourlyCurveChart';
import {
  Globe,
  Clock,
  Zap,
  Play,
  Square,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
  Settings2,
} from 'lucide-react';

interface SimpleTrafficPlannerProps {
  config: LoadTestConfig;
  onChange: (updated: Partial<LoadTestConfig>) => void;
  isSimulating: boolean;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onSwitchToAdvanced: () => void;
  onOpenGuide: () => void;
}

const VIEW_PRESETS = [50, 100, 200, 500, 1000];

const DISTRIBUTION_OPTIONS: {
  id: DistributionMode;
  num: string;
  minutes: number;
  label: string;
  badge: string;
  desc: string;
  useDiurnal: boolean;
}[] = [
  {
    id: 'instant',
    num: '1',
    minutes: 0,
    label: 'QUICK VERIFY',
    badge: '1–2 MINS',
    desc: 'Rapid test (1–2s interval) to verify server logs & hit counters instantly',
    useDiurnal: false,
  },
  {
    id: 'spread-15m',
    num: '2',
    minutes: 15,
    label: '15-MIN SPREAD',
    badge: '15 MINS',
    desc: 'Spreads visits across 15 minutes (~1 visit every 10–20s)',
    useDiurnal: false,
  },
  {
    id: 'spread-1h',
    num: '3',
    minutes: 60,
    label: '1-HOUR FLOW',
    badge: '1 HOUR',
    desc: 'Organic steady drip across 1 hour (~1 visit every 30–60s)',
    useDiurnal: false,
  },
  {
    id: 'spread-6h',
    num: '4',
    minutes: 360,
    label: '6-HOUR DAYTIME',
    badge: '6 HOURS',
    desc: 'Distributed naturally during active daytime working hours',
    useDiurnal: true,
  },
  {
    id: 'spread-24h',
    num: '5',
    minutes: 1440,
    label: '24-HOUR DIURNAL',
    badge: 'FULL 24H',
    desc: 'Authentic 24h bell curve (low at night, peak in afternoon/evening)',
    useDiurnal: true,
  },
];

export const SimpleTrafficPlanner: React.FC<SimpleTrafficPlannerProps> = ({
  config,
  onChange,
  isSimulating,
  onStartSimulation,
  onStopSimulation,
  onSwitchToAdvanced,
  onOpenGuide,
}) => {
  // Calculate dynamic pacing summary
  const pacing = calculatePacingInterval(
    config.totalRequests,
    config.distributionMinutes,
    config.useDiurnalCurve,
    config.concurrency
  );

  const handleSelectDistribution = (opt: typeof DISTRIBUTION_OPTIONS[0]) => {
    onChange({
      distributionMode: opt.id,
      distributionMinutes: opt.minutes,
      useDiurnalCurve: opt.useDiurnal,
      delayMs: opt.minutes === 0 ? 1200 : pacing.baseDelayMs,
      jitterMs: opt.minutes === 0 ? 600 : pacing.jitterMs,
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Headline Section with Bold Typography */}
      <div className="bg-[#0C1A12] border-2 border-[#1B3827] rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Background Subtle Radial Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#B4F82C]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Top bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1B3827] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#162F21] text-[#B4F82C] border border-[#27533B] text-[11px] font-mono uppercase tracking-widest font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-[#B4F82C] animate-pulse"></span>
              CLICKHEAD DISPATCHER
            </div>
            <h2
              style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }}
              className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-none"
            >
              REAL TRAFFIC. <span className="text-[#B4F82C]">NATURAL PACING.</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#9BB0A3] mt-2 max-w-2xl leading-relaxed">
              Distribute simulated HTTP requests smoothly across the clock with human-like jitter, rotating desktop/mobile headers, and 24-hour diurnal activity curves.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenGuide}
              className="text-xs font-bold text-[#E8EDE0] hover:text-white px-3 py-2 rounded-xl border border-[#244A33] bg-[#112419] hover:bg-[#183323] transition-all cursor-pointer uppercase tracking-wider"
            >
              Why Spread?
            </button>
            <button
              onClick={onSwitchToAdvanced}
              className="text-xs font-bold text-black px-3.5 py-2 rounded-xl bg-[#B4F82C] hover:bg-[#C8FF47] transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Advanced Knobs
            </button>
          </div>
        </div>

        {/* STEP 1: Website Target URL */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
              <span className="w-6 h-6 rounded-lg bg-[#B4F82C] text-black flex items-center justify-center text-xs font-black">
                1
              </span>
              Target Web Page or Article URL
            </label>
            <span className="text-[11px] font-mono text-[#9BB0A3]">No rate limits enforced</span>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9BB0A3]">
              <Globe className="w-4 h-4 text-[#B4F82C]" />
            </div>
            <input
              id="simple-input-target-url"
              type="url"
              disabled={isSimulating}
              value={config.targetUrl}
              onChange={(e) => onChange({ targetUrl: e.target.value })}
              placeholder="https://yourwebsite.com/article-url"
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-[#07110C] border-2 border-[#1E3E2B] text-sm text-white placeholder-[#5A7364] focus:outline-none focus:border-[#B4F82C] focus:ring-1 focus:ring-[#B4F82C] disabled:opacity-60 font-mono font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-[#9BB0A3] uppercase tracking-wider font-semibold">Test Endpoints:</span>
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => onChange({ targetUrl: 'https://httpbin.org/get' })}
              className="text-[11px] font-mono text-[#B4F82C] hover:underline cursor-pointer bg-[#0E1F16] px-2.5 py-1 rounded-lg border border-[#1E3E2B]"
            >
              httpbin.org/get
            </button>
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => onChange({ targetUrl: 'https://cloudflare.com/cdn-cgi/trace' })}
              className="text-[11px] font-mono text-[#B4F82C] hover:underline cursor-pointer bg-[#0E1F16] px-2.5 py-1 rounded-lg border border-[#1E3E2B]"
            >
              cloudflare.com/trace
            </button>
          </div>
        </div>

        {/* STEP 2: Desired Total Views */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
              <span className="w-6 h-6 rounded-lg bg-[#B4F82C] text-black flex items-center justify-center text-xs font-black">
                2
              </span>
              Target Number of Views
            </label>
            <span className="text-xs font-mono font-extrabold text-black bg-[#B4F82C] px-3 py-1 rounded-xl">
              {config.totalRequests} TOTAL REQUESTS
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {VIEW_PRESETS.map((count) => {
              const isSelected = config.totalRequests === count;
              return (
                <button
                  key={count}
                  type="button"
                  disabled={isSimulating}
                  onClick={() => onChange({ totalRequests: count })}
                  className={`py-3 px-4 rounded-2xl border-2 text-center transition-all cursor-pointer font-mono font-black text-sm sm:text-base ${
                    isSelected
                      ? 'bg-[#B4F82C] text-black border-[#B4F82C] shadow-lg shadow-[#B4F82C]/15 scale-[1.02]'
                      : 'bg-[#07110C] border-[#1E3E2B] text-[#E8EDE0] hover:bg-[#102419] hover:border-[#2C593E]'
                  } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {count}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 3: Distribution Window (Numbered Grid like Reference) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
              <span className="w-6 h-6 rounded-lg bg-[#B4F82C] text-black flex items-center justify-center text-xs font-black">
                3
              </span>
              Delivery Time Window &amp; Distribution Mode
            </label>
            <span className="text-xs text-[#B4F82C] flex items-center gap-1 font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Human Pacing
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {DISTRIBUTION_OPTIONS.map((opt) => {
              const isSelected = config.distributionMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSimulating}
                  onClick={() => handleSelectDistribution(opt)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#152E20] border-[#B4F82C] ring-1 ring-[#B4F82C] shadow-lg shadow-[#B4F82C]/10'
                      : 'bg-[#07110C] border-[#1E3E2B] hover:bg-[#0F2217] hover:border-[#2C593E]'
                  } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-5 h-5 rounded bg-[#224732] text-[#B4F82C] text-[10px] font-black font-mono flex items-center justify-center">
                        {opt.num}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isSelected
                            ? 'bg-[#B4F82C] text-black'
                            : 'bg-[#162F21] text-[#9BB0A3]'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-white block uppercase tracking-tight">
                      {opt.label}
                    </span>
                    <p className="text-[11px] text-[#9BB0A3] mt-1.5 leading-snug">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pacing Calculation Card */}
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#142C1E] border border-[#244E35] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#B4F82C]" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-[#9BB0A3] uppercase tracking-widest">
                Calculated Delivery Pace
              </div>
              <div className="text-sm sm:text-base text-[#B4F82C] font-mono font-extrabold mt-0.5">
                {pacing.estPaceDescription}
              </div>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 border-[#1E3E2B] pt-3 sm:pt-0">
            <span className="text-[11px] text-[#9BB0A3] block uppercase tracking-widest font-mono">Profile Rotation</span>
            <span className="text-xs font-bold text-white">
              Chrome, Safari, iOS &bull; Google / Social Referrers
            </span>
          </div>
        </div>

        {/* Start / Stop CTA Banner */}
        <div className="pt-2">
          {!isSimulating ? (
            <button
              id="btn-simple-start"
              type="button"
              onClick={onStartSimulation}
              className="w-full py-4 px-6 rounded-2xl bg-[#B4F82C] hover:bg-[#C7FF47] text-black font-black text-base sm:text-lg shadow-xl shadow-[#B4F82C]/20 transition-all flex items-center justify-center gap-3 cursor-pointer uppercase tracking-tight active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>START DELIVERING {config.totalRequests} ORGANIC VIEWS</span>
            </button>
          ) : (
            <button
              id="btn-simple-stop"
              type="button"
              onClick={onStopSimulation}
              className="w-full py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-base sm:text-lg shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer uppercase tracking-tight active:scale-[0.99]"
            >
              <Square className="w-5 h-5 fill-white" />
              <span>STOP ACTIVE TRAFFIC ENGINE</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual 24-Hour Diurnal Human Traffic Curve */}
      <HourlyCurveChart
        totalViews={config.totalRequests}
        useDiurnal={config.useDiurnalCurve}
        onToggleDiurnal={(enabled) => onChange({ useDiurnalCurve: enabled })}
      />
    </div>
  );
};

