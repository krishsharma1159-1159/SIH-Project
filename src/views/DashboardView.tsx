import React from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { GisMap } from '../components/GisMap';
import { ForecastChart } from '../components/ForecastChart';
import { ForecastHorizonId } from '../types';

// ─── Risk colour helpers ────────────────────────────────────────────
function riskBg(cat: string): string {
  switch (cat) {
    case 'CRITICAL': return 'bg-[#ba1a1a] text-white';
    case 'SEVERE':   return 'bg-[#ba1a1a] text-white';
    case 'HIGH':     return 'bg-[#004ac6] text-white';
    case 'MODERATE': return 'bg-[#f59e0b] text-white';
    default:         return 'bg-[#006243] text-white';
  }
}

function riskText(cat: string): string {
  switch (cat) {
    case 'CRITICAL': return 'text-[#ba1a1a]';
    case 'SEVERE':   return 'text-[#ba1a1a]';
    case 'HIGH':     return 'text-[#004ac6]';
    case 'MODERATE': return 'text-[#d97706]';
    default:         return 'text-[#006243]';
  }
}

function riskBorder(cat: string): string {
  switch (cat) {
    case 'CRITICAL':
    case 'SEVERE':   return 'border-[#ba1a1a]';
    case 'HIGH':     return 'border-[#004ac6]';
    case 'MODERATE': return 'border-[#f59e0b]';
    default:         return 'border-[#006243]';
  }
}

// ─── Situation summary sentence ────────────────────────────────────
function getSituationSummary(locationName: string, riskCategory: string): string {
  const base = locationName.split('&')[0].trim();
  if (riskCategory === 'CRITICAL' || riskCategory === 'SEVERE') {
    return `Dangerous convective activity is rapidly intensifying over ${base} with extremely high multi-hazard risk. Immediate preparedness actions are recommended.`;
  }
  if (riskCategory === 'HIGH') {
    return `Significant convective development is underway over ${base}. Heavy rainfall, cloudburst and flash-flood potential are elevated across the forecast window.`;
  }
  if (riskCategory === 'MODERATE') {
    return `Elevated convective activity is developing over the northern foothills near ${base} with increasing heavy-rainfall potential through the next 2–6 hours.`;
  }
  return `Conditions remain relatively stable over ${base}. Monitor for any rapid deterioration in atmospheric convection.`;
}

// ─── "What happens next?" narrative ───────────────────────────────
function getWhatNextItems(locationName: string) {
  return [
    { label: '+2h', text: 'Convective activity increasing over foothills' },
    { label: '+3h', text: 'Heavy rainfall zone begins to develop' },
    { label: '+4h', text: 'Cloudburst risk peaks — most intense period expected' },
    { label: '+5h', text: 'Flash-flood risk increases in downstream river zones' },
    { label: '+6h', text: 'Gradual dissipation; residual flood risk persists' },
  ];
}

