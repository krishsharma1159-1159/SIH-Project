import React, { useState } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { AlertItem } from '../types';

export const AlertCenterView: React.FC = () => {
  const { alerts, acknowledgeAlert, viewAlertOnMap, openReportModal, openShareModal } =
    useMeghnetra();

  const [filterLevel, setFilterLevel] = useState<'ALL' | 'RED' | 'ORANGE' | 'YELLOW'>('ALL');
  const [selectedAlertForDrawer, setSelectedAlertForDrawer] = useState<AlertItem | null>(null);
  const [broadcastLog, setBroadcastLog] = useState<string[]>([]);

  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (filterLevel === 'ALL') return true;
    if (filterLevel === 'RED') return a.level.includes('RED');
    if (filterLevel === 'ORANGE') return a.level.includes('ORANGE');
    if (filterLevel === 'YELLOW') return a.level.includes('YELLOW');
    return true;
  });

  const handleSimulateCapBroadcast = (alert: AlertItem) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = `[${timestamp}] CAP Protocol Simulation: "${alert.title}" compiled in OASIS CAP v1.2 XML format (Prototype Mode — no live emergency network dispatch).`;
    setBroadcastLog((prev) => [newLog, ...prev]);
    setFeedbackBanner(`Broadcast Simulated (Prototype Mode): CAP 1.2 payload generated for "${alert.title}"`);
    setTimeout(() => {
      setFeedbackBanner(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#ba1a1a] font-bold">
              Emergency Directives Hub
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              Alert Center & CAP Broadcast Gateway
            </h2>
          </div>
          <p className="text-[12px] text-[#434655]">
            Interoperable disaster dispatch protocol aligned with NDMA / SDMA Common Alerting Protocol (CAP)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex items-center gap-1 bg-[#eff4ff] p-1 rounded-lg font-data-mono text-[11px]">
            {(['ALL', 'RED', 'ORANGE', 'YELLOW'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                  filterLevel === lvl
                    ? 'bg-[#004ac6] text-white shadow-2xs'
                    : 'text-[#434655] hover:bg-[#dce9ff]'
                }`}
                type="button"
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Feedback Banner */}
      {feedbackBanner && (
        <div className="p-3 bg-[#85f8c4]/30 border border-[#85f8c4] text-[#002114] rounded-xl font-mono text-[12px] font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#006243]">check_circle</span>
            <span>{feedbackBanner}</span>
          </div>
          <span className="text-[10px] uppercase font-sans tracking-wide bg-white px-2 py-0.5 rounded border border-[#85f8c4] text-[#006243]">
            Simulated
          </span>
        </div>
      )}

      {/* Broadcast Log Notification Bar if broadcast simulated */}
      {broadcastLog.length > 0 && (
        <div className="bg-[#0b1c30] text-[#85f8c4] p-3 rounded-xl font-mono text-[11px] border border-[#85f8c4]/40 space-y-1 max-h-32 overflow-y-auto">
          <div className="font-bold text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#85f8c4]">cell_tower</span>
            <span>CAP Protocol Broadcast Gateway Telemetry Log</span>
          </div>
          {broadcastLog.map((log, idx) => (
            <div key={idx} className="leading-snug">
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Main Alert List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredAlerts.map((alert) => {
          const isRed = alert.level.includes('RED');
          return (
            <div
              key={alert.id}
              className={`bg-white rounded-xl shadow-xs p-4 border-l-4 flex flex-col md:flex-row justify-between gap-4 transition-all ${
                isRed
                  ? 'border-l-[#ba1a1a] border-t border-r border-b border-[#c3c6d7]/40'
                  : 'border-l-[#004ac6] border-t border-r border-b border-[#c3c6d7]/40'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 font-data-mono text-[11px] font-bold rounded ${
                      isRed ? 'bg-[#ba1a1a] text-white' : 'bg-[#004ac6] text-white'
                    }`}
                  >
                    {alert.level}
                  </span>
                  <span className="font-data-mono text-[11px] text-[#434655]">
                    ID: <strong>{alert.id}</strong>
                  </span>
                  <span className="font-data-mono text-[11px] text-[#434655]">
                    Issued: {alert.issuedAtUtc}
                  </span>
                  <span className="font-data-mono text-[11px] text-[#ba1a1a] font-bold">
                    Lead Time: {alert.leadTime}
                  </span>
                </div>

                <h3 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
                  {alert.title} — {alert.locationName}
                </h3>

                <div className="font-data-mono text-[11px] text-[#434655] flex flex-wrap gap-4">
                  <span>
                    Affected Area: <strong className="text-[#0b1c30]">{alert.affectedArea}</strong>
                  </span>
                  <span>
                    Exposed Population:{' '}
                    <strong className="text-[#0b1c30]">{alert.affectedPop}</strong>
                  </span>
                  <span>
                    Hazard Probability:{' '}
                    <strong className="text-[#ba1a1a]">{alert.probability}%</strong>
                  </span>
                </div>

                <p className="text-[12px] text-[#0b1c30] bg-[#eff4ff] p-2.5 rounded-lg leading-relaxed">
                  <strong>Civil Protection Directive:</strong> {alert.recommendedAction}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col justify-between gap-2 min-w-[200px] border-t md:border-t-0 md:border-l border-[#c3c6d7]/40 pt-3 md:pt-0 md:pl-4">
                <button
                  onClick={() => handleSimulateCapBroadcast(alert)}
                  className={`px-3 py-2 rounded text-[12px] font-semibold text-white flex items-center justify-center gap-1.5 shadow-2xs transition-colors ${
                    isRed ? 'bg-[#ba1a1a] hover:bg-[#991b1b]' : 'bg-[#004ac6] hover:bg-[#003ea8]'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">campaign</span>
                  <span>Broadcast CAP Alert</span>
                </button>

                <button
                  onClick={() => {
                    acknowledgeAlert(alert.id);
                  }}
                  className={`px-3 py-2 rounded text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    alert.isAcknowledged
                      ? 'bg-[#85f8c4]/30 text-[#002114] border border-[#85f8c4]'
                      : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] border border-[#c3c6d7]/40'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {alert.isAcknowledged ? 'check_circle' : 'task_alt'}
                  </span>
                  <span>{alert.isAcknowledged ? 'Status: Acknowledged' : 'Acknowledge Directive'}</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => viewAlertOnMap(alert)}
                    className="p-1.5 bg-white border border-[#c3c6d7] text-[#004ac6] hover:bg-[#eff4ff] rounded text-[11px] font-semibold text-center"
                    type="button"
                  >
                    View on Map
                  </button>
                  <button
                    onClick={() => openReportModal()}
                    className="p-1.5 bg-white border border-[#c3c6d7] text-[#0b1c30] hover:bg-[#eff4ff] rounded text-[11px] font-semibold text-center"
                    type="button"
                  >
                    Bulletin
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
