import React, { useState } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';

export const ShareModal: React.FC = () => {
  const { shareModalData, closeShareModal, currentLocationData, currentProbabilities } =
    useMeghnetra();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!shareModalData) return null;

  const handleCopy = (key: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const shareLink = window.location.href;
  const bulletinSummary = `[MEGHNETRA EARLY WARNING] Location: ${currentLocationData.name} | Threat Level: ${currentProbabilities.riskCategory} | Storm: ${currentProbabilities.storm}% | Cloudburst: ${currentProbabilities.cloudburst}% | Flash Flood: ${currentProbabilities.flashFlood}% | Lead Time: +4h | SDMA Link Active.`;
  const sdmaCapPayload = JSON.stringify(
    {
      identifier: `CAP-UT-${Date.now()}`,
      sender: 'MEGHNETRA-TEAM-VIRAJ',
      sent: new Date().toISOString(),
      status: 'Exercise/Prototype',
      msgType: 'Alert',
      scope: 'Public',
      info: {
        category: 'Met',
        event: 'Severe Weather / Cloudburst / Flash Flood',
        urgency: 'Immediate',
        severity: currentProbabilities.riskCategory,
        certainty: 'Observed/High',
        area: currentLocationData.name,
      },
    },
    null,
    2
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-[#c3c6d7] overflow-hidden">
        <div className="px-4 py-3 bg-[#eff4ff] border-b border-[#c3c6d7]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#004ac6] text-[20px]">share</span>
            <h3 className="font-bold text-[14px] text-[#0b1c30]">Share Weather Alert & Dispatch</h3>
          </div>
          <button
            onClick={closeShareModal}
            className="w-7 h-7 rounded hover:bg-[#e5eeff] text-[#434655] flex items-center justify-center"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-4 space-y-4 text-[13px]">
          {/* Option 1: Dashboard Link */}
          <div className="space-y-1">
            <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
              1. Copy Direct Console Link
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 bg-[#f8f9ff] border border-[#c3c6d7] rounded px-2.5 py-1.5 font-mono text-[11px] text-[#0b1c30] select-all"
              />
              <button
                onClick={() => handleCopy('link', shareLink)}
                className="px-3 py-1.5 bg-[#004ac6] text-white rounded text-[11px] font-semibold hover:bg-[#003ea8] transition-colors whitespace-nowrap"
                type="button"
              >
                {copiedKey === 'link' ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Option 2: SMS / WhatsApp Dispatch Text */}
          <div className="space-y-1">
            <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
              2. Situational Bulletin Summary (SMS / WhatsApp)
            </div>
            <textarea
              readOnly
              rows={3}
              value={bulletinSummary}
              className="w-full bg-[#f8f9ff] border border-[#c3c6d7] rounded p-2 font-mono text-[11px] text-[#0b1c30] resize-none"
            />
            <button
              onClick={() => handleCopy('summary', bulletinSummary)}
              className="w-full py-1.5 bg-[#eff4ff] border border-[#c3c6d7] text-[#004ac6] rounded font-semibold text-[11px] hover:bg-[#e5eeff] transition-colors flex items-center justify-center gap-1"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">sms</span>
              <span>{copiedKey === 'summary' ? 'Copied to Clipboard!' : 'Copy Alert Text'}</span>
            </button>
          </div>

          {/* Option 3: NDMA Standardized CAP Payload */}
          <div className="space-y-1">
            <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
              3. CAP Protocol JSON (Common Alerting Protocol)
            </div>
            <pre className="bg-[#0b1c30] text-[#85f8c4] p-2.5 rounded font-mono text-[10px] max-h-28 overflow-y-auto">
              {sdmaCapPayload}
            </pre>
            <button
              onClick={() => handleCopy('cap', sdmaCapPayload)}
              className="w-full py-1 bg-white border border-[#c3c6d7] text-[#0b1c30] rounded font-semibold text-[11px] hover:bg-[#f8f9ff] transition-colors flex items-center justify-center gap-1"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">code</span>
              <span>{copiedKey === 'cap' ? 'CAP JSON Copied!' : 'Copy CAP JSON'}</span>
            </button>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-[#f8f9ff] border-t border-[#c3c6d7]/50 text-right">
          <button
            onClick={closeShareModal}
            className="px-3 py-1 bg-white border border-[#c3c6d7] text-[#434655] rounded text-[12px] hover:bg-[#eff4ff]"
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
