import React from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { HazardType } from '../types';

export const ModelIntelligenceXaiView: React.FC = () => {
  const {
    currentLocationData,
    selectedHazard,
    setSelectedHazard,
    currentXaiFeatures,
    currentSynthesis,
  } = useMeghnetra();

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
              Interpretability & Attribution Engine
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              Explainable AI (XAI) & Model Architecture
            </h2>
          </div>
          <p className="text-[12px] text-[#434655]">
            Transparent decision reasoning, spatiotemporal Shapley values, and meteorological verification
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#eff4ff] p-1 rounded-lg font-data-mono text-[11px]">
          {(['storm', 'cloudburst', 'flashflood'] as HazardType[]).map((h) => (
            <button
              key={h}
              onClick={() => setSelectedHazard(h)}
              className={`px-3 py-1 rounded transition-colors font-semibold ${
                selectedHazard === h
                  ? 'bg-[#004ac6] text-white shadow-2xs'
                  : 'text-[#434655] hover:bg-[#dce9ff]'
              }`}
              type="button"
            >
              {h.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Synthesis Block */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-[#c3c6d7]/40 space-y-3">
        <div className="flex items-center gap-2 text-[#004ac6]">
          <span className="material-symbols-outlined text-[24px]">psychology</span>
          <h3 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
            Plain-English Meteorological Synthesis for {currentLocationData.name}
          </h3>
        </div>
        <div className="p-4 bg-[#eff4ff] border-l-4 border-[#004ac6] rounded-r text-[13px] text-[#0b1c30] leading-relaxed italic">
          "{currentSynthesis}"
        </div>
      </div>

      {/* Feature Attributions Breakdown */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-[#c3c6d7]/40 space-y-4">
        <div className="flex items-center justify-between border-b border-[#c3c6d7]/30 pb-2">
          <h4 className="font-headline-sm text-[14px] font-bold text-[#0b1c30]">
            Normalized Shapley Feature Attributions ({selectedHazard.toUpperCase()})
          </h4>
          <span className="font-data-mono text-[11px] text-[#434655]">
            Total Dynamic Influence = 100%
          </span>
        </div>

        <div className="space-y-3">
          {currentXaiFeatures.map((f) => (
            <div key={f.id} className="space-y-1">
              <div className="flex justify-between items-center font-data-mono text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0b1c30]">{f.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-[#eff4ff] rounded text-[#434655] uppercase">
                    {f.category}
                  </span>
                </div>
                <span className="font-bold text-[#ba1a1a]">+{f.attributionPct}% Weight</span>
              </div>
              <div className="w-full bg-[#dce9ff] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#004ac6] h-2.5 rounded-full"
                  style={{ width: `${f.attributionPct * 2}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-[#434655]">{f.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Architectural Rigor: Prototype vs. Full Production Target Specification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Prototype */}
        <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] uppercase text-[#004ac6] font-bold">
              Current Prototype Engine
            </span>
            <span className="px-2 py-0.5 bg-[#85f8c4]/30 text-[#002114] font-data-mono text-[10px] font-bold rounded">
              OPERATIONAL
            </span>
          </div>
          <h4 className="font-headline-sm text-[15px] font-bold text-[#0b1c30]">
            Spatiotemporal ConvLSTM / CNN Baseline
          </h4>
          <p className="text-[12px] text-[#434655] leading-relaxed">
            Combines satellite imagery from INSAT-3DR with numerical weather prediction fields (IMDAA) using convolutional recurrence. Operates on a 1.2km spatial grid across Uttarakhand with fixed CartoDEM topographical embeddings.
          </p>
          <div className="pt-2 border-t border-[#c3c6d7]/30 font-data-mono text-[11px] space-y-1 text-[#434655]">
            <div>• Inference Latency: ~42ms per cycle</div>
            <div>• Horizon: +2h to +6h Rapid Nowcast</div>
            <div>• Calibration Congruence: 87% Verified</div>
          </div>
        </div>

        {/* Planned Target */}
        <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] uppercase text-[#ba1a1a] font-bold">
              Planned Target Architecture
            </span>
            <span className="px-2 py-0.5 bg-[#dbe1ff] text-[#00174b] font-data-mono text-[10px] font-bold rounded">
              ROADMAP TARGET
            </span>
          </div>
          <h4 className="font-headline-sm text-[15px] font-bold text-[#0b1c30]">
            Spatiotemporal Vision-Transformer + Graph Neural Network (GNN)
          </h4>
          <p className="text-[12px] text-[#434655] leading-relaxed">
            Full-scale graph representation where river catchments and ridges form nodes with physical flow constraints. Self-attention mechanisms capture long-range atmospheric moisture advection from the Bay of Bengal into foothill escarpments.
          </p>
          <div className="pt-2 border-t border-[#c3c6d7]/30 font-data-mono text-[11px] space-y-1 text-[#434655]">
            <div>• Sub-kilometer multi-catchment graph topology</div>
            <div>• Physics-informed loss functions (conservation of mass)</div>
            <div>• Real-time assimilation of micro-radar X-band networks</div>
          </div>
        </div>
      </div>
    </div>
  );
};