export const DashboardView: React.FC = () => {
  const {
    currentLocationData,
    currentProbabilities,
    currentForecasts,
    selectedForecastHour,
    setSelectedForecastHour,
    selectedHazard,
    setSelectedHazard,
    currentXaiFeatures,
    currentSynthesis,
    alerts,
    viewAlertOnMap,
    acknowledgeAlert,
    openReportModal,
    setActiveView,
  } = useMeghnetra();

  const unackedAlerts = alerts.filter((a) => !a.isAcknowledged);
  const primaryAlert = unackedAlerts[0] || alerts[0];

  const riskCat = currentProbabilities.riskCategory;
  const locationShortName = currentLocationData.name.split('&')[0].trim();

  // Top 4 XAI bullet reasons
  const topReasons = currentXaiFeatures
    .slice()
    .sort((a, b) => b.attributionPct - a.attributionPct)
    .slice(0, 4)
    .map((f) => f.name);

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — CURRENT SITUATION BAR
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-xl shadow-xs border border-[#c3c6d7]/40 p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          {/* Left: location + situation text */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold tracking-wider">
                Current Situation
              </span>
              <span className="w-1 h-1 rounded-full bg-[#c3c6d7]" />
              <span className="font-data-mono text-[11px] text-[#565e74]">
                Updated {new Date().toUTCString().slice(17, 22)} UTC
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2 mb-2">
              <span className="font-bold text-[18px] sm:text-[20px] text-[#0b1c30] leading-tight">
                {locationShortName}
              </span>
              <span className="text-[14px] text-[#434655]">• Uttarakhand</span>
              <span
                className={`px-2 py-0.5 font-data-mono text-[11px] font-bold rounded ${riskBg(riskCat)}`}
              >
                {riskCat} RISK
              </span>
            </div>
            <p className="text-[13px] text-[#434655] leading-snug max-w-2xl">
              {getSituationSummary(currentLocationData.name, riskCat)}
            </p>
          </div>

          {/* Right: key metrics strip */}
          <div className="flex sm:flex-col gap-3 sm:gap-2 sm:text-right sm:items-end shrink-0">
            <div>
              <span className="font-label-caps text-[10px] uppercase text-[#434655] block">
                Forecast Window
              </span>
              <span className="font-data-mono text-[13px] font-bold text-[#0b1c30]">
                Next 2–6 hours
              </span>
            </div>
            <div>
              <span className="font-label-caps text-[10px] uppercase text-[#434655] block">
                Coordinates
              </span>
              <span className="font-data-mono text-[11px] text-[#565e74]">
                {currentLocationData.lat.toFixed(4)}° N, {currentLocationData.lng.toFixed(4)}° E
              </span>
            </div>
            <div>
              <span className="font-label-caps text-[10px] uppercase text-[#434655] block">
                Elevation
              </span>
              <span className="font-data-mono text-[11px] text-[#0b1c30] font-semibold">
                {currentLocationData.elevation} m
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — HAZARD CARDS (3 cards) + SECTION 3 MAP
      ════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left column: Hazard cards + Location Panel */}
        <div className="lg:col-span-4 flex flex-col gap-3">

          {/* ── HAZARD CARDS ── */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">

            {/* THUNDERSTORM */}
            <button
              onClick={() => setSelectedHazard('storm')}
              className={`bg-white rounded-xl p-3 shadow-xs flex flex-col gap-1 border-2 text-left transition-all ${
                selectedHazard === 'storm'
                  ? 'border-[#004ac6] ring-1 ring-[#004ac6]'
                  : 'border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">thunderstorm</span>
                  <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
                    Thunderstorm
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.5 font-data-mono text-[10px] font-bold rounded ${
                    currentProbabilities.storm >= 70 ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#dbe1ff] text-[#004ac6]'
                  }`}
                >
                  {currentProbabilities.storm >= 70 ? 'SEVERE' : 'HIGH'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[22px] text-[#0b1c30]">{currentProbabilities.storm}</span>
                <span className="font-data-mono text-[11px] text-[#434655]">% Probability</span>
              </div>
              <div className="w-full bg-[#e5eeff] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#ba1a1a] h-1.5 rounded-full" style={{ width: `${currentProbabilities.storm}%` }} />
              </div>
              <div className="flex items-center justify-between font-data-mono text-[10px] text-[#434655] mt-0.5">
                <span>Peak</span>
                <span className="font-bold text-[#0b1c30]">{currentLocationData.peaks.storm}</span>
              </div>
            </button>

            {/* CLOUDBURST */}
            <button
              onClick={() => setSelectedHazard('cloudburst')}
              className={`bg-white rounded-xl p-3 shadow-xs flex flex-col gap-1 border-2 text-left transition-all ${
                selectedHazard === 'cloudburst'
                  ? 'border-[#ba1a1a] ring-1 ring-[#ba1a1a]'
                  : 'border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">water_drop</span>
                  <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
                    Cloudburst
                  </span>
                </div>
                <span className="px-1.5 py-0.5 bg-[#ba1a1a] text-white font-data-mono text-[10px] font-bold rounded">
                  HIGH
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[22px] text-[#0b1c30]">{currentProbabilities.cloudburst}</span>
                <span className="font-data-mono text-[11px] text-[#434655]">% Probability</span>
              </div>
              <div className="w-full bg-[#e5eeff] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#ba1a1a] h-1.5 rounded-full" style={{ width: `${currentProbabilities.cloudburst}%` }} />
              </div>
              <div className="flex items-center justify-between font-data-mono text-[10px] text-[#434655] mt-0.5">
                <span>Peak</span>
                <span className="font-bold text-[#ba1a1a]">{currentLocationData.peaks.cloudburst}</span>
              </div>
            </button>

            {/* FLASH FLOOD */}
            <button
              onClick={() => setSelectedHazard('flashflood')}
              className={`bg-white rounded-xl p-3 shadow-xs flex flex-col gap-1 border-2 text-left transition-all ${
                selectedHazard === 'flashflood'
                  ? 'border-[#2563eb] ring-1 ring-[#2563eb]'
                  : 'border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#2563eb]">flood</span>
                  <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
                    Flash Flood
                  </span>
                </div>
                <span className="px-1.5 py-0.5 bg-[#dae2fd] text-[#131b2e] font-data-mono text-[10px] font-bold rounded">
                  ELEVATED
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[22px] text-[#0b1c30]">{currentProbabilities.flashFlood}</span>
                <span className="font-data-mono text-[11px] text-[#434655]">% Probability</span>
              </div>
              <div className="w-full bg-[#e5eeff] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#2563eb] h-1.5 rounded-full" style={{ width: `${currentProbabilities.flashFlood}%` }} />
              </div>
              <div className="flex items-center justify-between font-data-mono text-[10px] text-[#434655] mt-0.5">
                <span>Peak</span>
                <span className="font-bold text-[#2563eb]">{currentLocationData.peaks.flashFlood}</span>
              </div>
            </button>
          </div>

          {/* ── LOCATION PANEL ── */}
          <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
                  Location
                </span>
                <div className="font-bold text-[15px] text-[#0b1c30] mt-0.5 leading-tight">
                  {currentLocationData.name}
                </div>
                <div className="font-data-mono text-[11px] text-[#565e74] mt-0.5">
                  {currentLocationData.lat.toFixed(4)}° N, {currentLocationData.lng.toFixed(4)}° E
                </div>
                <div className="font-data-mono text-[11px] text-[#565e74]">
                  Elevation: {currentLocationData.elevation} m
                </div>
              </div>
              <span className={`px-2 py-0.5 font-data-mono text-[11px] font-bold rounded ${riskBg(riskCat)}`}>
                {riskCat}
              </span>
            </div>

            {/* Threat Summary */}
            <div className="mb-3">
              <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold block mb-1.5">
                Threat Summary
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-data-mono text-[11px]">
                  <span className="text-[#0b1c30]">Thunderstorm</span>
                  <span className={`font-bold ${currentProbabilities.storm >= 70 ? 'text-[#ba1a1a]' : 'text-[#004ac6]'}`}>
                    {currentProbabilities.storm >= 70 ? 'HIGH' : 'MODERATE'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-data-mono text-[11px]">
                  <span className="text-[#0b1c30]">Cloudburst</span>
                  <span className="font-bold text-[#ba1a1a]">HIGH</span>
                </div>
                <div className="flex items-center justify-between font-data-mono text-[11px]">
                  <span className="text-[#0b1c30]">Flash Flood</span>
                  <span className="font-bold text-[#2563eb]">ELEVATED</span>
                </div>
              </div>
            </div>

            {/* Exposure */}
            <div className="bg-[#eff4ff] rounded-lg p-2.5">
              <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold block mb-1">
                Exposed Area
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-[20px] text-[#0b1c30]">
                  {currentLocationData.exposedAreaKm2}
                </span>
                <span className="font-data-mono text-[11px] text-[#434655]">km²</span>
              </div>
              <div className="font-data-mono text-[10px] text-[#565e74] mt-0.5">
                ~{currentLocationData.populationExposed.toLocaleString()} residents
              </div>
            </div>

            {/* Quick links */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setActiveView('location-intelligence')}
                className="flex-1 px-2 py-1.5 bg-[#eff4ff] text-[#004ac6] hover:bg-[#dce9ff] rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 border border-[#c3c6d7]/40"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">share_location</span>
                <span>Full Analysis</span>
              </button>
              <button
                onClick={() => setActiveView('live-gis-map')}
                className="flex-1 px-2 py-1.5 bg-[#eff4ff] text-[#004ac6] hover:bg-[#dce9ff] rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 border border-[#c3c6d7]/40"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">map</span>
                <span>GIS Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: GIS Map (larger) */}
        <div className="lg:col-span-8 flex flex-col">
          <GisMap />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — FORECAST TIMELINE
      ════════════════════════════════════════════════════════════ */}
      <section id="forecast-timeline-section" className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
                Forecast Timeline
              </span>
              <span className="w-1 h-1 rounded-full bg-[#c3c6d7]" />
              <span className="font-bold text-[15px] text-[#0b1c30]">
                Multi-Hazard Nowcast
              </span>
            </div>
            <p className="text-[12px] text-[#434655] mt-0.5">
              {currentLocationData.name} — next 2–6 hours
            </p>
          </div>
          <button
            onClick={() => setActiveView('forecast-timeline')}
            className="px-3 py-1.5 bg-[#004ac6] text-white rounded font-semibold flex items-center gap-1.5 text-[12px] hover:bg-[#003ea8] transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">timelapse</span>
            <span>Full Timeline</span>
          </button>
        </div>

        {/* Horizon Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {currentForecasts.map((f) => {
            const isSelected = selectedForecastHour === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedForecastHour(f.id as ForecastHorizonId)}
                className={`p-2.5 rounded-lg flex flex-col justify-between text-left transition-all border ${
                  isSelected
                    ? 'ring-2 ring-[#004ac6] bg-[#dbe1ff]/40 border-[#004ac6]'
                    : f.isPeakCloudburst || f.isPeakStorm
                    ? 'bg-[#ffdad6]/30 border-[#ba1a1a]/30 hover:border-[#ba1a1a]'
                    : 'bg-[#eff4ff] border-transparent hover:border-[#c3c6d7]'
                }`}
                type="button"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-data-mono text-[11px] font-bold text-[#0b1c30]">
                      {f.label}
                    </span>
                    <span
                      className={`px-1 py-0.5 font-data-mono text-[9px] rounded font-bold ${
                        f.isPeakStorm || f.isPeakCloudburst
                          ? 'bg-[#ba1a1a] text-white'
                          : f.isPeakFlood
                          ? 'bg-[#2563eb] text-white'
                          : 'bg-[#dae2fd] text-[#00174b]'
                      }`}
                    >
                      {f.statusTag}
                    </span>
                  </div>

                  <div className="space-y-0.5 font-data-mono text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-[#434655]">Storm</span>
                      <span className={f.stormProb >= 70 ? 'text-[#ba1a1a] font-bold' : 'font-bold'}>
                        {f.stormProb}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#434655]">CB</span>
                      <span className={f.cloudburstProb >= 70 ? 'text-[#ba1a1a] font-bold' : 'font-bold'}>
                        {f.cloudburstProb}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#434655]">Flood</span>
                      <span className={f.flashFloodProb >= 70 ? 'text-[#2563eb] font-bold' : 'font-bold'}>
                        {f.flashFloodProb}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 pt-1 border-t border-[#c3c6d7]/30 text-[9px] text-[#434655] leading-snug">
                  {f.notes}
                </div>
              </button>
            );
          })}
        </div>

        {/* Probability chart */}
        <ForecastChart />

        {/* WHAT HAPPENS NEXT? */}
        <div className="bg-[#eff4ff] rounded-xl p-3.5 border border-[#c3c6d7]/30">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="material-symbols-outlined text-[#004ac6] text-[18px]">schedule_send</span>
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold tracking-wider">
              What Happens Next?
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {getWhatNextItems(locationShortName).map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-2 bg-white rounded-lg p-2 border border-[#c3c6d7]/30"
              >
                <span className="font-data-mono text-[11px] font-bold text-[#004ac6] shrink-0 mt-0.5">
                  {item.label}
                </span>
                <span className="text-[11px] text-[#0b1c30] leading-snug">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 — ACTIVE WARNING + WHY THIS ALERT (XAI)
      ════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Active Warning Card */}
        <div className="lg:col-span-7">
          {primaryAlert ? (
            <div className={`bg-white rounded-xl shadow-xs p-4 border-l-4 border ${
              primaryAlert.level === 'RED ADVISORY'
                ? 'border-l-[#ba1a1a] border-[#c3c6d7]/40'
                : 'border-l-[#004ac6] border-[#c3c6d7]/40'
            }`}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">warning</span>
                <span className={`font-label-caps text-[11px] uppercase font-bold ${
                  primaryAlert.level === 'RED ADVISORY' ? 'text-[#ba1a1a]' : 'text-[#004ac6]'
                }`}>
                  Active Warning
                </span>
                <span className={`px-2 py-0.5 font-data-mono text-[10px] font-bold rounded ${
                  primaryAlert.level === 'RED ADVISORY' ? 'bg-[#ba1a1a] text-white' : 'bg-[#004ac6] text-white'
                }`}>
                  {primaryAlert.level}
                </span>
                {unackedAlerts.length > 1 && (
                  <span className="ml-auto font-data-mono text-[10px] text-[#434655]">
                    +{unackedAlerts.length - 1} more in Alert Center
                  </span>
                )}
              </div>

              <div className="font-bold text-[17px] text-[#0b1c30] mb-0.5">
                {primaryAlert.title}
              </div>
              <div className="font-data-mono text-[12px] text-[#434655] mb-1">
                {primaryAlert.locationName} &nbsp;•&nbsp; Peak: {primaryAlert.leadTime}
              </div>
              <div className="font-data-mono text-[11px] text-[#565e74] mb-3">
                Affected area: {primaryAlert.affectedArea}
              </div>

              <div className="bg-[#eff4ff] rounded-lg p-3 mb-3">
                <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold block mb-1">
                  Recommended Action
                </span>
                <p className="text-[13px] text-[#0b1c30] leading-snug">
                  {primaryAlert.recommendedAction}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => viewAlertOnMap(primaryAlert)}
                  className="px-3 py-1.5 bg-[#eff4ff] text-[#004ac6] hover:bg-[#dce9ff] rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1.5 border border-[#c3c6d7]/40"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">map</span>
                  <span>View on Map</span>
                </button>
                <button
                  onClick={() => setActiveView('alert-center')}
                  className="px-3 py-1.5 bg-[#004ac6] text-white hover:bg-[#003ea8] rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1.5"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  <span>View Details</span>
                </button>
                <button
                  onClick={() => openReportModal()}
                  className="px-3 py-1.5 bg-white border border-[#c3c6d7] text-[#434655] hover:bg-[#eff4ff] rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1.5"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">description</span>
                  <span>Generate Draft Alert</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#85f8c4]/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#006243] text-[22px]">check_circle</span>
              </div>
              <div>
                <div className="font-bold text-[14px] text-[#0b1c30]">No Active Warnings</div>
                <div className="text-[12px] text-[#434655]">All alerts acknowledged. Monitoring continues.</div>
              </div>
            </div>
          )}
        </div>

        {/* WHY THIS ALERT? — XAI Summary */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#004ac6] text-[20px]">psychology_alt</span>
                <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold tracking-wider">
                  Why This Alert?
                </span>
              </div>
              <span className="font-data-mono text-[10px] text-[#434655]">
                {selectedHazard.toUpperCase()}
              </span>
            </div>

            <ul className="space-y-2 flex-1">
              {topReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#dbe1ff] text-[#004ac6] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-[12px] text-[#0b1c30] leading-snug">{reason}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 pt-3 border-t border-[#c3c6d7]/30">
              <p className="text-[11px] text-[#565e74] italic leading-snug mb-2.5">
                "{currentSynthesis.slice(0, 120)}{currentSynthesis.length > 120 ? '…' : ''}"
              </p>
              <button
                onClick={() => setActiveView('model-intelligence-and-xai')}
                className="w-full px-3 py-2 bg-[#eff4ff] text-[#004ac6] hover:bg-[#dce9ff] rounded-lg text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 border border-[#c3c6d7]/40"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                <span>View Full XAI & Model Details</span>
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
