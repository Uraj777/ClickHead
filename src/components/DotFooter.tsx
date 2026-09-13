import React from 'react';
import { ExternalLink } from 'lucide-react';

export const DotFooter: React.FC = () => {
  return (
    <footer className="border-t border-[#162D20] bg-[#07110C] py-7 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-black tracking-[-0.08em] text-white leading-none"
              aria-label=".dot"
            >
              .dot
            </span>
            <span className="h-4 w-px bg-[#244A33]" aria-hidden="true" />
            <span className="text-[11px] font-mono text-[#9BB0A3]">
              Software for useful things, ambitious ideas, and everything in between.
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-[#3F684F]">ClickHead</span>
            <span className="text-[#3F684F]" aria-hidden="true">•</span>
            <a
              href="https://github.com/cser-utkarsh-raj/ClickHead"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[#9BB0A3] hover:text-[#B4F82C] transition-colors"
            >
              Source
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
