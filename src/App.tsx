import React, { useState } from 'react';
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
import { ClickHeadLogo } from './components/ClickHeadLogo';
import { Terminal, Code2, Play, SlidersHorizontal, Sun, Layers, Eye, Sparkles } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<LoadTestConfig>({
    targetUrl: 'https://bankingdigests.com/cyber-financial-fraud-what-to-do-immediately-after-falling-victim/',
    subPaths: ['/', '/about', '/pricing', '/features'],
    enableMultiPage: false,
    totalRequests: 100,
    concurrency: 3,
    delayMs: 1500,
    jitterMs: 800,
    timeoutSeconds: 10,
    userAgentMode: 'realistic-rotation',
    followRedirects: true,
    referer: 'https://www.google.com/search?q=banking+fraud+guide',
    acceptEncoding: true,
    keepAlive: true,
    proxyUrl: '',
    enableProxyRotation: false,
    enableWordPressTracking: true,
    jetpackBlogId: '175376211',
    distributionMode: 'spread-1h',
    distributionMinutes: 60,
    useDiurnalCurve: true,
  });

  const [activePresetId, setActivePresetId] = useState<string>('wordpress-jetpack');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<'simple' | 'wordpress' | 'simulator' | 'counter' | 'code' | 'advanced'>('simple');

  const handleConfigChange = (updated: Partial<LoadTestConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
    setActivePresetId(''); // custom modified
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = TRAFFIC_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setConfig((prev) => ({ ...prev, ...preset.config }));
      setActivePresetId(presetId);
    }
  };

  const handleDownloadGoFile = () => {
    const code = generateGoScript(config);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'main.go';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#07110C] text-[#E8EDE0] flex flex-col selection:bg-[#B4F82C] selection:text-black">
      {/* Top Navbar */}
      <Header
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenTestPage={() => setActiveMode('counter')}
        onDownloadGoFile={handleDownloadGoFile}
        onSelectOrganicPreset={() => handleApplyPreset('organic-drip')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0C1A12] border-2 border-[#1A3827] p-2 rounded-2xl shadow-xl">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              id="nav-tab-simple"
              onClick={() => setActiveMode('simple')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${
                activeMode === 'simple'
                  ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20'
                  : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Day Planner</span>
            </button>

            <button
              id="nav-tab-wordpress"
              onClick={() => setActiveMode('wordpress')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${
                activeMode === 'wordpress'
                  ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20'
                  : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#B4F82C]" />
              <span>WordPress / Jetpack Stats (Fixed)</span>
            </button>

            <button
              id="nav-tab-simulator"
              onClick={() => setActiveMode('simulator')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${
                activeMode === 'simulator'
                  ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20'
                  : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Live Telemetry</span>
              {isSimulating && (
                <span className="w-2 h-2 rounded-full bg-[#B4F82C] animate-ping"></span>
              )}
            </button>

            <button
              id="nav-tab-counter"
              onClick={() => setActiveMode('counter')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${
                activeMode === 'counter'
                  ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20'
                  : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>View Count Test Bench</span>
            </button>

            <button
              id="nav-tab-code"
              onClick={() => setActiveMode('code')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${
                activeMode === 'code'
                  ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20'
                  : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Go Source (main.go)</span>
            </button>

            <button
              id="nav-tab-advanced"
              onClick={() => setActiveMode('advanced')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase tracking-wider ${
                activeMode === 'advanced'
                  ? 'bg-[#B4F82C] text-black shadow-md shadow-[#B4F82C]/20'
                  : 'text-[#9BB0A3] hover:text-white hover:bg-[#132A1D]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Advanced Knobs</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[#9BB0A3] font-mono pr-2">
            <span className="hidden md:inline uppercase text-[10px]">Target:</span>
            <span className="text-[#B4F82C] font-bold truncate max-w-[220px]">{config.targetUrl}</span>
          </div>
        </div>

        {/* MODE 1: Simple Traffic Planner (Default / Easy) */}
        {activeMode === 'simple' && (
          <div className="space-y-6">
            <SimpleTrafficPlanner
              config={config}
              onChange={handleConfigChange}
              isSimulating={isSimulating}
              onStartSimulation={() => {
                setActiveMode('simulator');
              }}
              onStopSimulation={() => setIsSimulating(false)}
              onSwitchToAdvanced={() => setActiveMode('advanced')}
              onOpenGuide={() => setIsGuideOpen(true)}
            />

            {/* Quick Live Preview Box */}
            <div className="bg-[#0C1A12] border-2 border-[#1A3827] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[#1A3827] pb-4">
                <h3
                  style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }}
                  className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2.5"
                >
                  <Terminal className="w-4 h-4 text-[#B4F82C]" />
                  LIVE TRAFFIC STREAM
                </h3>
                <button
                  onClick={() => setActiveMode('simulator')}
                  className="text-xs font-bold text-[#B4F82C] hover:underline cursor-pointer uppercase tracking-wider font-mono"
                >
                  Open Full Screen Terminal &rarr;
                </button>
              </div>

              <LiveSimulator
                config={config}
                onSimulationStateChange={(running) => setIsSimulating(running)}
              />
            </div>
          </div>
        )}

        {/* MODE: WordPress & Jetpack Diagnostic & Fix */}
        {activeMode === 'wordpress' && (
          <div className="space-y-6">
            <WordPressJetpackDiagnostic
              config={config}
              onChange={handleConfigChange}
              onApplyWordPressPreset={() => handleApplyPreset('wordpress-jetpack')}
              onStartSimulation={() => setActiveMode('simulator')}
            />
          </div>
        )}

        {/* MODE 2: Live Simulator Tab */}
        {activeMode === 'simulator' && (
          <div className="space-y-6">
            <LiveSimulator
              config={config}
              onSimulationStateChange={(running) => setIsSimulating(running)}
            />
          </div>
        )}

        {/* MODE 3: View Count Test Bench Tab */}
        {activeMode === 'counter' && (
          <div className="space-y-6">
            <ViewCountTester
              config={config}
              onSetTargetUrl={(url) => handleConfigChange({ targetUrl: url })}
              onStartTestDispatch={() => {
                handleConfigChange({ totalRequests: 50, delayMs: 400, jitterMs: 200 });
                setActiveMode('simulator');
              }}
              isSimulating={isSimulating}
            />
          </div>
        )}

        {/* MODE 4: Go Source Code Tab */}
        {activeMode === 'code' && (
          <div className="space-y-6">
            <GoCodeViewer
              config={config}
              onDownloadGoFile={handleDownloadGoFile}
            />
          </div>
        )}

        {/* MODE 5: Advanced Tuning Knobs */}
        {activeMode === 'advanced' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-6">
              <ConfigPanel
                config={config}
                onChange={handleConfigChange}
                onApplyPreset={handleApplyPreset}
                activePresetId={activePresetId}
                isSimulating={isSimulating}
              />
            </div>
            <div className="lg:col-span-7 space-y-6">
              <LiveSimulator
                config={config}
                onSimulationStateChange={(running) => setIsSimulating(running)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#162D20] bg-[#07110C] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9BB0A3]">
          <div className="flex items-center gap-3">
            <ClickHeadLogo size="sm" showWordmark={true} />
            <span className="hidden sm:inline text-[#3F684F]">&bull;</span>
            <span className="text-[11px] font-mono text-[#E8EDE0]">Organic Traffic & Load Testing Engine</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <button
              onClick={handleDownloadGoFile}
              className="text-[#B4F82C] hover:underline cursor-pointer"
            >
              Export main.go
            </button>
            <span className="text-[#3F684F]">&bull;</span>
            <span className="text-[#9BB0A3]">Direct Local Execution</span>
          </div>
        </div>
      </footer>

      {/* Guide Modal */}
      <NormalTrafficGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onApplyNormalPreset={() => handleApplyPreset('organic-drip')}
      />

      {/* Architecture Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </div>
  );
}


