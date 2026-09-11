import React, { useState } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { GisMap } from '../components/GisMap';
import { LOCATIONS } from '../data/mockData';
import { LocationId, MapLayerType } from '../types';

export const LiveGisMapView: React.FC = () => {
  const {
    selectedLocation,
    setSelectedLocation,
    mapLayer,
    setMapLayer,
    selectedHazard,
    setSelectedHazard,
    selectedForecastHour,
    setSelectedForecastHour,
    currentLocationData,
    currentProbabilities,
  } = useMeghnetra();

  const [layerOpacity, setLayerOpacity] = useState<number>(85);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showRiverDrainage, setShowRiverDrainage] = useState<boolean>(true);

  return (
    <div className="flex flex-col w-full space-y-3 pb-8">
      {/* Top Header Bar */}
      <div className="bg-white rounded-xl shadow-xs p-3 flex flex-wrap items-center justify-between gap-3 border border-[#c3c6d7]/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
              Spatial Intelligence Console
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              Live GIS Multi-Hazard Map Workstation
            </h2>
          </div>
          <p className="text-[12px] text-[#434655]">
            High-resolution spatial modeling over Uttarakhand Himalayan Foothills (1.2 km grid)
          </p>
        </div>

        <div className="flex items-center gap-2 font-data-mono text-[11px]">
          <span className="px-2.5 py-1 bg-[#eff4ff] text-[#004ac6] rounded font-semibold border border-[#c3c6d7]/40">
            Selected: {currentLocationData.name.split('&')[0].trim()}
          </span>
          <span className="px-2.5 py-1 bg-[#85f8c4]/30 text-[#002114] rounded font-bold border border-[#85f8c4]">
            GIS Engine: Active
          </span>
        </div>
      </div>

      {/* GIS Workstation Layout: 3-column split on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Layer & Filter Controls (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Station Selection */}
          <div className="bg-white rounded-xl shadow-xs p-3 border border-[#c3c6d7]/40">
            <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold mb-2">
              Select Observation Zone
            </div>
            <div className="space-y-1">
              {Object.values(LOCATIONS).map((loc) => {
                const isSelected = loc.id === selectedLocation;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc.id as LocationId)}
                    className={`w-full p-2 rounded text-left transition-colors flex items-center justify-between text-[12px] ${
                      isSelected
                        ? 'bg-[#dbe1ff] text-[#004ac6] font-semibold'
                        : 'hover:bg-[#eff4ff] text-[#0b1c30]'
                    }`}
                    type="button"
                  >
                    <span>{loc.name.split('&')[0].trim()}</span>
                    <span className="font-mono text-[10px] text-[#ba1a1a] font-bold">
                      {loc.hazards.storm}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layer Customization & Opacity */}
          <div className="bg-white rounded-xl shadow-xs p-3 border border-[#c3c6d7]/40 space-y-2.5">
            <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
              Layer Stack & Appearance
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-data-mono mb-1">
                <span className="text-[#434655]">Hazard Layer Opacity</span>
                <span className="font-bold text-[#0b1c30]">{layerOpacity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={layerOpacity}
                onChange={(e) => setLayerOpacity(Number(e.target.value))}
                className="w-full h-1.5 bg-[#dce9ff] rounded-lg appearance-none cursor-pointer accent-[#004ac6]"
              />
            </div>

            <div className="pt-2 border-t border-[#c3c6d7]/40 space-y-1.5 font-data-mono text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showContours}
                  onChange={(e) => setShowContours(e.target.checked)}
                  className="rounded text-[#004ac6] focus:ring-0"
                />
                <span>CartoDEM 10m Contours</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRiverDrainage}
                  onChange={(e) => setShowRiverDrainage(e.target.checked)}
                  className="rounded text-[#004ac6] focus:ring-0"
                />
                <span>Hydrological River Mesh</span>
              </label>
            </div>
          </div>

          {/* Quick Hazard Selector */}
          <div className="bg-white rounded-xl shadow-xs p-3 border border-[#c3c6d7]/40 space-y-1.5">
            <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
              Primary Hazard Vector
            </div>
            <div className="grid grid-cols-1 gap-1 font-data-mono text-[11px]">
              <button
                onClick={() => {
                  setSelectedHazard('storm');
                  setMapLayer('storm');
                }}
                className={`p-2 rounded text-left flex items-center justify-between ${
                  selectedHazard === 'storm'
                    ? 'bg-[#ffdad6] text-[#ba1a1a] font-bold border border-[#ba1a1a]'
                    : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]'
                }`}
                type="button"
              >
                <span>Severe Storm Core</span>
                <span>{currentProbabilities.storm}%</span>
              </button>

              <button
                onClick={() => {
                  setSelectedHazard('cloudburst');
                  setMapLayer('cloudburst');
                }}
                className={`p-2 rounded text-left flex items-center justify-between ${
                  selectedHazard === 'cloudburst'
                    ? 'bg-[#ffdad6] text-[#ba1a1a] font-bold border border-[#ba1a1a]'
                    : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]'
                }`}
                type="button"
              >
                <span>Cloudburst Plume</span>
                <span>{currentProbabilities.cloudburst}%</span>
              </button>

              <button
                onClick={() => {
                  setSelectedHazard('flashflood');
                  setMapLayer('flashflood');
                }}
                className={`p-2 rounded text-left flex items-center justify-between ${
                  selectedHazard === 'flashflood'
                    ? 'bg-[#dbe1ff] text-[#004ac6] font-bold border border-[#004ac6]'
                    : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]'
                }`}
                type="button"
              >
                <span>Flash Flood Corridor</span>
                <span>{currentProbabilities.flashFlood}%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center: Large GIS Map (6 cols) */}
        <div className="lg:col-span-6">
          <GisMap heightClass="h-[560px]" isExpanded />
        </div>

        {/* Right: Station Analysis & Terrain Drivers (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white rounded-xl shadow-xs p-3 border border-[#c3c6d7]/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
                Station Profile
              </span>
              <span className="px-1.5 py-0.5 bg-[#ba1a1a] text-white font-mono text-[10px] font-bold rounded">
                {currentProbabilities.riskCategory}
              </span>
            </div>

            <div className="font-headline-sm text-[15px] font-bold text-[#0b1c30]">
              {currentLocationData.name}
            </div>
            <div className="font-data-mono text-[11px] text-[#434655]">
              Coordinates: {currentLocationData.lat.toFixed(4)}°N, {currentLocationData.lng.toFixed(4)}°E
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#c3c6d7]/30 font-data-mono text-[11px]">
              <div className="flex justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Mean Slope:</span>
                <span className="font-bold text-[#0b1c30]">{currentLocationData.terrain.meanSlope}°</span>
              </div>
              <div className="flex justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Flow Accumulation:</span>
                <span className="font-bold text-[#ba1a1a]">{currentLocationData.terrain.flowAccumulation}</span>
              </div>
              <div className="flex justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Soil Saturation (API):</span>
                <span className="font-bold text-[#004ac6]">{currentLocationData.terrain.soilSaturationApi}%</span>
              </div>
              <div className="flex justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Drainage Proximity:</span>
                <span className="font-bold text-[#0b1c30]">&lt; {currentLocationData.terrain.drainageProximityMeters}m</span>
              </div>
              <div className="flex justify-between py-1 bg-[#eff4ff] px-2 rounded">
                <span className="text-[#434655]">Exposed Population:</span>
                <span className="font-bold text-[#0b1c30]">~{currentLocationData.populationExposed.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-xs p-3 border border-[#c3c6d7]/40 space-y-2">
            <div className="font-label-caps text-[10px] uppercase text-[#434655] font-bold">
              Active Warning Focus
            </div>
            <p className="text-[12px] text-[#0b1c30] leading-snug bg-[#eff4ff] p-2 rounded">
              High radar reflectivity core (&gt;55 dBZ) tracking across the foothill escarpment towards the Song river confluence.
            </p>
            <div className="font-data-mono text-[11px] text-[#004ac6] font-semibold">
              Peak Vulnerability: {currentLocationData.peaks.storm}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Forecast Timeline (+2h to +6h Nowcasting Scrubber) */}
      <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c3c6d7]/30 pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#004ac6] text-[18px]">timelapse</span>
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
              Forecast Horizon Scrubber (+2h to +6h Nowcast)
            </span>
          </div>
          <div className="text-[11px] font-data-mono text-[#434655]">
            Targeting: <strong className="text-[#0b1c30]">{currentLocationData.name}</strong> • Selected: <span className="text-[#ba1a1a] font-bold">{selectedForecastHour.toUpperCase()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 font-data-mono text-[11px]">
          {['now', '2h', '3h', '4h', '5h', '6h'].map((hourKey) => {
            const isSelected = selectedForecastHour === hourKey;
            return (
              <button
                key={hourKey}
                onClick={() => setSelectedForecastHour(hourKey as any)}
                type="button"
                className={`p-2 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'bg-[#004ac6] text-white border-[#004ac6] shadow-2xs font-bold'
                    : 'bg-[#eff4ff] text-[#0b1c30] border-[#c3c6d7]/40 hover:bg-[#dce9ff]'
                }`}
              >
                <div className="text-[12px] font-bold">{hourKey.toUpperCase()}</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {hourKey === 'now' ? 'Observation' : `+${hourKey.replace('h', '')} hr lead`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
