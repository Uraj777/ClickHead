import React from 'react';
import { X, Cpu, ArrowRight, Zap, Layers, Database } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0C1A12] border-2 border-[#1B3827] rounded-3xl shadow-2xl text-[#E8EDE0] p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1B3827]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#142D1F] border border-[#27533B] flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6 text-[#B4F82C]" />
            </div>
            <div>
              <h2
                style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }}
                className="text-lg sm:text-xl font-black text-white uppercase tracking-tight"
              >
                Go Concurrency &amp; Dispatch Architecture
              </h2>
              <p className="text-xs text-[#9BB0A3] mt-0.5">
                Senior Systems Engineering Blueprint: Buffered Channels, Non-blocking Goroutines &amp; Zero-Allocation Metrics
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

        {/* Diagram & Explanation */}
        <div className="mt-6 space-y-6">
          {/* Visual Architecture Flowchart */}
          <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-xs font-mono font-black text-[#B4F82C] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Runtime Goroutine Pipeline Flow
            </h3>

            <div className="min-w-[640px] flex items-center justify-between gap-3 text-xs">
              {/* Box 1: Dispatcher */}
              <div className="flex-1 bg-[#0C1A12] border-2 border-[#1E3E2B] rounded-xl p-3.5 text-center">
                <div className="font-extrabold text-white mb-1 uppercase tracking-wider">Job Dispatcher</div>
                <div className="text-[11px] text-[#9BB0A3] font-mono">go func() &#123; jobs &lt;- id &#125;</div>
                <div className="mt-2 text-[10px] text-[#B4F82C] bg-[#142D1F] border border-[#27533B] rounded-lg px-2 py-1 font-bold">
                  Buffered: jobs chan int
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-[#355A43] shrink-0" />

              {/* Box 2: Worker Pool */}
              <div className="flex-[1.4] bg-[#0C1A12] border-2 border-[#B4F82C]/50 rounded-xl p-3.5 text-center">
                <div className="font-black text-[#B4F82C] mb-1 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-[#B4F82C]" />
                  Worker Goroutines Pool (N)
                </div>
                <div className="text-[11px] text-[#E8EDE0] font-mono">worker(ctx, id, jobs, results)</div>
                <div className="mt-2 text-[10px] text-[#B4F82C] bg-[#142D1F] border border-[#27533B] rounded-lg px-2 py-1 font-bold">
                  Pacing + Jitter + UA Rotation
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-[#355A43] shrink-0" />

              {/* Box 3: HTTP Transport */}
              <div className="flex-1 bg-[#0C1A12] border-2 border-[#1E3E2B] rounded-xl p-3.5 text-center">
                <div className="font-extrabold text-white mb-1 uppercase tracking-wider">http.Transport</div>
                <div className="text-[11px] text-[#9BB0A3] font-mono">MaxIdleConns: N*4</div>
                <div className="mt-2 text-[10px] text-amber-300 bg-[#1A1A10] border border-amber-800 rounded-lg px-2 py-1 font-bold">
                  Keep-Alive &amp; TLS Pooling
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-[#355A43] shrink-0" />

              {/* Box 4: Metrics Aggregator */}
              <div className="flex-[1.2] bg-[#0C1A12] border-2 border-[#1E3E2B] rounded-xl p-3.5 text-center">
                <div className="font-extrabold text-white mb-1 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                  <Database className="w-3.5 h-3.5 text-[#B4F82C]" />
                  Metrics Collector
                </div>
                <div className="text-[11px] text-[#9BB0A3] font-mono">sync/atomic &amp; P50/P90/P99</div>
                <div className="mt-2 text-[10px] text-white bg-[#142D1F] border border-[#27533B] rounded-lg px-2 py-1 font-bold">
                  ANSI Terminal TTY Output
                </div>
              </div>
            </div>
          </div>

          {/* Key Go Idioms in this implementation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4.5">
              <h4 className="font-extrabold text-white text-sm mb-1.5 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#B4F82C]"></span>
                Worker Pool via Buffered Channels
              </h4>
              <p className="text-xs text-[#9BB0A3] leading-relaxed">
                Rather than spawning unconstrained goroutines for each request (which exhausts file descriptors and RAM), we launch exactly <code className="text-[#B4F82C] font-mono font-bold">C</code> worker goroutines that consume tasks from a buffered <code className="text-[#B4F82C] font-mono font-bold">jobs &lt;-chan int</code> channel.
              </p>
            </div>

            <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4.5">
              <h4 className="font-extrabold text-white text-sm mb-1.5 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#B4F82C]"></span>
                Human Pacing with Randomized Jitter
              </h4>
              <p className="text-xs text-[#9BB0A3] leading-relaxed">
                Each worker uses <code className="text-[#B4F82C] font-mono font-bold">time.After()</code> with a base delay plus a randomized millisecond jitter. This breaks robotic synchronization patterns so requests arrive naturally.
              </p>
            </div>

            <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4.5">
              <h4 className="font-extrabold text-white text-sm mb-1.5 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#B4F82C]"></span>
                High Performance Transport Pooling
              </h4>
              <p className="text-xs text-[#9BB0A3] leading-relaxed">
                Uses a tuned <code className="text-[#B4F82C] font-mono font-bold">http.Transport</code> with socket pooling and <code className="text-[#B4F82C] font-mono font-bold">io.Copy(io.Discard, resp.Body)</code> to ensure TCP/TLS handshakes are reused efficiently without socket leaks.
              </p>
            </div>

            <div className="bg-[#07110C] border-2 border-[#1E3E2B] rounded-2xl p-4.5">
              <h4 className="font-extrabold text-white text-sm mb-1.5 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#B4F82C]"></span>
                Graceful OS Signal Interruption
              </h4>
              <p className="text-xs text-[#9BB0A3] leading-relaxed">
                Listens on <code className="text-[#B4F82C] font-mono font-bold">signal.Notify(SIGINT, SIGTERM)</code> via Go&apos;s <code className="text-[#B4F82C] font-mono font-bold">context.WithCancel</code>, safely draining active workers and printing summary metrics even on early abort.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#1B3827] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-black rounded-xl bg-[#B4F82C] hover:bg-[#C8FF47] text-black transition-all cursor-pointer uppercase tracking-tight"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

