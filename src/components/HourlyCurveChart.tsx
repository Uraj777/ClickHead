import React from 'react';
import { calculateHourlyDistribution, HourlyDistribution } from '../utils/diurnal';
import { Clock, Sun, Moon, Sunrise, TrendingUp } from 'lucide-react';

interface HourlyCurveChartProps {
  totalViews: number;
  useDiurnal: boolean;
  onToggleDiurnal?: (enabled: boolean) => void;
}

export const HourlyCurveChart: React.FC<HourlyCurveChartProps> = ({
  totalViews,
  useDiurnal,
  onToggleDiurnal,
}) => {
  const currentHour = new Date().getHours();
  const distribution = calculateHourlyDistribution(totalViews, useDiurnal, currentHour);
  const maxViews = Math.max(...distribution.map((d) => d.expectedViews), 1);

  return (
    <div className="bg-[#0C1A12] border-2 border-[#1B3827] rounded-3xl p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#142C1E] border border-[#244E35] flex items-center justify-center text-[#B4F82C]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3
              style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }}
              className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2"
            >
              24-HOUR DIURNAL CURVE
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#162F21] text-[#B4F82C] border border-[#27533B] font-mono font-bold">
                {useDiurnal ? 'HUMAN SLEEP/WAKE CYCLE' : 'FLAT UNIFORM'}
              </span>
            </h3>
            <p className="text-xs text-[#9BB0A3]">
              Paces views over the 24 hours of the day according to natural browsing patterns.
            </p>
          </div>
        </div>

        {onToggleDiurnal && (
          <button
            type="button"
            onClick={() => onToggleDiurnal(!useDiurnal)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 uppercase tracking-wider ${
              useDiurnal
                ? 'bg-[#B4F82C] text-black border-[#B4F82C]'
                : 'bg-[#142C1E] text-[#9BB0A3] border-[#244E35] hover:bg-[#1A3827] hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {useDiurnal ? 'DIURNAL CURVE: ON' : 'ENABLE DIURNAL'}
          </button>
        )}
      </div>

      {/* Time-of-day phases summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="bg-[#07110C] border border-[#1B3827] rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#142C1E] flex items-center justify-center shrink-0">
            <Moon className="w-4 h-4 text-[#9BB0A3]" />
          </div>
          <div>
            <span className="text-[10px] text-[#9BB0A3] block uppercase tracking-wider font-mono">Night (00:00 - 06:00)</span>
            <span className="text-xs font-extrabold text-white font-mono">Low (~1–2% / hr)</span>
          </div>
        </div>
        <div className="bg-[#07110C] border border-[#1B3827] rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#142C1E] flex items-center justify-center shrink-0">
            <Sunrise className="w-4 h-4 text-[#B4F82C]" />
          </div>
          <div>
            <span className="text-[10px] text-[#9BB0A3] block uppercase tracking-wider font-mono">Morning (07:00 - 12:00)</span>
            <span className="text-xs font-extrabold text-[#B4F82C] font-mono">Rising (~5–6% / hr)</span>
          </div>
        </div>
        <div className="bg-[#07110C] border border-[#1B3827] rounded-2xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#142C1E] flex items-center justify-center shrink-0">
            <Sun className="w-4 h-4 text-[#B4F82C]" />
          </div>
          <div>
            <span className="text-[10px] text-[#9BB0A3] block uppercase tracking-wider font-mono">Peak (13:00 - 22:00)</span>
            <span className="text-xs font-extrabold text-[#B4F82C] font-mono">High (~7–8% / hr)</span>
          </div>
        </div>
      </div>

      {/* 24-Hour Bar Chart */}
      <div className="space-y-2 pt-2">
        <div className="h-32 flex items-end gap-1 sm:gap-1.5 px-1 bg-[#07110C] p-3 rounded-2xl border border-[#1B3827]">
          {distribution.map((d) => {
            const heightPercent = Math.max(8, Math.round((d.expectedViews / maxViews) * 100));
            const isCurrent = d.isCurrentHour;

            let barColor = 'bg-[#1C3B29] hover:bg-[#28543A]';
            if (d.weight >= 0.065) {
              barColor = isCurrent
                ? 'bg-[#B4F82C] ring-2 ring-[#B4F82C] shadow-lg shadow-[#B4F82C]/50'
                : 'bg-[#B4F82C]/80 hover:bg-[#B4F82C]';
            } else if (d.weight <= 0.025) {
              barColor = isCurrent
                ? 'bg-[#B4F82C] ring-2 ring-[#B4F82C] shadow-lg shadow-[#B4F82C]/50'
                : 'bg-[#162E20] hover:bg-[#1E3F2B]';
            } else {
              barColor = isCurrent
                ? 'bg-[#B4F82C] ring-2 ring-[#B4F82C] shadow-lg shadow-[#B4F82C]/50'
                : 'bg-[#2A5C3D] hover:bg-[#36754E]';
            }

            return (
              <div
                key={d.hour}
                className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                  <div className="bg-black border border-[#B4F82C] text-[10px] text-white px-2 py-1 rounded shadow-xl whitespace-nowrap font-mono font-bold">
                    <strong>{d.label}</strong>: ~{d.expectedViews} views ({((d.weight) * 100).toFixed(1)}%)
                  </div>
                  <div className="w-1.5 h-1.5 bg-black border-b border-r border-[#B4F82C] rotate-45 -mt-1"></div>
                </div>

                {/* Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-md transition-all duration-300 ${barColor}`}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Hour Labels */}
        <div className="flex justify-between text-[10px] text-[#9BB0A3] font-mono px-2">
          <span>00:00 (MIDNIGHT)</span>
          <span>06:00 (DAWN)</span>
          <span className="text-[#B4F82C] font-extrabold">12:00 (NOON)</span>
          <span>18:00 (EVENING)</span>
          <span>23:00</span>
        </div>
      </div>

      {/* Current Hour Indicator */}
      <div className="bg-[#07110C] border border-[#1B3827] rounded-2xl p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#B4F82C] animate-ping"></div>
          <span className="text-[#E8EDE0]">
            Current Local Hour: <strong className="text-white font-mono font-bold">{String(currentHour).padStart(2, '0')}:00</strong>
          </span>
        </div>
        <span className="text-[#9BB0A3] text-[11px]">
          Expected Pace Now:{' '}
          <strong className="text-[#B4F82C] font-mono font-extrabold">
            ~{distribution[currentHour]?.expectedViews || 1} views/hr
          </strong>
        </span>
      </div>
    </div>
  );
};

