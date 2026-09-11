import React from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { GisMap } from '../components/GisMap';
import { ForecastChart } from '../components/ForecastChart';
import { HazardType, ForecastHorizonId } from '../types';

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
    openShareModal,
    openExportModal,
    setActiveView,
    dataFeeds,
  } = useMeghnetra();

  // Scroll to section helper
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* 1. WORKFLOW STEPPER / PARADIGM BANNER */}
      <section className="w-full bg-white rounded-xl shadow-xs p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold tracking-wider">
              Operational Paradigm
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <span className="font-data-mono text-[12px] text-[#434655] font-medium">
              MEGHNETRA REAL-TIME PIPELINE
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-data-mono text-[11px] text-[#006243] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#006243] animate-pulse"></span>
            <span>SYNCHRONIZED • ACTIVE LOOP CYCLE 04</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {/* Step 1: OBSERVE */}
          <button
            onClick={() => scrollToSection('data-ingestion-section')}
            className="flex items-center gap-2.5 p-2 rounded-lg bg-[#eff4ff] transition-all hover:bg-[#dce9ff] text-left border border-transparent hover:border-[#c3c6d7]"
            type="button"
          >
            <div className="w-8 h-8 rounded-lg bg-[#d3e4fe] text-[#004ac6] flex items-center justify-center font-bold text-[13px]">
              01
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-[13px] font-bold text-[#0b1c30]">OBSERVE</span>
                <span className="material-symbols-outlined text-[16px] text-[#006243]">sensors</span>
              </div>
              <p className="text-[11px] text-[#434655] truncate">INSAT-3D, QPE & Radar feeds</p>
            </div>
          </button>

          {/* Step 2: PREDICT */}
          <button
            onClick={() => scrollToSection('forecast-timeline-section')}
            className="flex items-center gap-2.5 p-2 rounded-lg bg-[#dbe1ff]/60 transition-all hover:bg-[#dbe1ff] text-left border border-[#004ac6]/30"
            type="button"
          >
            <div className="w-8 h-8 rounded-lg bg-[#004ac6] text-white flex items-center justify-center font-bold text-[13px]">
              02
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-[13px] font-bold text-[#004ac6]">PREDICT</span>
                <span className="material-symbols-outlined text-[16px] text-[#004ac6]">timeline</span>
              </div>
              <p className="text-[11px] text-[#434655] truncate">+2h to +6h Multi-Hazard</p>
            </div>
          </button>

          {/* Step 3: EXPLAIN */}
          <button
            onClick={() => scrollToSection('xai-section')}
            className="flex items-center gap-2.5 p-2 rounded-lg bg-[#eff4ff] transition-all hover:bg-[#dce9ff] text-left border border-transparent hover:border-[#c3c6d7]"
            type="button"
          >
            <div className="w-8 h-8 rounded-lg bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center font-bold text-[13px]">
              03
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-[13px] font-bold text-[#0b1c30]">EXPLAIN</span>
                <span className="material-symbols-outlined text-[16px] text-[#434655]">psychology</span>
              </div>
              <p className="text-[11px] text-[#434655] truncate">SHAP & Spatiotemporal XAI</p>
            </div>
          </button>

          {/* Step 4: ALERT */}
          <button
            onClick={() => scrollToSection('alert-center-section')}
            className="flex items-center gap-2.5 p-2 rounded-lg bg-[#eff4ff] transition-all hover:bg-[#dce9ff] text-left border border-transparent hover:border-[#c3c6d7]"
            type="button"
          >
            <div className="w-8 h-8 rounded-lg bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center font-bold text-[13px]">
              04
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-[13px] font-bold text-[#0b1c30]">ALERT</span>
                <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">notification_important</span>
              </div>
              <p className="text-[11px] text-[#434655] truncate">Automated CAP & SDMA link</p>
            </div>
          </button>

          {/* Step 5: ACT */}
          <button
            onClick={() => scrollToSection('alert-center-section')}
            className="flex items-center gap-2.5 p-2 rounded-lg bg-[#eff4ff] transition-all hover:bg-[#dce9ff] text-left border border-transparent hover:border-[#c3c6d7]"
            type="button"
          >
            <div className="w-8 h-8 rounded-lg bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center font-bold text-[13px]">
              05
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-[13px] font-bold text-[#0b1c30]">ACT</span>
                <span className="material-symbols-outlined text-[16px] text-[#434655]">ev_station</span>
              </div>
              <p className="text-[11px] text-[#434655] truncate">Evacuation & Mobilization</p>
            </div>
          </button>
        </div>
      </section>

      {/* 2. TOP 5 HIGH-IMPACT RISK SUMMARY CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Regional Threat */}
        <div className="bg-white rounded-xl p-3 shadow-xs flex flex-col justify-between border border-[#c3c6d7]/40">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-caps text-[10px] uppercase text-[#434655]">Regional Threat</span>
              <span
                className={`px-1.5 py-0.5 font-data-mono text-[10px] font-bold rounded-full ${
                  currentProbabilities.riskCategory === 'CRITICAL' || currentProbabilities.riskCategory === 'SEVERE'
                    ? 'bg-[#ffdad6] text-[#ba1a1a]'
                    : 'bg-[#dbe1ff] text-[#004ac6]'
                }`}
              >
                {currentProbabilities.riskCategory} RISK
              </span>
            </div>
            <div className="font-telemetry-value text-[22px] text-[#0b1c30] font-bold tracking-tight">
              {currentProbabilities.riskCategory}
            </div>
            <p className="text-[12px] text-[#434655] mt-0.5 font-medium">{currentLocationData.name}</p>
            <div className="font-data-mono text-[11px] text-[#565e74] mt-1 truncate">
              {currentLocationData.subName}
            </div>
          </div>
          <div className="mt-2 pt-1 bg-[#eff4ff] rounded p-1.5 flex items-center justify-between">
            <span className="font-data-mono text-[11px] text-[#ba1a1a] font-semibold">
              Peak: {currentLocationData.peaks.storm}
            </span>
            <span className="font-data-mono text-[10px] text-[#434655]">+18% / 60m</span>
          </div>
        </div>

        {/* Card 2: Severe Thunderstorm */}
        <div
          onClick={() => setSelectedHazard('storm')}
          className={`bg-white rounded-xl p-3 shadow-xs flex flex-col justify-between border cursor-pointer transition-all ${
            selectedHazard === 'storm'
              ? 'border-[#004ac6] ring-1 ring-[#004ac6] bg-[#f8f9ff]'
              : 'border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-caps text-[10px] uppercase text-[#434655]">Thunderstorm</span>
              <span className="px-1.5 py-0.5 bg-[#ffdad6] text-[#ba1a1a] font-data-mono text-[10px] font-bold rounded-full">
                {currentProbabilities.storm >= 70 ? 'SEVERE' : 'HIGH'}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-telemetry-value text-[24px] text-[#0b1c30] font-bold">
                {currentProbabilities.storm}
              </span>
              <span className="font-data-mono text-[12px] text-[#434655] font-medium">% PROB</span>
            </div>
            <div className="w-full bg-[#dce9ff] rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-[#ba1a1a] h-1.5 rounded-full" style={{ width: `${currentProbabilities.storm}%` }}></div>
            </div>
            <div className="text-[11px] text-[#434655] mt-1">Convective Cell &gt; 55 dBZ</div>
          </div>
          <div className="mt-2 pt-1 bg-[#eff4ff] rounded p-1.5 flex items-center justify-between">
            <span className="font-data-mono text-[11px] text-[#0b1c30]">Peak Window</span>
            <span className="font-data-mono text-[11px] text-[#004ac6] font-bold">
              {currentLocationData.peaks.storm}
            </span>
          </div>
        </div>

        {/* Card 3: Cloudburst */}
        <div
          onClick={() => setSelectedHazard('cloudburst')}
          className={`bg-white rounded-xl p-3 shadow-xs flex flex-col justify-between border cursor-pointer transition-all ${
            selectedHazard === 'cloudburst'
              ? 'border-[#ba1a1a] ring-1 ring-[#ba1a1a] bg-[#f8f9ff]'
              : 'border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-caps text-[10px] uppercase text-[#434655]">Cloudburst</span>
              <span className="px-1.5 py-0.5 bg-[#ba1a1a] text-white font-data-mono text-[10px] font-bold rounded-full">
                HIGH RISK
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-telemetry-value text-[24px] text-[#0b1c30] font-bold">
                {currentProbabilities.cloudburst}
              </span>
              <span className="font-data-mono text-[12px] text-[#434655] font-medium">% PROB</span>
            </div>
            <div className="w-full bg-[#dce9ff] rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-[#ba1a1a] h-1.5 rounded-full"
                style={{ width: `${currentProbabilities.cloudburst}%` }}
              ></div>
            </div>
            <div className="text-[11px] text-[#434655] mt-1">&gt;100mm/hr risk zone flagged</div>
          </div>
          <div className="mt-2 pt-1 bg-[#eff4ff] rounded p-1.5 flex items-center justify-between">
            <span className="font-data-mono text-[11px] text-[#0b1c30]">Peak Window</span>
            <span className="font-data-mono text-[11px] text-[#ba1a1a] font-bold">
              {currentLocationData.peaks.cloudburst}
            </span>
          </div>
        </div>

        {/* Card 4: Flash Flood */}
        <div
          onClick={() => setSelectedHazard('flashflood')}
          className={`bg-white rounded-xl p-3 shadow-xs flex flex-col justify-between border cursor-pointer transition-all ${
            selectedHazard === 'flashflood'
              ? 'border-[#2563eb] ring-1 ring-[#2563eb] bg-[#f8f9ff]'
              : 'border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-caps text-[10px] uppercase text-[#434655]">Flash Flood</span>
              <span className="px-1.5 py-0.5 bg-[#dae2fd] text-[#131b2e] font-data-mono text-[10px] font-bold rounded-full">
                ELEVATED
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-telemetry-value text-[24px] text-[#0b1c30] font-bold">
                {currentProbabilities.flashFlood}
              </span>
              <span className="font-data-mono text-[12px] text-[#434655] font-medium">% PROB</span>
            </div>
            <div className="w-full bg-[#dce9ff] rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-[#2563eb] h-1.5 rounded-full"
                style={{ width: `${currentProbabilities.flashFlood}%` }}
              ></div>
            </div>
            <div className="text-[11px] text-[#434655] mt-1">{currentLocationData.terrain.activeRiverBasin}</div>
          </div>
          <div className="mt-2 pt-1 bg-[#eff4ff] rounded p-1.5 flex items-center justify-between">
            <span className="font-data-mono text-[11px] text-[#0b1c30]">Peak Window</span>
            <span className="font-data-mono text-[11px] text-[#004ac6] font-bold">
              {currentLocationData.peaks.flashFlood}
            </span>
          </div>
        </div>

        {/* Card 5: Pipeline Status */}
        <div className="bg-white rounded-xl p-3 shadow-xs flex flex-col justify-between border border-[#c3c6d7]/40">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-caps text-[10px] uppercase text-[#434655]">Data Pipeline</span>
              <span className="px-1.5 py-0.5 bg-[#85f8c4] text-[#002114] font-data-mono text-[10px] font-bold rounded-full">
                HEALTHY
              </span>
            </div>
            <div className="font-headline-sm text-[16px] text-[#0b1c30] font-bold">5/5 INGESTING</div>
            <div className="font-data-mono text-[11px] text-[#434655] mt-1">INSAT-3D • IMDAA • QPE</div>
            <div className="font-data-mono text-[11px] text-[#434655]">DEM • CWC Discharge</div>
          </div>
          <div className="mt-2 pt-1 bg-[#eff4ff] rounded p-1.5 flex items-center justify-between">
            <span className="font-data-mono text-[11px] text-[#0b1c30]">Latency: 4.2m</span>
            <span className="font-data-mono text-[11px] text-[#006243] font-bold">99.4% Calib</span>
          </div>
        </div>
      </section>

      {/* 3. CENTRAL HERO: LARGE WEATHER RISK GIS MAP (65%) + LOCATION INTELLIGENCE (35%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: GIS Map Centerpiece (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col">
          <GisMap />
        </div>

        {/* Right: Location Intelligence Panel (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          {/* Location Header Card */}
          <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
                  Location Intelligence
                </span>
                <div className="font-headline-sm text-[16px] font-bold text-[#0b1c30] mt-0.5">
                  {currentLocationData.name}
                </div>
                <div className="font-data-mono text-[11px] text-[#434655] mt-0.5">
                  {currentLocationData.lat.toFixed(4)}° N, {currentLocationData.lng.toFixed(4)}° E • Elev:{' '}
                  {currentLocationData.elevation}m
                </div>
              </div>
              <span
                className={`px-2 py-0.5 font-data-mono text-[11px] font-bold rounded ${
                  currentProbabilities.riskCategory === 'CRITICAL' || currentProbabilities.riskCategory === 'SEVERE'
                    ? 'bg-[#ba1a1a] text-white'
                    : 'bg-[#004ac6] text-white'
                }`}
              >
                {currentProbabilities.riskCategory}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 mt-2.5 pt-1.5 bg-[#eff4ff] p-2 rounded-lg">
              <div>
                <span className="font-label-caps text-[10px] text-[#434655] uppercase">Exposed Area</span>
                <div className="font-telemetry-value text-[16px] text-[#0b1c30] font-bold">
                  {currentLocationData.exposedAreaKm2} km²
                </div>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-[#434655] uppercase">Pop. Exposed</span>
                <div className="font-telemetry-value text-[16px] text-[#0b1c30] font-bold">
                  ~{currentLocationData.populationExposed.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Hazard Probabilities in this Location */}
            <div className="mt-2.5 space-y-2">
              <div>
                <div className="flex items-center justify-between font-data-mono text-[11px] mb-0.5">
                  <span className="text-[#0b1c30] font-medium">Severe Thunderstorm</span>
                  <span className="text-[#ba1a1a] font-bold">{currentProbabilities.storm}%</span>
                </div>
                <div className="w-full bg-[#e5eeff] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#ba1a1a] h-1.5 rounded-full" style={{ width: `${currentProbabilities.storm}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between font-data-mono text-[11px] mb-0.5">
                  <span className="text-[#0b1c30] font-medium">Cloudburst (&gt;100mm/h)</span>
                  <span className="text-[#ba1a1a] font-bold">{currentProbabilities.cloudburst}%</span>
                </div>
                <div className="w-full bg-[#e5eeff] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#ba1a1a] h-1.5 rounded-full"
                    style={{ width: `${currentProbabilities.cloudburst}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between font-data-mono text-[11px] mb-0.5">
                  <span className="text-[#0b1c30] font-medium">Flash Flood Runoff</span>
                  <span className="text-[#004ac6] font-bold">{currentProbabilities.flashFlood}%</span>
                </div>
                <div className="w-full bg-[#e5eeff] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#004ac6] h-1.5 rounded-full"
                    style={{ width: `${currentProbabilities.flashFlood}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Atmospheric Signature Card */}
          <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
                Atmospheric Signature
              </span>
              <span className="font-data-mono text-[10px] text-[#004ac6] font-bold">INSAT / SOUNDER</span>
            </div>
            <div className="space-y-1.5 font-data-mono text-[11px]">
              <div className="flex items-center justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Integrated Water Vapor (IWV)</span>
                <span className="font-bold text-[#0b1c30]">
                  {currentLocationData.atmospheric.iwv} kg/m²{' '}
                  <span className="text-[#ba1a1a] text-[10px]">({currentLocationData.atmospheric.iwvTrend})</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">CAPE / CIN</span>
                <span className="font-bold text-[#0b1c30]">
                  {currentLocationData.atmospheric.cape} J/kg / {currentLocationData.atmospheric.cin}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Cloud Top Temp (CTT)</span>
                <span className="font-bold text-[#ba1a1a]">
                  {currentLocationData.atmospheric.ctt}°C ({currentLocationData.atmospheric.cttTrend})
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Rainfall Rate (QPE Peak)</span>
                <span className="font-bold text-[#0b1c30]">
                  {currentLocationData.atmospheric.rainfallRate} → {currentLocationData.atmospheric.rainfallRatePeak} mm/hr
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Deep Wind Shear</span>
                <span className="font-bold text-[#0b1c30]">
                  {currentLocationData.atmospheric.windShear} m/s (0–6 km)
                </span>
              </div>
            </div>
          </div>

          {/* Terrain Response Factors Card */}
          <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
                Terrain Response (CartoDEM)
              </span>
              <span className="font-data-mono text-[10px] text-[#006243] font-bold">SLOPE / HYDRO</span>
            </div>
            <div className="space-y-1.5 font-data-mono text-[11px]">
              <div className="flex items-center justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Mean Orographic Slope</span>
                <span className="font-bold text-[#0b1c30]">
                  {currentLocationData.terrain.meanSlope}° ({currentLocationData.terrain.slopeDescription})
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Flow Accumulation Index</span>
                <span className="font-bold text-[#ba1a1a]">
                  {currentLocationData.terrain.flowAccumulation}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Soil Saturation (API)</span>
                <span className="font-bold text-[#004ac6]">
                  {currentLocationData.terrain.soilSaturationApi}% Saturation
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Drainage Proximity</span>
                <span className="font-bold text-[#0b1c30]">
                  &lt; {currentLocationData.terrain.drainageProximityMeters}m to Active Bed
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HORIZONTAL FORECAST TIMELINE (+2H TO +6H DYNAMICS) */}
      <section id="forecast-timeline-section" className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
                Temporal Evolution
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
              <span className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
                Multi-Hazard Nowcasting Sequence
              </span>
            </div>
            <p className="text-[12px] text-[#434655]">
              Model prediction progression across {currentLocationData.name} interface
            </p>
          </div>

          <div className="flex items-center gap-2 font-data-mono text-[12px]">
            <span className="px-2 py-1 bg-[#eff4ff] text-[#0b1c30] rounded font-medium">
              UTC Clock: 14:32 (Live)
            </span>
            <button
              onClick={() => setActiveView('forecast-timeline')}
              className="px-2.5 py-1 bg-[#004ac6] text-white rounded font-semibold flex items-center gap-1.5 text-[11px] hover:bg-[#003ea8] transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">fast_forward</span>
              <span>Scrub Full Timeline</span>
            </button>
          </div>
        </div>

        {/* Sequence Horizon Cards */}
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
                    ? 'bg-[#ffdad6]/40 border-[#ba1a1a]/30 hover:border-[#ba1a1a]'
                    : 'bg-[#eff4ff] border-transparent hover:border-[#c3c6d7]'
                }`}
                type="button"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-data-mono text-[11px] font-bold text-[#0b1c30]">
                      {f.label}
                    </span>
                    <span
                      className={`px-1 py-0.5 font-data-mono text-[9px] rounded font-bold ${
                        f.isPeakStorm || f.isPeakCloudburst
                          ? 'bg-[#ba1a1a] text-white'
                          : f.isPeakFlood
                          ? 'bg-[#004ac6] text-white'
                          : 'bg-[#dae2fd] text-[#00174b]'
                      }`}
                    >
                      {f.statusTag}
                    </span>
                  </div>

                  <div className="space-y-0.5 font-data-mono text-[11px] my-1">
                    <div className="flex justify-between">
                      <span className="text-[#434655]">Thunderstorm:</span>
                      <span className={f.stormProb >= 70 ? 'text-[#ba1a1a] font-bold' : 'font-bold'}>
                        {f.stormProb}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#434655]">Cloudburst:</span>
                      <span className={f.cloudburstProb >= 70 ? 'text-[#ba1a1a] font-bold' : 'font-bold'}>
                        {f.cloudburstProb}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#434655]">Flash Flood:</span>
                      <span className={f.flashFloodProb >= 70 ? 'text-[#004ac6] font-bold' : 'font-bold'}>
                        {f.flashFloodProb}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-1 pt-1 border-t border-[#c3c6d7]/30 text-[10px] text-[#434655] leading-tight">
                  {f.notes}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Forecast Evolution Probability Curve */}
        <ForecastChart />
      </section>

      {/* 5. WHY MEGHNETRA IS WARNING (XAI / MODEL EXPLAINABILITY) */}
      <section id="xai-section" className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
                Explainable AI (XAI)
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
              <span className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
                Why MEGHNETRA is Warning
              </span>
            </div>
            <p className="text-[12px] text-[#434655]">
              Spatiotemporal attention weights and Shapley feature attribution for {currentLocationData.name} ({selectedHazard.toUpperCase()})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-data-mono text-[11px] text-[#434655]">Calibration Congruence:</span>
            <span className="px-2 py-0.5 bg-[#85f8c4] text-[#002114] font-data-mono text-[11px] font-bold rounded">
              87% HIGH CONFIDENCE
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Dynamic Feature Attribution Breakdown (7 Cols) */}
          <div className="lg:col-span-7 space-y-2.5">
            {currentXaiFeatures.map((feat) => {
              const isHeavy = feat.attributionPct >= 20;
              return (
                <div key={feat.id}>
                  <div className="flex justify-between font-data-mono text-[11px] mb-0.5">
                    <span className="text-[#0b1c30] font-semibold">{feat.name}</span>
                    <span className={isHeavy ? 'text-[#ba1a1a] font-bold' : 'text-[#004ac6] font-bold'}>
                      +{feat.attributionPct}% Attribution
                    </span>
                  </div>
                  <div className="w-full bg-[#dce9ff] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${isHeavy ? 'bg-[#ba1a1a]' : 'bg-[#004ac6]'}`}
                      style={{ width: `${feat.attributionPct * 2}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Plain-English Meteorological Synthesis (5 Cols) */}
          <div className="lg:col-span-5 bg-[#eff4ff] rounded-lg p-3 flex flex-col justify-between border border-[#c3c6d7]/40">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[#004ac6] text-[20px]">psychology_alt</span>
                <span className="font-headline-sm text-[13px] font-bold text-[#0b1c30]">
                  Meteorological Synthesis ({selectedHazard.toUpperCase()})
                </span>
              </div>
              <blockquote className="text-[13px] text-[#0b1c30] leading-relaxed italic">
                "{currentSynthesis}"
              </blockquote>
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-[#c3c6d7]/40 flex items-center justify-between font-data-mono text-[11px]">
              <span className="text-[#434655]">Validated by ConvLSTM-GNN Engine</span>
              <span className="text-[#004ac6] font-bold">TEAM VIRAJ Core</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ALERT CENTER (EMERGENCY MANAGEMENT ACTION HUB) */}
      <section id="alert-center-section" className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#ba1a1a] font-bold">Alert Center</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <span className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              Active Emergency Directives
            </span>
          </div>

          <div className="font-data-mono text-[11px] text-[#ba1a1a] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping"></span>
            <span>{alerts.filter((a) => !a.isAcknowledged).length} ACTIVE BROADCAST DIRECTIVES</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {alerts.map((alert) => {
            const isRed = alert.level === 'RED ADVISORY';
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-xl shadow-xs p-3.5 flex flex-col justify-between border-l-4 ${
                  isRed ? 'border-l-[#ba1a1a] border-t border-r border-b border-[#c3c6d7]/40' : 'border-l-[#004ac6] border-t border-r border-b border-[#c3c6d7]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 font-data-mono text-[10px] font-bold rounded ${
                          isRed ? 'bg-[#ba1a1a] text-white' : 'bg-[#004ac6] text-white'
                        }`}
                      >
                        {alert.level}
                      </span>
                      <span className={`font-data-mono text-[11px] font-bold ${isRed ? 'text-[#ba1a1a]' : 'text-[#004ac6]'}`}>
                        {alert.title}
                      </span>
                    </div>
                    <span className="font-data-mono text-[11px] text-[#434655]">Lead Time: {alert.leadTime}</span>
                  </div>

                  <div className="font-headline-sm text-[15px] font-bold text-[#0b1c30]">
                    {alert.locationName}
                  </div>
                  <div className="font-data-mono text-[11px] text-[#434655] mt-0.5">
                    Impact Area: {alert.affectedArea} • Prob: {alert.probability}% • Pop: {alert.affectedPop}
                  </div>

                  <p className="text-[12px] text-[#0b1c30] mt-2 bg-[#eff4ff] p-2 rounded leading-snug">
                    <strong>Recommended Action:</strong> {alert.recommendedAction}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-[#c3c6d7]/30">
                  <button
                    onClick={() => viewAlertOnMap(alert)}
                    className="px-2.5 py-1.5 bg-[#eff4ff] text-[#004ac6] hover:bg-[#dce9ff] rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">map</span>
                    <span>View on Map</span>
                  </button>

                  <button
                    onClick={() => openReportModal()}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-white transition-colors flex items-center gap-1 ${
                      isRed ? 'bg-[#ba1a1a] hover:bg-[#991b1b]' : 'bg-[#004ac6] hover:bg-[#003ea8]'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">campaign</span>
                    <span>Broadcast CAP</span>
                  </button>

                  <button
                    onClick={() => {
                      acknowledgeAlert(alert.id);
                      console.log(
                        `Dispatch directive sent: SDRF Unit 1 alerted for ${alert.locationName}.`
                      );
                    }}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                      alert.isAcknowledged
                        ? 'bg-[#85f8c4]/40 text-[#002114] border border-[#85f8c4]'
                        : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {alert.isAcknowledged ? 'check_circle' : 'local_police'}
                    </span>
                    <span>{alert.isAcknowledged ? 'Acknowledged' : 'Dispatch SDRF Unit'}</span>
                  </button>

                  <button
                    onClick={() => openShareModal()}
                    className="px-2 py-1.5 bg-white border border-[#c3c6d7] text-[#434655] hover:bg-[#eff4ff] rounded text-[11px] font-medium transition-colors ml-auto"
                    type="button"
                  >
                    Share SMS
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. DATA INGESTION, MODEL INTELLIGENCE & OFFICIAL INCIDENT REPORT GENERATOR */}
      <section id="data-ingestion-section" className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Col 1: DATA INGESTION FEEDS */}
        <div className="bg-white rounded-xl shadow-xs p-3.5 flex flex-col justify-between border border-[#c3c6d7]/40">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
                Data Ingestion Feeds
              </span>
              <span className="font-data-mono text-[10px] text-[#006243] font-bold">5 OF 5 ACTIVE</span>
            </div>

            <div className="space-y-1.5 font-data-mono text-[11px]">
              {dataFeeds.map((feed) => (
                <div
                  key={feed.id}
                  className="p-1.5 bg-[#eff4ff] rounded flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#006243]"></span>
                    <span className="font-bold text-[#0b1c30]">{feed.name}</span>
                  </div>
                  <span className="text-[#434655] text-[10px]">
                    {feed.lastUpdate} • {feed.latency}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-[#c3c6d7]/30 flex items-center justify-between font-data-mono text-[11px] text-[#434655]">
            <span>Total Bandwidth: 48.2 MB/s</span>
            <span className="text-[#006243] font-bold">ALL SYNCHRONIZED</span>
          </div>
        </div>

        {/* Col 2: MODEL INTELLIGENCE SPECIFICATION */}
        <div className="bg-white rounded-xl shadow-xs p-3.5 flex flex-col justify-between border border-[#c3c6d7]/40">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
                Model Architecture
              </span>
              <span className="px-1.5 py-0.5 bg-[#dbe1ff] text-[#00174b] font-data-mono text-[10px] font-bold rounded">
                TEAM VIRAJ
              </span>
            </div>

            <div className="font-headline-sm text-[14px] font-bold text-[#0b1c30] mt-1">
              MEGHNETRA Spatiotemporal Model
            </div>
            <p className="text-[11px] text-[#434655] mt-0.5">
              <strong>Current Prototype:</strong> CNN / ConvLSTM Baseline on 1.2km spatial grid with topographical feature bias
            </p>

            <div className="space-y-1 mt-2 font-data-mono text-[11px]">
              <div className="flex justify-between py-0.5 bg-[#eff4ff] px-1.5 rounded">
                <span className="text-[#434655]">Prototype Status:</span>
                <span className="font-bold text-[#0b1c30]">v1.0 Demonstration Prototype</span>
              </div>
              <div className="flex justify-between py-0.5 bg-[#eff4ff] px-1.5 rounded">
                <span className="text-[#434655]">Forecast Horizon:</span>
                <span className="font-bold text-[#0b1c30]">+2h to +6h Rapid Nowcast</span>
              </div>
              <div className="flex justify-between py-0.5 bg-[#eff4ff] px-1.5 rounded">
                <span className="text-[#434655]">Planned Target:</span>
                <span className="font-bold text-[#004ac6]">Vision-Transformer + GNN</span>
              </div>
              <div className="flex justify-between py-0.5 bg-[#eff4ff] px-1.5 rounded">
                <span className="text-[#434655]">Target Hazard Classes:</span>
                <span className="font-bold text-[#0b1c30]">Storm / Cloudburst / Flood</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-[#c3c6d7]/30 flex items-center justify-between font-data-mono text-[11px]">
            <span className="text-[#434655]">Confidence Reliability:</span>
            <span className="text-[#004ac6] font-bold">87% Multi-Congruence</span>
          </div>
        </div>

        {/* Col 3: INCIDENT REPORT DISPATCH */}
        <div className="bg-white rounded-xl shadow-xs p-3.5 flex flex-col justify-between border border-[#c3c6d7]/40">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
                Official Incident Dispatch
              </span>
              <span className="font-data-mono text-[11px] font-bold text-[#004ac6]">
                MN-2024-UT-0842
              </span>
            </div>

            <div className="font-headline-sm text-[14px] font-bold text-[#0b1c30] mt-1">
              {currentLocationData.name} Warning Dispatch
            </div>
            <div className="font-data-mono text-[11px] text-[#434655] mt-0.5">
              Window: 17:30 - 20:30 UTC • Created: Today, 14:32 UTC
            </div>

            <p className="text-[11px] text-[#434655] mt-2 bg-[#eff4ff] p-2 rounded leading-snug">
              Automated NDMA / SDMA standardized bulletin generated with embedded radar velocity vectors, SHAP attribution summaries, and prioritized evacuation sectors.
            </p>
          </div>

          <div className="space-y-1.5 mt-2.5 pt-1.5 border-t border-[#c3c6d7]/30">
            <button
              onClick={() => openReportModal()}
              className="w-full px-3 py-1.5 bg-[#004ac6] text-white rounded font-headline-sm text-[12px] font-semibold hover:bg-[#003ea8] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              <span>Generate Official Report</span>
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => openExportModal('Official Incident Dispatch Bulletin')}
                className="px-2 py-1 bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] rounded font-data-mono text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 border border-[#c3c6d7]/40"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                <span>Export NDMA PDF</span>
              </button>

              <button
                onClick={() => openShareModal()}
                className="px-2 py-1 bg-[#eff4ff] text-[#004ac6] hover:bg-[#dce9ff] rounded font-data-mono text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 border border-[#c3c6d7]/40"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">share</span>
                <span>Share SDMA / NDRF</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
