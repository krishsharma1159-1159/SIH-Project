import React from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { LOCATIONS } from '../data/mockData';
import { HazardType, LocationId, ForecastHorizonId } from '../types';

export const HazardPredictionView: React.FC = () => {
  const {
    selectedLocation,
    setSelectedLocation,
    selectedHazard,
    setSelectedHazard,
    selectedForecastHour,
    setSelectedForecastHour,
    currentLocationData,
    currentProbabilities,
    currentForecasts,
    selectedHorizonData,
    currentXaiFeatures,
  } = useMeghnetra();

  const hazardsList: { id: HazardType; title: string; description: string }[] = [
    {
      id: 'storm',
      title: 'Severe Thunderstorm',
      description: 'Convective cell reflection > 55 dBZ, lightning density, microburst downdrafts & hail potential.',
    },
    {
      id: 'cloudburst',
      title: 'Cloudburst Rain-Bomb',
      description: 'Extreme localized precipitation rate > 100 mm/hr, orographic moisture pooling along escarpment.',
    },
    {
      id: 'flashflood',
      title: 'Flash Flood & Riparian Surge',
      description: 'High surface runoff velocity into pre-saturated alluvial catchments and low-lying bridge channels.',
    },
  ];

  const currentProbability =
    selectedHazard === 'storm'
      ? currentProbabilities.storm
      : selectedHazard === 'cloudburst'
      ? currentProbabilities.cloudburst
      : currentProbabilities.flashFlood;

  const currentPeak =
    selectedHazard === 'storm'
      ? currentLocationData.peaks.storm
      : selectedHazard === 'cloudburst'
      ? currentLocationData.peaks.cloudburst
      : currentLocationData.peaks.flashFlood;

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
              Multi-Hazard Nowcasting Engine
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              Dedicated Hazard Prediction Matrix
            </h2>
          </div>
          <p className="text-[12px] text-[#434655]">
            Hyper-local spatiotemporal inference for Uttarakhand mountain topography (+2h to +6h horizon)
          </p>
        </div>

        <div className="flex items-center gap-2 font-data-mono text-[11px]">
          <span className="px-2.5 py-1 bg-[#eff4ff] text-[#004ac6] rounded font-semibold border border-[#c3c6d7]/40">
            Spatial Grid: 1.2km
          </span>
          <span className="px-2.5 py-1 bg-[#85f8c4]/30 text-[#002114] rounded font-bold border border-[#85f8c4]">
            Confidence: 87% Multi-Congruence
          </span>
        </div>
      </div>

      {/* Control Bar: Location, Hazard, and Forecast Horizon Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Location Selector */}
        <div className="bg-white rounded-xl shadow-xs p-3 border border-[#c3c6d7]/40">
          <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold mb-1.5">
            1. Target Location
          </div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value as LocationId)}
            className="w-full bg-[#eff4ff] border border-[#c3c6d7] rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-[#0b1c30] focus:ring-1 focus:ring-[#004ac6]"
          >
            {Object.values(LOCATIONS).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} (Elev: {loc.elevation}m)
              </option>
            ))}
          </select>
        </div>

        {/* 2. Hazard Class Selector */}
        <div className="bg-white rounded-xl shadow-xs p-3 border border-[#c3c6d7]/40">
          <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold mb-1.5">
            2. Hazard Classification
          </div>
          <div className="grid grid-cols-3 gap-1 font-data-mono text-[11px]">
            {hazardsList.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedHazard(h.id)}
                className={`py-1.5 px-1 rounded text-center transition-colors font-semibold ${
                  selectedHazard === h.id
                    ? 'bg-[#004ac6] text-white shadow-2xs'
                    : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]'
                }`}
                type="button"
              >
                {h.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Forecast Horizon Selector */}
        <div className="bg-white rounded-xl shadow-xs p-3 border border-[#c3c6d7]/40">
          <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold mb-1.5">
            3. Horizon Window
          </div>
          <div className="grid grid-cols-6 gap-1 font-data-mono text-[11px]">
            {currentForecasts.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedForecastHour(f.id as ForecastHorizonId)}
                className={`py-1.5 rounded text-center transition-colors font-semibold ${
                  selectedForecastHour === f.id
                    ? 'bg-[#ba1a1a] text-white shadow-2xs'
                    : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]'
                }`}
                type="button"
              >
                {f.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Large Featured Prediction Visualizer Card */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-[#c3c6d7]/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c3c6d7]/30 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[11px] uppercase text-[#ba1a1a] font-bold">
                Inference Output
              </span>
              <span className="px-2 py-0.5 bg-[#ffdad6] text-[#ba1a1a] font-data-mono text-[11px] font-bold rounded-full">
                {currentProbabilities.riskCategory} RISK GRADE
              </span>
            </div>
            <h3 className="font-headline-lg text-[20px] font-bold text-[#0b1c30] mt-1">
              {hazardsList.find((h) => h.id === selectedHazard)?.title} — {currentLocationData.name}
            </h3>
            <p className="text-[12px] text-[#434655] mt-0.5">
              {hazardsList.find((h) => h.id === selectedHazard)?.description}
            </p>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-data-mono text-[#434655]">Target Time:</div>
            <div className="text-[16px] font-bold font-mono text-[#004ac6]">
              {selectedHorizonData.timeUtc} ({selectedHorizonData.label})
            </div>
          </div>
        </div>

        {/* Big Probability Gauge Bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between font-data-mono">
            <span className="text-[13px] font-semibold text-[#0b1c30]">
              Predicted Occurrence Probability:
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-telemetry-value text-[36px] font-bold text-[#ba1a1a]">
                {currentProbability}
              </span>
              <span className="text-[16px] font-bold text-[#434655]">%</span>
            </div>
          </div>

          <div className="w-full bg-[#dce9ff] rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-300 ${
                currentProbability >= 70
                  ? 'bg-[#ba1a1a]'
                  : currentProbability >= 50
                  ? 'bg-[#ea580c]'
                  : 'bg-[#2563eb]'
              }`}
              style={{ width: `${currentProbability}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-[10px] font-data-mono text-[#434655]">
            <span>0% (LOW)</span>
            <span>30% (MODERATE)</span>
            <span>50% (HIGH)</span>
            <span>70% (SEVERE)</span>
            <span>85%+ (CRITICAL)</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#eff4ff] p-3 rounded-lg border border-[#c3c6d7]/30">
            <span className="font-label-caps text-[10px] uppercase text-[#434655]">Expected Peak Window</span>
            <div className="font-telemetry-value text-[18px] text-[#004ac6] font-bold mt-1">
              {currentPeak}
            </div>
            <div className="text-[10px] font-data-mono text-[#434655] mt-0.5">Maximum convective rate</div>
          </div>

          <div className="bg-[#eff4ff] p-3 rounded-lg border border-[#c3c6d7]/30">
            <span className="font-label-caps text-[10px] uppercase text-[#434655]">Spatial Impact Extent</span>
            <div className="font-telemetry-value text-[18px] text-[#0b1c30] font-bold mt-1">
              {currentLocationData.exposedAreaKm2} km²
            </div>
            <div className="text-[10px] font-data-mono text-[#434655] mt-0.5">Grid cell footprint</div>
          </div>

          <div className="bg-[#eff4ff] p-3 rounded-lg border border-[#c3c6d7]/30">
            <span className="font-label-caps text-[10px] uppercase text-[#434655]">Exposed Population</span>
            <div className="font-telemetry-value text-[18px] text-[#0b1c30] font-bold mt-1">
              ~{currentLocationData.populationExposed.toLocaleString()}
            </div>
            <div className="text-[10px] font-data-mono text-[#434655] mt-0.5">Census density overlay</div>
          </div>

          <div className="bg-[#eff4ff] p-3 rounded-lg border border-[#c3c6d7]/30">
            <span className="font-label-caps text-[10px] uppercase text-[#434655]">Model Confidence</span>
            <div className="font-telemetry-value text-[18px] text-[#006243] font-bold mt-1">
              87%
            </div>
            <div className="text-[10px] font-data-mono text-[#434655] mt-0.5">Multi-source congruence</div>
          </div>
        </div>
      </div>

      {/* Key Meteorological & Terrain Drivers (XAI Breakdown) */}
      <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
              Key Predictive Drivers
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h4 className="font-headline-sm text-[14px] font-bold text-[#0b1c30]">
              Attribution Ranking for {hazardsList.find((h) => h.id === selectedHazard)?.title}
            </h4>
          </div>
          <span className="text-[11px] font-data-mono text-[#434655]">ConvLSTM + GNN Inductive Bias</span>
        </div>

        <div className="space-y-2">
          {currentXaiFeatures.map((f) => (
            <div key={f.id} className="p-2.5 bg-[#eff4ff] rounded-lg border border-[#c3c6d7]/30 flex items-center justify-between">
              <div>
                <div className="font-bold text-[12px] text-[#0b1c30]">{f.name}</div>
                <div className="text-[11px] text-[#434655] capitalize font-data-mono">
                  Input Stream: {f.category}
                </div>
              </div>
              <span className="font-telemetry-value text-[14px] text-[#ba1a1a] font-bold">
                +{f.attributionPct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
