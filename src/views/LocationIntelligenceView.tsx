import React from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { LOCATIONS } from '../data/mockData';
import { LocationId } from '../types';

export const LocationIntelligenceView: React.FC = () => {
  const { selectedLocation, setSelectedLocation, currentLocationData, currentProbabilities } =
    useMeghnetra();

  return (
    <div className="flex flex-col w-full space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold">
              Topographic Spatial Database
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
              Location Intelligence & Orographic Vulnerability
            </h2>
          </div>
          <p className="text-[12px] text-[#434655]">
            CartoDEM digital elevation models, hydrologic flow accumulation, and population exposure across 6 monitoring stations
          </p>
        </div>

        <div className="font-data-mono text-[11px] text-[#434655]">
          6 Stations Synchronized across Uttarakhand
        </div>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.values(LOCATIONS).map((loc) => {
          const isSelected = loc.id === selectedLocation;
          return (
            <div
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id as LocationId)}
              className={`bg-white rounded-xl shadow-xs p-4 border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-[#004ac6] ring-2 ring-[#004ac6] bg-[#f8f9ff]'
                  : 'border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
                      {loc.name}
                    </h3>
                    <div className="font-data-mono text-[11px] text-[#434655]">
                      {loc.lat.toFixed(4)}°N, {loc.lng.toFixed(4)}°E • Elev: {loc.elevation}m
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 font-data-mono text-[10px] font-bold rounded ${
                      loc.riskCategory === 'CRITICAL' || loc.riskCategory === 'SEVERE'
                        ? 'bg-[#ba1a1a] text-white'
                        : 'bg-[#004ac6] text-white'
                    }`}
                  >
                    {loc.riskCategory}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 my-3 p-2 bg-[#eff4ff] rounded-lg font-data-mono text-[11px]">
                  <div>
                    <span className="text-[#434655] text-[10px] uppercase">Exposed Area</span>
                    <div className="font-bold text-[#0b1c30]">{loc.exposedAreaKm2} km²</div>
                  </div>
                  <div>
                    <span className="text-[#434655] text-[10px] uppercase">Exposed Pop</span>
                    <div className="font-bold text-[#0b1c30]">~{loc.populationExposed.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[#434655] text-[10px] uppercase">Mean Slope</span>
                    <div className="font-bold text-[#0b1c30]">{loc.terrain.meanSlope}°</div>
                  </div>
                  <div>
                    <span className="text-[#434655] text-[10px] uppercase">Soil Saturation</span>
                    <div className="font-bold text-[#004ac6]">{loc.terrain.soilSaturationApi}%</div>
                  </div>
                </div>

                {/* Hazard percentages */}
                <div className="space-y-1 font-data-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#434655]">Severe Storm:</span>
                    <span className="font-bold text-[#ba1a1a]">{loc.hazards.storm}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#434655]">Cloudburst:</span>
                    <span className="font-bold text-[#ba1a1a]">{loc.hazards.cloudburst}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#434655]">Flash Flood:</span>
                    <span className="font-bold text-[#004ac6]">{loc.hazards.flashFlood}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 mt-3 border-t border-[#c3c6d7]/30 text-[11px] text-[#434655]">
                <strong>Drainage Corridor:</strong> {loc.terrain.activeRiverBasin} (&lt;{' '}
                {loc.terrain.drainageProximityMeters}m to stream)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
