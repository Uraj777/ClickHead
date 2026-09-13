import React, { useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Globe2, Play, RefreshCw, Zap } from 'lucide-react';
import { LoadTestConfig } from '../types';

interface Props {
  config: LoadTestConfig;
  onChange: (updated: Partial<LoadTestConfig>) => void;
  onApplyWordPressPreset: () => void;
  onStartSimulation: () => void;
}

function extractId(html: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

export const WordPressJetpackDiagnostic: React.FC<Props> = ({
  config,
  onChange,
  onApplyWordPressPreset,
  onStartSimulation,
}) => {
  const [postId, setPostId] = useState(config.wpPostId || '');
  const [blogId, setBlogId] = useState(config.jetpackBlogId || '');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'found' | 'blocked' | 'not-found'>('idle');
  const [message, setMessage] = useState('');

  const detectMetadata = async () => {
    const target = config.targetUrl.trim();
    if (!target) {
      setStatus('not-found');
      setMessage('Enter a target URL first.');
      return;
    }

    setStatus('scanning');
    setMessage('Scanning the target page for WordPress / Jetpack metadata…');

    try {
      const response = await fetch(target, { headers: { Accept: 'text/html' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();

      const detectedBlogId = extractId(html, [
        /(?:blog|blog_id|blogId)["'=:&\s]+(?:["']?)(\d{4,})(?:["'])?/i,
        /(?:stats|pixel)\.wp\.com[^\n]{0,500}?[?&]blog=(\d{4,})/i,
        /_stq\s*=\s*\[\s*\[?\s*["']?view["']?\s*,\s*["']?(\d{4,})/i,
      ]);
      const detectedPostId = extractId(html, [
        /(?:post_id|postId|postid)["'=:&\s]+(?:["']?)(\d{1,})(?:["'])?/i,
        /(?:post|p)=([0-9]{1,})[&"']/i,
      ]);

      if (detectedBlogId) {
        setBlogId(detectedBlogId);
        onChange({ jetpackBlogId: detectedBlogId });
      }
      if (detectedPostId) {
        setPostId(detectedPostId);
        onChange({ wpPostId: detectedPostId });
      }

      if (detectedBlogId || detectedPostId) {
        setStatus('found');
        setMessage(`Detected ${detectedBlogId ? 'site metadata' : 'page metadata'}${detectedPostId ? ' and post metadata' : ''}.`);
      } else {
        setStatus('not-found');
        setMessage('No compatible metadata was exposed by the page. The target may use caching, a custom analytics setup, or restrict cross-origin inspection.');
      }
    } catch (error) {
      setStatus('blocked');
      setMessage(error instanceof Error ? `Could not inspect the target from the browser: ${error.message}` : 'Could not inspect the target page.');
    }
  };

  return (
    <div className="bg-[#0C1A12] border-2 border-[#1B3827] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#B4F82C]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1B3827] pb-6 relative">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#162F21] text-[#B4F82C] border border-[#27533B] text-[11px] font-mono uppercase tracking-widest font-bold mb-3">
            <Activity className="w-3.5 h-3.5" />
            ANALYTICS DIAGNOSTICS
          </div>
          <h2 style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }} className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Detect &amp; Validate Page Analytics
          </h2>
          <p className="text-xs sm:text-sm text-[#9BB0A3] mt-2 max-w-2xl leading-relaxed">
            Inspect the selected page for publicly exposed WordPress and Jetpack metadata. Nothing is prefilled for a specific site.
          </p>
        </div>
        <button onClick={onApplyWordPressPreset} className="text-xs font-bold text-black px-4 py-2.5 rounded-xl bg-[#B4F82C] hover:bg-[#C8FF47] transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider shrink-0">
          <Zap className="w-4 h-4" /> Apply Safe Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#B4F82C] text-xs font-bold uppercase tracking-wider">
            <Globe2 className="w-4 h-4" /> Automatic metadata detection
          </div>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            ClickHead inspects the target HTML for common public analytics markers and extracts identifiers when they are actually present. There are no embedded site IDs or domains.
          </p>
          <button onClick={detectMetadata} disabled={status === 'scanning'} className="w-full px-4 py-2.5 rounded-xl bg-[#152E20] hover:bg-[#1D3F2C] text-[#B4F82C] border border-[#27533B] text-xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${status === 'scanning' ? 'animate-spin' : ''}`} />
            {status === 'scanning' ? 'Scanning…' : 'Detect from Target'}
          </button>
          {message && (
            <div className={`text-[11px] rounded-xl p-3 border ${status === 'found' ? 'text-[#B4F82C] border-[#27643E] bg-[#0E2618]' : status === 'blocked' || status === 'not-found' ? 'text-amber-200 border-amber-900/60 bg-amber-950/20' : 'text-[#9BB0A3] border-[#1E3E2B]'}`}>
              {status === 'found' ? <CheckCircle2 className="inline w-3.5 h-3.5 mr-1.5" /> : status === 'blocked' || status === 'not-found' ? <AlertCircle className="inline w-3.5 h-3.5 mr-1.5" /> : null}
              {message}
            </div>
          )}
        </div>

        <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider">Detected identifiers</span>
            <span className="text-[10px] text-[#6F8578] font-mono">read-only until detected</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-[#9BB0A3] uppercase tracking-wider">Site / Blog ID</span>
              <input value={blogId} readOnly placeholder="Not detected" className="w-full px-3 py-2 rounded-xl bg-[#0C1A12] border border-[#1E3E2B] text-xs text-white font-mono focus:outline-none" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold text-[#9BB0A3] uppercase tracking-wider">Post ID</span>
              <input value={postId} readOnly placeholder="Not detected" className="w-full px-3 py-2 rounded-xl bg-[#0C1A12] border border-[#1E3E2B] text-xs text-white font-mono focus:outline-none" />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-5 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Analytics beacon mode</h4>
            <p className="text-[11px] text-[#9BB0A3] mt-1">Enable only when the target's analytics integration is intentionally being tested.</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-[#9BB0A3] font-mono cursor-pointer">
            <input type="checkbox" checked={config.enableWordPressTracking || false} onChange={(e) => onChange({ enableWordPressTracking: e.target.checked })} className="accent-[#B4F82C] w-4 h-4" />
            Enable beacon checks
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 relative">
        <button onClick={onStartSimulation} disabled={!config.targetUrl.trim()} className="px-5 py-2.5 rounded-xl bg-[#B4F82C] hover:bg-[#C8FF47] text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          <Play className="w-3.5 h-3.5 fill-current" /> Run Test
        </button>
      </div>
    </div>
  );
};
