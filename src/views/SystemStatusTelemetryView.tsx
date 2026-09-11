import React from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';

export const SystemStatusTelemetryView: React.FC = () => {
  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#006243] font-bold">
              Infrastructure & Runtime Telemetry
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              System Health & Cluster Diagnostics
            </h2>
          </div>
          <p className="text-[12px] text-[#434655]">
            High-availability distributed state across node clusters for continuous 24/7 disaster nowcasting
          </p>
        </div>

        <div className="flex items-center gap-2 font-data-mono text-[11px]">
          <span className="px-2.5 py-1 bg-[#85f8c4]/30 text-[#002114] rounded font-bold border border-[#85f8c4]">
            NODE STATUS: OPTIMAL (99.98% UPTIME)
          </span>
        </div>
      </div>

      {/* Cluster Health Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
          <span className="font-label-caps text-[10px] uppercase text-[#434655]">Inference Latency</span>
          <div className="font-telemetry-value text-[24px] text-[#004ac6] font-bold mt-1">42.4 ms</div>
          <div className="text-[11px] text-[#006243] font-data-mono mt-0.5">Below 100ms Target</div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
          <span className="font-label-caps text-[10px] uppercase text-[#434655]">Memory Utilization</span>
          <div className="font-telemetry-value text-[24px] text-[#0b1c30] font-bold mt-1">34.2 %</div>
          <div className="text-[11px] text-[#434655] font-data-mono mt-0.5">5.4 GB / 16.0 GB</div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
          <span className="font-label-caps text-[10px] uppercase text-[#434655]">GPU Core Load</span>
          <div className="font-telemetry-value text-[24px] text-[#0b1c30] font-bold mt-1">48.0 %</div>
          <div className="text-[11px] text-[#434655] font-data-mono mt-0.5">NVIDIA Tensor Cores</div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
          <span className="font-label-caps text-[10px] uppercase text-[#434655]">SDMA Relay WebSocket</span>
          <div className="font-telemetry-value text-[24px] text-[#006243] font-bold mt-1">ACTIVE</div>
          <div className="text-[11px] text-[#006243] font-data-mono mt-0.5">0 Frame Dropped</div>
        </div>
      </div>

      {/* Service Verification Table */}
      <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 space-y-3">
        <h3 className="font-headline-sm text-[15px] font-bold text-[#0b1c30]">
          Subsystem Operational Matrix
        </h3>

        <div className="space-y-2 font-data-mono text-[11px]">
          {[
            {
              service: 'INSAT-3DR Sounder Stream Parser',
              type: 'Ingestion Engine',
              status: 'OPERATIONAL',
              latency: '3.8m',
            },
            {
              service: 'IMDAA Reanalysis Assimilation Worker',
              type: 'Model Preprocessor',
              status: 'OPERATIONAL',
              latency: '4.2m',
            },
            {
              service: 'CartoDEM Topography Mesh Engine',
              type: 'Spatial Index',
              status: 'OPERATIONAL',
              latency: '1.1m',
            },
            {
              service: 'Spatiotemporal ConvLSTM Inference Node',
              type: 'Deep Learning Core',
              status: 'OPERATIONAL',
              latency: '42ms',
            },
            {
              service: 'Shapley XAI Attribution Synthesizer',
              type: 'Explainability Core',
              status: 'OPERATIONAL',
              latency: '18ms',
            },
            {
              service: 'NDMA CAP XML/JSON Dispatch Gateway',
              type: 'Interoperability Protocol',
              status: 'OPERATIONAL',
              latency: '24ms',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-2.5 bg-[#eff4ff] rounded-lg flex items-center justify-between border border-[#c3c6d7]/30"
            >
              <div>
                <div className="font-bold text-[#0b1c30]">{item.service}</div>
                <div className="text-[10px] text-[#434655]">{item.type}</div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 bg-[#85f8c4]/30 text-[#002114] font-bold rounded">
                  {item.status}
                </span>
                <div className="text-[10px] text-[#434655] mt-0.5">{item.latency}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
