import React, { useState, useEffect } from 'react';
import { LoadTestConfig } from '../types';
import { generateGoScript } from '../data/goSourceCode';
import { Copy, Check, Download, Terminal, Code2, Play, FileCode } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-go';

interface GoCodeViewerProps {
  config: LoadTestConfig;
  onDownloadGoFile: () => void;
}

export const GoCodeViewer: React.FC<GoCodeViewerProps> = ({ config, onDownloadGoFile }) => {
  const [copied, setCopied] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [activeTab, setActiveTab] = useState<'source' | 'cli'>('source');

  const goCode = generateGoScript(config);

  const cliCommand = `go run main.go -url="${config.targetUrl}" -requests=${config.totalRequests} -concurrency=${config.concurrency} -delay=${config.delayMs}ms -jitter=${config.jitterMs}ms -timeout=${config.timeoutSeconds}s -referer="${config.referer}" -duration=${config.distributionMinutes}m -diurnal=${config.useDiurnalCurve}`;

  useEffect(() => {
    Prism.highlightAll();
  }, [goCode, activeTab]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(goCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCli = async () => {
    try {
      await navigator.clipboard.writeText(cliCommand);
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#0C1A12] border-2 border-[#1B3827] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Top Bar with Tabs and Actions */}
      <div className="bg-[#07110C] px-5 py-3.5 border-b border-[#1B3827] flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            id="tab-source"
            onClick={() => setActiveTab('source')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'source'
                ? 'bg-[#B4F82C] text-black shadow-md'
                : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>main.go (Production Script)</span>
          </button>

          <button
            id="tab-cli"
            onClick={() => setActiveTab('cli')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'cli'
                ? 'bg-[#B4F82C] text-black shadow-md'
                : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>CLI Run Commands</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-copy-code"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#112419] hover:bg-[#193625] text-[#E8EDE0] border border-[#1E3E2B] text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#B4F82C]" />
                <span className="text-[#B4F82C]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#9BB0A3]" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            id="btn-download-script"
            onClick={onDownloadGoFile}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B4F82C] hover:bg-[#C8FF47] text-black text-xs font-black transition-all cursor-pointer shadow-md shadow-[#B4F82C]/20 uppercase tracking-tight"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Download main.go</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto max-h-[640px] p-5 font-mono text-xs bg-[#050C08] text-[#E8EDE0]">
        {activeTab === 'source' && (
          <div className="relative">
            <pre className="language-go !bg-transparent !p-0 !m-0 overflow-x-auto leading-relaxed">
              <code>{goCode}</code>
            </pre>
          </div>
        )}

        {activeTab === 'cli' && (
          <div className="space-y-6 font-sans text-[#E8EDE0] p-2">
            <div>
              <h3 className="text-sm font-extrabold text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
                <Play className="w-4 h-4 text-[#B4F82C]" />
                Run in Terminal (Background or Foreground)
              </h3>
              <p className="text-xs text-[#9BB0A3] mb-2">
                Execute directly with Go 1.21+ installed on your computer or cloud server:
              </p>
              <div className="relative bg-[#0A1810] border-2 border-[#1E3E2B] rounded-2xl p-3.5 font-mono text-xs text-[#B4F82C] flex items-center justify-between gap-3 overflow-x-auto">
                <span className="select-all font-semibold">{cliCommand}</span>
                <button
                  onClick={handleCopyCli}
                  className="px-3 py-1.5 rounded-xl bg-[#152E20] hover:bg-[#1F4530] text-white border border-[#27533B] shrink-0 text-xs font-sans font-bold cursor-pointer uppercase tracking-wider"
                >
                  {copiedCli ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
                <Code2 className="w-4 h-4 text-[#B4F82C]" />
                Run in Background (24-Hour Server Mode)
              </h3>
              <p className="text-xs text-[#9BB0A3] mb-2">
                Keep it running 24/7 on Linux/VPS even if you close the terminal:
              </p>
              <div className="bg-[#0A1810] border-2 border-[#1E3E2B] rounded-2xl p-4 font-mono text-xs space-y-2">
                <div className="text-[#9BB0A3]"># 1. Save file as main.go</div>
                <div className="text-white font-semibold">$ go mod init clickhead</div>
                <div className="text-[#9BB0A3] mt-2"># 2. Compile optimized standalone binary</div>
                <div className="text-white font-semibold">$ go build -ldflags=&quot;-s -w&quot; -o clickhead main.go</div>
                <div className="text-[#9BB0A3] mt-2"># 3. Launch 24h background worker (nohup)</div>
                <div className="text-[#B4F82C] font-semibold">$ nohup ./clickhead -url=&quot;{config.targetUrl}&quot; -requests={config.totalRequests} -duration=24h -diurnal=true &gt; traffic.log 2&gt;&amp;1 &amp;</div>
              </div>
            </div>

            <div className="bg-[#0A1810] border-2 border-[#1E3E2B] rounded-2xl p-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2">
                Available CLI Flags
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#07110C] rounded-xl border border-[#1E3E2B]">
                  <span className="text-[#B4F82C] font-bold">-url</span>
                  <span className="text-[#9BB0A3] ml-2">Target HTTP/HTTPS address</span>
                </div>
                <div className="p-2.5 bg-[#07110C] rounded-xl border border-[#1E3E2B]">
                  <span className="text-[#B4F82C] font-bold">-requests</span>
                  <span className="text-[#9BB0A3] ml-2">Total desired view count</span>
                </div>
                <div className="p-2.5 bg-[#07110C] rounded-xl border border-[#1E3E2B]">
                  <span className="text-[#B4F82C] font-bold">-duration</span>
                  <span className="text-[#9BB0A3] ml-2">Window (e.g. 1h, 6h, 24h)</span>
                </div>
                <div className="p-2.5 bg-[#07110C] rounded-xl border border-[#1E3E2B]">
                  <span className="text-[#B4F82C] font-bold">-diurnal</span>
                  <span className="text-[#9BB0A3] ml-2">true/false human curve</span>
                </div>
                <div className="p-2.5 bg-[#07110C] rounded-xl border border-[#1E3E2B]">
                  <span className="text-[#B4F82C] font-bold">-concurrency</span>
                  <span className="text-[#9BB0A3] ml-2">Worker pool size</span>
                </div>
                <div className="p-2.5 bg-[#07110C] rounded-xl border border-[#1E3E2B]">
                  <span className="text-[#B4F82C] font-bold">-referer</span>
                  <span className="text-[#9BB0A3] ml-2">Referer header value</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

