import React, { useRef } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';

export const IncidentReportModal: React.FC = () => {
  const { activeReport, closeReportModal } = useMeghnetra();
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReportModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeReportModal]);

  if (!activeReport) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `
MEGHNETRA INCIDENT REPORT PROTOTYPE
Simulation ID: ${activeReport.id}
Title: ${activeReport.title}
Location: ${activeReport.locationName}
Generated: ${activeReport.generatedAtUtc}
Risk Level: ${activeReport.riskCategory} (${activeReport.probability}%)
Forecast Window: ${activeReport.forecastWindow}
Affected Area: ${activeReport.affectedArea} | Population: ${activeReport.affectedPop}

METEOROLOGICAL SYNTHESIS:
${activeReport.meteorologicalSynthesis}

RECOMMENDED ACTIONS:
${activeReport.recommendedActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Simulated Routing: ${activeReport.dispatchedTo.join(', ')}
Prototype Case Reference: ${activeReport.sdmaReference}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      onClick={closeReportModal}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-[#c3c6d7] overflow-hidden animate-in fade-in zoom-in duration-150"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#eff4ff] border-b border-[#c3c6d7]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#004ac6] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">description</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[15px] text-[#0b1c30]">
                  MEGHNETRA INCIDENT REPORT PROTOTYPE
                </h3>
                <span className="px-1.5 py-0.5 bg-[#dbe1ff] text-[#00174b] font-data-mono text-[10px] font-bold rounded">
                  SIMULATION
                </span>
              </div>
              <p className="text-[11px] text-[#434655] font-data-mono">
                Automated Incident Advisory Prototype (For Evaluation Purposes)
              </p>
            </div>
          </div>

          <button
            onClick={closeReportModal}
            className="w-8 h-8 rounded-lg hover:bg-[#e5eeff] text-[#434655] flex items-center justify-center transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Printable Report Body */}
        <div ref={printRef} className="p-6 overflow-y-auto space-y-5 text-[#0b1c30] text-[13px]">
          {/* Header Simulation */}
          <div className="border-b-2 border-[#004ac6] pb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-label-caps uppercase text-[#004ac6] font-bold tracking-wider">
                MEGHNETRA EARLY WARNING SYSTEM • RESEARCH & OPERATIONAL PROTOTYPE
              </div>
              <h1 className="text-[18px] font-bold text-[#0b1c30] mt-0.5">{activeReport.title}</h1>
              <div className="font-data-mono text-[11px] text-[#434655] mt-1">
                Prototype ID: <strong>{activeReport.id}</strong> • Case Ref: {activeReport.sdmaReference}
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-2.5 py-1 font-data-mono text-[12px] font-bold rounded ${
                  activeReport.riskCategory === 'CRITICAL' || activeReport.riskCategory === 'SEVERE'
                    ? 'bg-[#ba1a1a] text-white'
                    : 'bg-[#004ac6] text-white'
                }`}
              >
                {activeReport.riskCategory} WARNING
              </span>
              <div className="text-[11px] font-data-mono text-[#434655] mt-1">
                Generated: {activeReport.generatedAtUtc}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f8f9ff] border border-[#c3c6d7]/50 rounded-lg p-3">
            <div>
              <div className="text-[10px] font-label-caps uppercase text-[#434655]">Target Location</div>
              <div className="font-bold text-[#0b1c30] text-[13px]">{activeReport.locationName}</div>
            </div>
            <div>
              <div className="text-[10px] font-label-caps uppercase text-[#434655]">Forecast Window</div>
              <div className="font-bold text-[#004ac6] text-[13px]">{activeReport.forecastWindow}</div>
            </div>
            <div>
              <div className="text-[10px] font-label-caps uppercase text-[#434655]">Hazard Probability</div>
              <div className="font-bold text-[#ba1a1a] text-[13px]">{activeReport.probability}% ({activeReport.hazardType.toUpperCase()})</div>
            </div>
            <div>
              <div className="text-[10px] font-label-caps uppercase text-[#434655]">Exposed Population</div>
              <div className="font-bold text-[#0b1c30] text-[13px]">{activeReport.affectedPop}</div>
            </div>
          </div>

          {/* Meteorological Synthesis */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[13px] text-[#0b1c30] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#004ac6]">psychology</span>
              Meteorological & Hydrological Synthesis
            </h4>
            <div className="p-3 bg-[#eff4ff] border-l-4 border-[#004ac6] rounded-r text-[13px] text-[#0b1c30] leading-relaxed italic">
              "{activeReport.meteorologicalSynthesis}"
            </div>
          </div>

          {/* Environmental Snapshots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Atmospheric Snapshot */}
            <div className="border border-[#c3c6d7]/60 rounded-lg p-3 space-y-2 bg-white">
              <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold border-b border-[#e5eeff] pb-1">
                Atmospheric Precursors (INSAT-3DR / IMDAA)
              </div>
              <div className="space-y-1 font-data-mono text-[11px]">
                {Object.entries(activeReport.atmosphericSnapshot).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-0.5 border-b border-[#f8f9ff]">
                    <span className="text-[#434655]">{key}:</span>
                    <span className="font-bold text-[#0b1c30]">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Terrain Snapshot */}
            <div className="border border-[#c3c6d7]/60 rounded-lg p-3 space-y-2 bg-white">
              <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold border-b border-[#e5eeff] pb-1">
                Orographic & Terrain Drivers (CartoDEM)
              </div>
              <div className="space-y-1 font-data-mono text-[11px]">
                {Object.entries(activeReport.terrainSnapshot).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-0.5 border-b border-[#f8f9ff]">
                    <span className="text-[#434655]">{key}:</span>
                    <span className="font-bold text-[#0b1c30]">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Contributing Factors */}
          <div>
            <h4 className="font-bold text-[13px] text-[#0b1c30] mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">insights</span>
              Top Feature Attributions (XAI Engine)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-data-mono text-[11px]">
              {activeReport.topAttributions.map((attr, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-[#f8f9ff] border border-[#c3c6d7]/40 rounded flex items-center justify-between"
                >
                  <span className="text-[#434655]">{attr.feature}</span>
                  <span className="font-bold text-[#ba1a1a] ml-2">{attr.weight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mandatory Emergency Directives */}
          <div>
            <h4 className="font-bold text-[13px] text-[#ba1a1a] mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">emergency</span>
              Mandatory Civil Protection Directives
            </h4>
            <ul className="space-y-1.5 list-disc list-inside bg-[#ffdad6]/20 border border-[#ffdad6] p-3 rounded-lg text-[12px] text-[#0b1c30]">
              {activeReport.recommendedActions.map((action, idx) => (
                <li key={idx} className="leading-snug">
                  <strong>Priority {idx + 1}:</strong> {action}
                </li>
              ))}
            </ul>
          </div>

          {/* Dispatched Simulation Roster */}
          <div className="pt-3 border-t border-[#c3c6d7]/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#434655] font-data-mono">
            <div>
              <span>Simulated Dispatches:</span>{' '}
              <strong className="text-[#0b1c30]">{activeReport.dispatchedTo.join(' • ')}</strong>
            </div>
            <div className="text-right">
              <span>Verification:</span>{' '}
              <span className="font-mono text-[#006243] font-bold">SYNTHESIS-VALIDATED-OK</span>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 py-3 bg-[#eff4ff] border-t border-[#c3c6d7]/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-[#434655] font-data-mono">
            <span>* MEGHNETRA Research & Operational Prototype</span>
            {copied && (
              <span className="px-2 py-0.5 bg-[#85f8c4]/30 text-[#002114] border border-[#85f8c4] font-bold rounded">
                Copied to clipboard!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-white border border-[#c3c6d7] text-[#0b1c30] hover:bg-[#f8f9ff] rounded font-semibold text-[12px] flex items-center gap-1.5 transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied' : 'Copy Bulletin'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#004ac6] text-white hover:bg-[#003ea8] rounded font-semibold text-[12px] flex items-center gap-1.5 shadow-xs transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
