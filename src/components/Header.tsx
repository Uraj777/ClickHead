import React from 'react';
import { ClickHeadLogo } from './ClickHeadLogo';
import { BookOpen, Cpu, Download, Sparkles, SlidersHorizontal, Sun, Play } from 'lucide-react';

interface HeaderProps {
  onOpenGuide: () => void;
  onOpenArchitecture: () => void;
  onDownloadGoFile: () => void;
  onSelectOrganicPreset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGuide,
  onOpenArchitecture,
  onDownloadGoFile,
  onSelectOrganicPreset,
}) => {
  return (
    <header className="border-b border-[#1A3324] bg-[#0A1610]/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-4">
          <ClickHeadLogo size="md" />
          <div className="hidden sm:block border-l border-[#1A3324] pl-3.5">
            <span className="text-[11px] uppercase tracking-widest font-mono text-[#B4F82C] font-semibold block">
              TRAFFIC ENGINE &bull; GO DAEMON
            </span>
            <span className="text-xs text-[#9BB0A3]">
              Natural Human Pacing &bull; 24h Diurnal Schedule
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            id="btn-organic-preset"
            onClick={onSelectOrganicPreset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#142A1D] text-[#B4F82C] border border-[#244A33] hover:bg-[#1C3B29] transition-all cursor-pointer shadow-sm uppercase tracking-wide"
            title="Load human-like pacing parameters"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B4F82C]" />
            <span>Organic Preset</span>
          </button>

          <button
            id="btn-open-guide"
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0E1F16] text-[#E8EDE0] border border-[#1F3D2A] hover:bg-[#162E20] hover:text-white transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#B4F82C]" />
            <span>How Views Work</span>
          </button>

          <button
            id="btn-open-arch"
            onClick={onOpenArchitecture}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0E1F16] text-[#E8EDE0] border border-[#1F3D2A] hover:bg-[#162E20] hover:text-white transition-all cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-[#B4F82C]" />
            <span>Goroutines Architecture</span>
          </button>

          <button
            id="btn-download-go"
            onClick={onDownloadGoFile}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg bg-[#B4F82C] hover:bg-[#C6FF42] text-black shadow-md shadow-[#B4F82C]/20 transition-all cursor-pointer uppercase tracking-tight"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Download main.go</span>
          </button>
        </div>
      </div>
    </header>
  );
};

