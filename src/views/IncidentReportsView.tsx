import React from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { DEFAULT_INCIDENT_REPORT } from '../data/mockData';

export const IncidentReportsView: React.FC = () => {
  const { openReportModal, openExportModal, openShareModal, currentLocationData } = useMeghnetra();

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
              Automated Civil Protection Directives
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              Official Incident Dispatch & Advisory Archive
            </h2>
          </div>
          <p className="text-[12px] text-[#434655]">
            Machine-generated situation advisories for SDMA, NDRF, district emergency operations centers (DEOC), and IMD
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openReportModal()}
            className="px-3 py-1.5 bg-[#004ac6] text-white hover:bg-[#003ea8] rounded font-semibold text-[12px] flex items-center gap-1.5 shadow-xs transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Generate Active Dispatch</span>
          </button>
        </div>
      </div>

      {/* Featured Current Incident Dispatch */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-[#c3c6d7]/40 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#c3c6d7]/30 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#ba1a1a] text-white font-data-mono text-[10px] font-bold rounded">
                CRITICAL WARNING
              </span>
              <span className="font-data-mono text-[11px] text-[#434655]">
                Ref: {DEFAULT_INCIDENT_REPORT.sdmaReference}
              </span>
            </div>
            <h3 className="font-headline-lg text-[18px] font-bold text-[#0b1c30] mt-1">
              {DEFAULT_INCIDENT_REPORT.title}
            </h3>
            <div className="font-data-mono text-[11px] text-[#434655] mt-0.5">
              Target: <strong>{DEFAULT_INCIDENT_REPORT.locationName}</strong> • Generated:{' '}
              {DEFAULT_INCIDENT_REPORT.generatedAtUtc}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openReportModal()}
              className="px-3 py-1.5 bg-[#eff4ff] text-[#004ac6] hover:bg-[#dce9ff] rounded font-semibold text-[12px] flex items-center gap-1 border border-[#c3c6d7]/40"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>Full View</span>
            </button>
            <button
              onClick={() => openExportModal()}
              className="px-3 py-1.5 bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] rounded font-semibold text-[12px] flex items-center gap-1 border border-[#c3c6d7]/40"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-[#eff4ff] rounded-lg text-[13px] text-[#0b1c30] italic leading-relaxed">
          "{DEFAULT_INCIDENT_REPORT.meteorologicalSynthesis}"
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-[#f8f9ff] border border-[#c3c6d7]/40 rounded-lg">
            <h4 className="font-bold text-[12px] text-[#0b1c30] mb-1.5">Top Attributed Drivers</h4>
            <div className="space-y-1 font-data-mono text-[11px]">
              {DEFAULT_INCIDENT_REPORT.topAttributions.map((a, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[#434655]">{a.feature}</span>
                  <span className="font-bold text-[#ba1a1a]">{a.weight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#f8f9ff] border border-[#c3c6d7]/40 rounded-lg">
            <h4 className="font-bold text-[12px] text-[#0b1c30] mb-1.5">Civil Protection Directives</h4>
            <ul className="space-y-1 text-[11px] text-[#0b1c30] list-disc list-inside">
              {DEFAULT_INCIDENT_REPORT.recommendedActions.slice(0, 3).map((a, i) => (
                <li key={i} className="truncate">
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#c3c6d7]/30 text-[11px] font-data-mono text-[#434655]">
          <span>Dispatched To: {DEFAULT_INCIDENT_REPORT.dispatchedTo.join(', ')}</span>
          <span className="text-[#006243] font-semibold">Integrity: Cryptographically Signed (SHA256)</span>
        </div>
      </div>
    </div>
  );
};
