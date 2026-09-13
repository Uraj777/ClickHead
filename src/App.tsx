import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LoadTestConfig } from './types';
import { TRAFFIC_PRESETS } from './data/presets';
import { generateGoScript } from './data/goSourceCode';
import { Header } from './components/Header';
import { SimpleTrafficPlanner } from './components/SimpleTrafficPlanner';
import { ConfigPanel } from './components/ConfigPanel';
import { LiveSimulator } from './components/LiveSimulator';
import { GoCodeViewer } from './components/GoCodeViewer';
import { NormalTrafficGuide } from './components/NormalTrafficGuide';
import { ArchitectureModal } from './components/ArchitectureModal';
import { ViewCountTester } from './components/ViewCountTester';
import { WordPressJetpackDiagnostic } from './components/WordPressJetpackDiagnostic';
import { DotFooter } from './components/DotFooter';
import { Terminal, Code2, Play, SlidersHorizontal, Sun, Eye } from 'lucide-react';

type ActiveMode = 'simple' | 'wordpress' | 'simulator' | 'counter' | 'code' | 'advanced';

export default function App() {
  const [config, setConfig] = useState<LoadTestConfig>({
    targetUrl: '',
    subPaths: ['/', '/about', '/pricing', '/features'],
    enableMultiPage: false,
    totalRequests: 100,
    concurrency: 3,
    delayMs: 1500,
    jitterMs: 800,
    timeoutSeconds: 10,
    userAgentMode: 'realistic-rotation',
    followRedirects: true,
    referer: '',
    acceptEncoding: true,
    keepAlive: true,
    proxyUrl: '',
    enableProxyRotation: false,
    enableWordPressTracking: false,
    jetpackBlogId: '',
    distributionMode: 'spread-1h',
    distributionMinutes: 60,
    useDiurnalCurve: true,
  });

  const [activePresetId, setActivePresetId] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<ActiveMode>('simple');

  const handleConfigChange = (updated: Partial<LoadTestConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
    setActivePresetId('');
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = TRAFFIC_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setConfig((prev) => ({ ...prev, ...preset.config }));
      setActivePresetId(presetId);
    }
  };

  const handleDownloadGoFile = () => {
    if (!config.targetUrl.trim()) return;
    const code = generateGoScript(config);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clickhead.go';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const switchMode = (mode: ActiveMode) => {
    if (mode === activeMode) return;
    setActiveMode(mode);
  };

  const renderActiveView = () => {
    switch (activeMode) {
      case 'simple':
        return (
          <div className="space-y-6">
            <SimpleTrafficPlanner config={config} onChange={handleConfigChange} isSimulating={isSimulating} onStartSimulation={() => switchMode('simulator')} onStopSimulation={() => setIsSimulating(false)} onSwitchToAdvanced={() => switchMode('advanced')} onOpenGuide={() => setIsGuideOpen(true)} />
            <div className="bg-[#0C1A12] border-2 border-[#1A3827] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[#1A3827] pb-4">
                <h3 style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }} className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2.5"><Terminal className="w-4 h-4 text-[#B4F82C]" />LIVE TRAFFIC STREAM</h3>
                <button onClick={() => switchMode('simulator')} className="text-xs font-bold text-[#B4F82C] hover:underline cursor-pointer uppercase tracking-wider font-mono">Open Full Screen Terminal →</button>
              </div>
              <LiveSimulator config={config} onSimulationStateChange={(running) => setIsSimulating(running)} />
            </div>
          </div>
        );
      case 'wordpress':
        return <div className="space-y-6"><WordPressJetpackDiagnostic config={config} onChange={handleConfigChange} onApplyWordPressPreset={() => handleApplyPreset('wordpress-jetpack')} onStartSimulation={() => switchMode('simulator')} /></div>;
      case 'simulator':
        return <div className="space-y-6"><LiveSimulator config={config} onSimulationStateChange={(running) => setIsSimulating(running)} /></div>;
      case 'counter':
        return <div className="space-y-6"><ViewCountTester config={config} onSetTargetUrl={(url) => handleConfigChange({ targetUrl: url })} onStartTestDispatch={() => { handleConfigChange({ totalRequests: 50, delayMs: 400, jitterMs: 200 }); switchMode('simulator'); }} isSimulating={isSimulating} /></div>;
      case 'code':
        return <div className="space-y-6"><GoCodeViewer config={config} onDownloadGoFile={handleDownloadGoFile} /></div>;
      case 'advanced':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-6"><ConfigPanel config={config} onChange={handleConfigChange} onApplyPreset={handleApplyPreset} activePresetId={activePresetId} isSimulating={isSimulating} /></div>
            <div className="lg:col-span-7 space-y-6"><LiveSimulator config={config} onSimulationStateChange={(running) => setIsSimulating(running)} /></div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#07110C] text-[#E8EDE0] flex flex-col selection:bg-[#B4F82C] selection:text-black">
      <Header onOpenGuide={() => setIsGuideOpen(true)} onOpenArchitecture={() => setIsArchitectureOpen(true)} onOpenTestPage={() => switchMode('counter')} onDownloadGoFile={handleDownloadGoFile} onSelectOrganicPreset={() => handleApplyPreset('organic-drip')} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0C1A12] border-2 border-[#1A3827] p-2 rounded-2xl shadow-xl">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button id="nav-tab-simple" onClick={() => switchMode('simple')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${activeMode === 'simple' ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20' : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'}`}><Sun className="w-4 h-4" /><span>Day Planner</span></button>
            <button id="nav-tab-wordpress" onClick={() => switchMode('wordpress')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${activeMode === 'wordpress' ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20' : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'}`}><Eye className="w-4 h-4" /><span>Analytics Diagnostics</span></button>
            <button id="nav-tab-simulator" onClick={() => switchMode('simulator')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${activeMode === 'simulator' ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20' : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'}`}><Play className="w-4 h-4 fill-current" /><span>Live Telemetry</span>{isSimulating && <span className="w-2 h-2 rounded-full bg-[#B4F82C] animate-ping" />}</button>
            <button id="nav-tab-counter" onClick={() => switchMode('counter')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${activeMode === 'counter' ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20' : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'}`}><Eye className="w-4 h-4" /><span>View Count Test Bench</span></button>
            <button id="nav-tab-code" onClick={() => switchMode('code')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${activeMode === 'code' ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20' : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'}`}><Code2 className="w-4 h-4" /><span>Go Source</span></button>
            <button id="nav-tab-advanced" onClick={() => switchMode('advanced')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${activeMode === 'advanced' ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20' : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'}`}><SlidersHorizontal className="w-4 h-4" /><span>Advanced</span></button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[#9BB0A3] font-mono pr-2 min-w-0">
            <span className="hidden md:inline uppercase text-[10px]">Target:</span>
            <span className="text-[#B4F82C] font-bold truncate max-w-[220px]">{config.targetUrl || 'No target selected'}</span>
          </div>
        </div>

        <div className="relative overflow-hidden min-h-[420px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={activeMode} initial={{ opacity: 0, x: 18, filter: 'blur(2px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -18, filter: 'blur(2px)' }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="will-change-transform">
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <DotFooter />

      <NormalTrafficGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} onApplyNormalPreset={() => handleApplyPreset('organic-drip')} />
      <ArchitectureModal isOpen={isArchitectureOpen} onClose={() => setIsArchitectureOpen(false)} />
    </div>
  );
}
