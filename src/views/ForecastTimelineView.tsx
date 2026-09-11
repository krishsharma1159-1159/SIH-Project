import React from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { ForecastChart } from '../components/ForecastChart';
import { ForecastHorizonId } from '../types';

export const ForecastTimelineView: React.FC = () => {
  const {
    currentLocationData,
    currentForecasts,
    selectedForecastHour,
    setSelectedForecastHour,
    selectedHorizonData,
  } = useMeghnetra();

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
              Temporal Evolution
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              Nowcasting Timeline Analyzer (+2h to +6h Dynamics)
            </h2>
          </div>
          <p className="text-[12px] text-[#434655]">
            Hourly temporal stepping, atmospheric instability trends, and multi-hazard progression for{' '}
            {currentLocationData.name}
          </p>
        </div>

        <div className="font-data-mono text-[11px] text-[#434655] flex items-center gap-2">
          <span>Active Scrubber:</span>
          <strong className="text-[#004ac6]">{selectedHorizonData.label} ({selectedHorizonData.timeUtc})</strong>
        </div>
      </div>

      {/* Main Interactive Chart Section */}
      <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 space-y-3">
        <h3 className="font-headline-sm text-[14px] font-bold text-[#0b1c30]">
          Integrated Probability Progression Curve
        </h3>
        <ForecastChart />
      </div>

      {/* Hourly Detail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {currentForecasts.map((f) => {
          const isSelected = selectedForecastHour === f.id;
          return (
            <div
              key={f.id}
              onClick={() => setSelectedForecastHour(f.id as ForecastHorizonId)}
              className={`bg-white rounded-xl shadow-xs p-3.5 border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-[#004ac6] ring-2 ring-[#004ac6] bg-[#f8f9ff]'
                  : 'border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-headline-sm text-[15px] font-bold text-[#0b1c30]">
                      {f.label}
                    </span>
                    <span className="font-data-mono text-[11px] text-[#434655]">({f.timeUtc})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 font-data-mono text-[10px] font-bold rounded ${
                      f.isPeakStorm || f.isPeakCloudburst
                        ? 'bg-[#ba1a1a] text-white'
                        : f.isPeakFlood
                        ? 'bg-[#004ac6] text-white'
                        : 'bg-[#eff4ff] text-[#0b1c30]'
                    }`}
                  >
                    {f.statusTag}
                  </span>
                </div>

                <div className="space-y-1.5 font-data-mono text-[11px] my-3">
                  <div className="flex justify-between items-center py-1 bg-[#eff4ff] px-2 rounded">
                    <span className="text-[#434655]">Thunderstorm:</span>
                    <span className={f.stormProb >= 70 ? 'text-[#ba1a1a] font-bold' : 'font-bold'}>
                      {f.stormProb}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 bg-[#eff4ff] px-2 rounded">
                    <span className="text-[#434655]">Cloudburst (&gt;100mm/h):</span>
                    <span className={f.cloudburstProb >= 70 ? 'text-[#ba1a1a] font-bold' : 'font-bold'}>
                      {f.cloudburstProb}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 bg-[#eff4ff] px-2 rounded">
                    <span className="text-[#434655]">Flash Flood Surge:</span>
                    <span className={f.flashFloodProb >= 70 ? 'text-[#004ac6] font-bold' : 'font-bold'}>
                      {f.flashFloodProb}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#c3c6d7]/30 text-[11px] text-[#434655]">
                <strong>Diagnostic Note:</strong> {f.notes}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
