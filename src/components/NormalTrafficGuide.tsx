import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Gauge, Globe, Server } from 'lucide-react';

interface NormalTrafficGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyNormalPreset: () => void;
}

export const NormalTrafficGuide: React.FC<NormalTrafficGuideProps> = ({
  isOpen,
  onClose,
  onApplyNormalPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0C1A12] border-2 border-[#1B3827] rounded-3xl shadow-2xl text-[#E8EDE0] p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1B3827]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#142D1F] border border-[#27533B] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#B4F82C]" />
            </div>
            <div>
              <h2
                style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }}
                className="text-lg sm:text-xl font-black text-white uppercase tracking-tight"
              >
                Traffic Guide: Safe &amp; Realistic Distribution
              </h2>
              <p className="text-xs text-[#9BB0A3] mt-0.5">
                How to distribute views smoothly without triggering bot firewalls or skewing metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#9BB0A3] hover:text-white hover:bg-[#152E20] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 mt-6 text-sm">
          {/* Section 1: What is "Normal" Traffic? */}
          <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-5">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-3 uppercase tracking-wider">
              <Gauge className="w-5 h-5 text-[#B4F82C]" />
              1. What is a Realistic Volume of Views?
            </h3>
            <p className="text-[#9BB0A3] leading-relaxed mb-4 text-xs sm:text-sm">
              Authentic human traffic naturally spreads across hours. Here are typical healthy ranges:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#0C1A12] p-4 rounded-xl border border-[#1E3E2B]">
                <span className="text-[10px] font-mono font-bold text-[#B4F82C] uppercase tracking-wider block">New / Portfolio Site</span>
                <span className="text-base font-black text-white mt-1 block">20 &ndash; 150 views/day</span>
                <p className="text-xs text-[#9BB0A3] mt-1">1–3 concurrent users browsing 1–3 pages intermittently.</p>
              </div>
              <div className="bg-[#0C1A12] p-4 rounded-xl border border-[#1E3E2B]">
                <span className="text-[10px] font-mono font-bold text-[#B4F82C] uppercase tracking-wider block">Active Blog / SaaS</span>
                <span className="text-base font-black text-white mt-1 block">300 &ndash; 1,500 views/day</span>
                <p className="text-xs text-[#9BB0A3] mt-1">4–8 concurrent users with daytime peak curve.</p>
              </div>
              <div className="bg-[#0C1A12] p-4 rounded-xl border border-[#1E3E2B]">
                <span className="text-[10px] font-mono font-bold text-[#B4F82C] uppercase tracking-wider block">High Traffic / Featured</span>
                <span className="text-base font-black text-white mt-1 block">2,000 &ndash; 10,000 views/day</span>
                <p className="text-xs text-[#9BB0A3] mt-1">15–30 concurrent sessions with diverse referral headers.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Why Bot Flooding Fails */}
          <div className="bg-[#1A0C0E] border-2 border-rose-900/50 rounded-2xl p-5">
            <h3 className="text-base font-extrabold text-rose-200 flex items-center gap-2 mb-2 uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              2. Why Flooding 1M+ Instant Hits Fails
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#D8D0D0]">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">&bull;</span>
                <span><strong className="text-white">Rate-Limiting &amp; WAF Bans:</strong> Cloudflare, CloudFront, and Nginx return <code className="text-rose-300 bg-black/50 px-1 py-0.5 rounded font-mono">429 Too Many Requests</code> or CAPTCHA triggers when flooded.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">&bull;</span>
                <span><strong className="text-white">Server Resource Exhaustion:</strong> Unpaced spikes cause socket pool exhaustion (TIME_WAIT) and can crash target web servers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">&bull;</span>
                <span><strong className="text-white">Suspicious 0-Second Bounces:</strong> Instant unnatural bursts signal bots, inflating bounce rate to 100%.</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Golden Rules */}
          <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-5">
            <h3 className="text-base font-extrabold text-[#B4F82C] flex items-center gap-2 mb-3 uppercase tracking-wider">
              <CheckCircle2 className="w-5 h-5 text-[#B4F82C]" />
              3. Rules for Authentic Traffic Generation
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-[#9BB0A3]">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#142D1F] text-[#B4F82C] text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">1</div>
                <div>
                  <strong className="text-white">Time Distribution:</strong> Spread views across 1h, 6h, or 24h with daytime diurnal curves.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#142D1F] text-[#B4F82C] text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">2</div>
                <div>
                  <strong className="text-white">Pacing &amp; Jitter:</strong> Use a base delay of <code className="text-[#B4F82C] font-mono bg-[#0C1A12] px-1 py-0.5 rounded">1000ms - 2500ms</code> with randomized jitter to prevent mechanical timing signatures.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#142D1F] text-[#B4F82C] text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">3</div>
                <div>
                  <strong className="text-white">Diverse Device Fingerprints:</strong> Rotate realistic Chrome, Safari, and Mobile headers with authentic Sec-CH-UA client hints.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-[#1B3827]">
          <div className="text-xs text-[#9BB0A3]">
            Applying the preset configures optimal pacing and diurnal curves automatically.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onApplyNormalPreset();
                onClose();
              }}
              className="px-4 py-2.5 text-xs font-black rounded-xl bg-[#B4F82C] hover:bg-[#C8FF47] text-black transition-all cursor-pointer shadow-md shadow-[#B4F82C]/20 uppercase tracking-tight"
            >
              Apply Preset &amp; Close
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[#07110C] hover:bg-[#152E20] text-[#9BB0A3] hover:text-white border border-[#1E3E2B] transition-colors cursor-pointer uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

