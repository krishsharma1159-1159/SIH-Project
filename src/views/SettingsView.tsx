import React, { useState } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { LOCATIONS } from '../data/mockData';
import { LocationId, ForecastHorizonId } from '../types';

export const SettingsView: React.FC = () => {
  const {
    isAudioAlertEnabled,
    toggleAudioAlert,
    selectedLocation,
    setSelectedLocation,
    selectedForecastHour,
    setSelectedForecastHour,
  } = useMeghnetra();

  const [simulationSpeed, setSimulationSpeed] = useState<'realtime' | 'accelerated'>('realtime');
  const [themeMode, setThemeMode] = useState<'stitch-light' | 'high-contrast'>('stitch-light');
  const [saveConfirmation, setSaveConfirmation] = useState<boolean>(false);

  const handleSave = () => {
    setSaveConfirmation(true);
    setTimeout(() => setSaveConfirmation(false), 2500);
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-8 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
              Console Preferences
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              Operational Settings & Telemetry Preferences
            </h2>
          </div>
          <p className="text-[12px] text-[#434655]">
            Configure warning thresholds, simulation playback, and audio dispatch feeds
          </p>
        </div>

        <span className="px-2.5 py-1 bg-[#dbe1ff] text-[#00174b] font-data-mono text-[11px] font-bold rounded">
          PROTOTYPE SIMULATION MODE
        </span>
      </div>

      {saveConfirmation && (
        <div className="p-3 bg-[#85f8c4]/30 border border-[#85f8c4] text-[#002114] rounded-xl font-mono text-[12px] font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Preferences updated and persisted for current session.</span>
        </div>
      )}

      {/* Settings Sections */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-[#c3c6d7]/40 space-y-5">
        {/* Audio Alerts */}
        <div className="space-y-2 border-b border-[#c3c6d7]/30 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[14px] text-[#0b1c30]">Audible Sirens & Emergency Chimes</h3>
              <p className="text-[12px] text-[#434655]">
                Play acoustic alerts on detection of Critical (&gt;80%) cloudburst or flash flood hazard
              </p>
            </div>
            <button
              onClick={toggleAudioAlert}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1.5 ${
                isAudioAlertEnabled
                  ? 'bg-[#004ac6] text-white'
                  : 'bg-[#eff4ff] text-[#434655] border border-[#c3c6d7]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isAudioAlertEnabled ? 'volume_up' : 'volume_off'}
              </span>
              <span>{isAudioAlertEnabled ? 'Enabled' : 'Muted'}</span>
            </button>
          </div>
        </div>

        {/* Default Observation Station */}
        <div className="space-y-2 border-b border-[#c3c6d7]/30 pb-4">
          <h3 className="font-bold text-[14px] text-[#0b1c30]">Primary Default Station</h3>
          <p className="text-[12px] text-[#434655]">
            Station to automatically focus and center on console boot
          </p>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value as LocationId)}
            className="w-full sm:w-80 bg-[#eff4ff] border border-[#c3c6d7] rounded-lg px-3 py-2 text-[13px] font-medium text-[#0b1c30]"
          >
            {Object.values(LOCATIONS).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Default Forecast Horizon */}
        <div className="space-y-2 border-b border-[#c3c6d7]/30 pb-4">
          <h3 className="font-bold text-[14px] text-[#0b1c30]">Default Forecast Horizon Window</h3>
          <p className="text-[12px] text-[#434655]">
            Target nowcast lead time displayed on initial view
          </p>
          <div className="flex flex-wrap gap-2">
            {(['now', '2h', '3h', '4h', '5h', '6h'] as ForecastHorizonId[]).map((h) => (
              <button
                key={h}
                onClick={() => setSelectedForecastHour(h)}
                className={`px-3 py-1.5 rounded text-[12px] font-mono font-semibold transition-colors ${
                  selectedForecastHour === h
                    ? 'bg-[#004ac6] text-white'
                    : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]'
                }`}
                type="button"
              >
                {h.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Speed */}
        <div className="space-y-2 border-b border-[#c3c6d7]/30 pb-4">
          <h3 className="font-bold text-[14px] text-[#0b1c30]">Nowcast Loop Playback Speed</h3>
          <p className="text-[12px] text-[#434655]">
            Control speed of automated temporal progression loops on the GIS map
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setSimulationSpeed('realtime')}
              className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                simulationSpeed === 'realtime'
                  ? 'bg-[#004ac6] text-white'
                  : 'bg-[#eff4ff] text-[#0b1c30]'
              }`}
              type="button"
            >
              1x Real-Time Interval (4.2m Cycle)
            </button>
            <button
              onClick={() => setSimulationSpeed('accelerated')}
              className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                simulationSpeed === 'accelerated'
                  ? 'bg-[#004ac6] text-white'
                  : 'bg-[#eff4ff] text-[#0b1c30]'
              }`}
              type="button"
            >
              Accelerated Demo Mode (2s / Hour)
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#004ac6] text-white rounded-lg font-semibold text-[13px] hover:bg-[#003ea8] transition-colors shadow-xs"
            type="button"
          >
            Save Console Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
