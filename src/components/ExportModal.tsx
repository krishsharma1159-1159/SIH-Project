import React, { useState } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';

export const ExportModal: React.FC = () => {
  const { exportModalData, closeExportModal, currentLocationData, currentProbabilities, selectedHorizonData } =
    useMeghnetra();

  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!exportModalData) return null;

  const triggerDownload = (fileName: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(fileName);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const exportJson = () => {
    const data = {
      project: 'MEGHNETRA - AI-Driven Early Warning System',
      team: 'TEAM VIRAJ',
      classification: 'Prototype Demonstration Data',
      timestampUtc: new Date().toISOString(),
      location: currentLocationData,
      forecastWindow: selectedHorizonData,
      probabilities: currentProbabilities,
    };
    triggerDownload(
      `MEGHNETRA_${currentLocationData.id}_${Date.now()}.json`,
      JSON.stringify(data, null, 2),
      'application/json'
    );
  };

  const exportCsv = () => {
    const csvRows = [
      'Station,Latitude,Longitude,Elevation_m,Risk_Category,Storm_Prob_Pct,Cloudburst_Prob_Pct,FlashFlood_Prob_Pct,IWV_kg_m2,CAPE_J_kg,CTT_degC',
      `${currentLocationData.name},${currentLocationData.lat},${currentLocationData.lng},${currentLocationData.elevation},${currentProbabilities.riskCategory},${currentProbabilities.storm},${currentProbabilities.cloudburst},${currentProbabilities.flashFlood},${currentLocationData.atmospheric.iwv},${currentLocationData.atmospheric.cape},${currentLocationData.atmospheric.ctt}`,
    ];
    triggerDownload(
      `MEGHNETRA_Telemetry_${currentLocationData.id}.csv`,
      csvRows.join('\n'),
      'text/csv'
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-[#c3c6d7] overflow-hidden">
        <div className="px-4 py-3 bg-[#eff4ff] border-b border-[#c3c6d7]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#004ac6] text-[20px]">download</span>
            <h3 className="font-bold text-[14px] text-[#0b1c30]">Export Telemetry & Reports</h3>
          </div>
          <button
            onClick={closeExportModal}
            className="w-7 h-7 rounded hover:bg-[#e5eeff] text-[#434655] flex items-center justify-center"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[12px] text-[#434655]">
            Export standardized nowcasting packages for ingestion into SDMA, NDMA, or geographic information systems (GIS).
          </p>

          {downloadSuccess && (
            <div className="p-2 bg-[#85f8c4]/30 border border-[#85f8c4] text-[#002114] rounded text-[11px] font-mono font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Successfully exported: {downloadSuccess}</span>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={exportJson}
              className="w-full p-2.5 bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#c3c6d7]/60 rounded-lg text-left flex items-center justify-between transition-colors"
              type="button"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#004ac6]">data_object</span>
                <div>
                  <div className="font-bold text-[13px] text-[#0b1c30]">NDMA JSON Bulletin</div>
                  <div className="text-[11px] text-[#434655]">Complete spatiotemporal state & XAI attributions</div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[#004ac6] font-bold">.JSON</span>
            </button>

            <button
              onClick={exportCsv}
              className="w-full p-2.5 bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#c3c6d7]/60 rounded-lg text-left flex items-center justify-between transition-colors"
              type="button"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#006243]">table_chart</span>
                <div>
                  <div className="font-bold text-[13px] text-[#0b1c30]">Meteorological Station CSV</div>
                  <div className="text-[11px] text-[#434655]">Raw atmospheric, CartoDEM terrain & probability metrics</div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[#006243] font-bold">.CSV</span>
            </button>

            <button
              onClick={() => {
                closeExportModal();
                window.print();
              }}
              className="w-full p-2.5 bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#c3c6d7]/60 rounded-lg text-left flex items-center justify-between transition-colors"
              type="button"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#ba1a1a]">picture_as_pdf</span>
                <div>
                  <div className="font-bold text-[13px] text-[#0b1c30]">Print Command Overview (PDF)</div>
                  <div className="text-[11px] text-[#434655]">Direct browser print dialog with styled layout</div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-[#ba1a1a] font-bold">.PDF</span>
            </button>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-[#f8f9ff] border-t border-[#c3c6d7]/50 text-right">
          <button
            onClick={closeExportModal}
            className="px-3 py-1 bg-white border border-[#c3c6d7] text-[#434655] rounded text-[12px] hover:bg-[#eff4ff]"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
