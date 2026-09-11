import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMeghnetra } from '../context/MeghnetraContext';
import { MapLayerType, LocationId, HazardType } from '../types';
import { LOCATIONS } from '../data/mockData';

interface GisMapProps {
  heightClass?: string;
  isExpanded?: boolean;
}

export const GisMap: React.FC<GisMapProps> = ({
  heightClass = 'h-[480px]',
  isExpanded = false,
}) => {
  const {
    selectedLocation,
    setSelectedLocation,
    mapLayer,
    setMapLayer,
    selectedHazard,
    setSelectedHazard,
    selectedForecastHour,
    currentProbabilities,
    currentLocationData,
    mapCenter,
    mapZoom,
  } = useMeghnetra();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [basemap, setBasemap] = useState<'light' | 'satellite' | 'topo'>('light');
  const [isPlayingSimulation, setIsPlayingSimulation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Basemap Tile Providers
  const tileProviders = {
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; Earthstar Geographics',
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenTopoMap contributors',
    },
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Tile Layer
    const tileLayer = L.tileLayer(tileProviders[basemap].url, {
      maxZoom: 18,
      attribution: tileProviders[basemap].attribution,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer groups
    const hazardGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    layerGroupRef.current = hazardGroup;
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(tileProviders[basemap].url);
  }, [basemap]);

  // Update Map Center when selectedLocation or mapCenter changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(mapCenter, mapZoom, { animate: true });
  }, [mapCenter, mapZoom]);

  // Render Hazard Overlays & Contours
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const group = layerGroupRef.current;
    group.clearLayers();

    // 1. Draw Simulated River Runoff Channels (Song, Ganga, Bindal)
    const songRiverCoords: [number, number][] = [
      [30.42, 78.14],
      [30.36, 78.11],
      [30.32, 78.08],
      [30.27, 78.13],
      [30.18, 78.22],
      [30.11, 78.27], // Confluence at Rishikesh
      [29.95, 78.17], // Haridwar
    ];

    const riverPath = L.polyline(songRiverCoords, {
      color: '#2563eb',
      weight: 3.5,
      opacity: 0.85,
      dashArray: mapLayer === 'flashflood' ? '8, 4' : undefined,
    }).bindTooltip('Song River Drainage Corridor', { sticky: true });
    group.addLayer(riverPath);

    // 2. Layer-specific Overlays
    if (mapLayer === 'overall' || mapLayer === 'storm') {
      // Severe Storm Convective Cell Circle / Polygon
      const stormPolygon: [number, number][] = [
        [30.38, 77.96],
        [30.42, 78.04],
        [30.37, 78.14],
        [30.27, 78.12],
        [30.25, 78.01],
      ];
      const stormLayer = L.polygon(stormPolygon, {
        color: '#ba1a1a',
        fillColor: '#ba1a1a',
        fillOpacity: 0.35,
        weight: 2,
      }).bindPopup(
        `<div class="p-1">
          <div class="font-bold text-[#ba1a1a] text-xs">DEHRADUN STORM CELL (>55 dBZ)</div>
          <div class="text-[11px] text-[#434655] mt-1">Convective cell moving SE at 22 km/h. High lightning discharge.</div>
          <div class="text-[10px] font-mono text-[#004ac6] mt-1">Probability: 82% • Peak: +4h</div>
        </div>`
      );
      group.addLayer(stormLayer);

      // Radar Intensity Radial Circle
      const stormCenter = L.circle([30.325, 78.05], {
        radius: 7500,
        color: '#ba1a1a',
        fillColor: '#ba1a1a',
        fillOpacity: 0.25,
        weight: 1.5,
      });
      group.addLayer(stormCenter);
    }

    if (mapLayer === 'overall' || mapLayer === 'cloudburst') {
      // Mussoorie Ridge Cloudburst Zone
      const cloudburstPolygon: [number, number][] = [
        [30.49, 78.02],
        [30.51, 78.10],
        [30.44, 78.12],
        [30.42, 78.03],
      ];
      const cloudburstLayer = L.polygon(cloudburstPolygon, {
        color: '#ba1a1a',
        fillColor: '#ba1a1a',
        fillOpacity: 0.45,
        weight: 2.5,
        dashArray: '4, 4',
      }).bindPopup(
        `<div class="p-1">
          <div class="font-bold text-[#ba1a1a] text-xs">MUSSOORIE ESCARPMENT CLOUDBURST</div>
          <div class="text-[11px] text-[#434655] mt-1">High convective rain-bomb risk > 100 mm/hr. Orographic forcing active.</div>
          <div class="text-[10px] font-mono text-[#ba1a1a] font-bold mt-1">Probability: 78% • Peak: +3h</div>
        </div>`
      );
      group.addLayer(cloudburstLayer);

      const highReliefCircle = L.circle([30.46, 78.064], {
        radius: 4800,
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.3,
        weight: 1,
      });
      group.addLayer(highReliefCircle);
    }

    if (mapLayer === 'overall' || mapLayer === 'flashflood') {
      // Song River Catchment Flash Flood Risk Corridor
      const floodCorridor: [number, number][] = [
        [30.38, 78.11],
        [30.35, 78.16],
        [30.29, 78.19],
        [30.22, 78.23],
        [30.13, 78.29],
        [30.12, 78.24],
        [30.24, 78.13],
        [30.33, 78.07],
      ];
      const floodLayer = L.polygon(floodCorridor, {
        color: '#004ac6',
        fillColor: '#2563eb',
        fillOpacity: 0.35,
        weight: 2,
      }).bindPopup(
        `<div class="p-1">
          <div class="font-bold text-[#004ac6] text-xs">SONG CATCHMENT RUNOFF CORRIDOR</div>
          <div class="text-[11px] text-[#434655] mt-1">Antecedent moisture 78% API. High discharge expected across Sahastradhara & Maldevta bridges.</div>
          <div class="text-[10px] font-mono text-[#004ac6] font-bold mt-1">Lead Time: +5h • Exposed Pop: ~184,000</div>
        </div>`
      );
      group.addLayer(floodLayer);
    }

    if (mapLayer === 'qpe') {
      // Quantitative Precipitation Estimation swath
      const qpeCircle1 = L.circle([30.35, 78.06], {
        radius: 12000,
        color: '#004ac6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        weight: 1,
      }).bindTooltip('QPE: 40-70 mm/hr', { sticky: true });
      const qpeCircle2 = L.circle([30.40, 78.08], {
        radius: 6000,
        color: '#ba1a1a',
        fillColor: '#ef4444',
        fillOpacity: 0.4,
        weight: 1.5,
      }).bindTooltip('QPE Core: >100 mm/hr', { sticky: true });
      group.addLayer(qpeCircle1);
      group.addLayer(qpeCircle2);
    }

    if (mapLayer === 'iwv') {
      // Integrated Water Vapor field
      const iwvLayer = L.circle([30.28, 78.10], {
        radius: 20000,
        color: '#006243',
        fillColor: '#10b981',
        fillOpacity: 0.25,
        weight: 1,
      }).bindTooltip('IWV Plume: 58.4 kg/m² (+18% 3h surge)', { sticky: true });
      group.addLayer(iwvLayer);
    }

    if (mapLayer === 'ctt') {
      // Cloud Top Temp cold core
      const cttLayer = L.circle([30.42, 78.06], {
        radius: 10000,
        color: '#7f1d1d',
        fillColor: '#991b1b',
        fillOpacity: 0.35,
        weight: 1.5,
      }).bindTooltip('CTT Cold Core: -76.2°C (Deep Convective Overshoot)', { sticky: true });
      group.addLayer(cttLayer);
    }

    if (mapLayer === 'dem') {
      // Digital Elevation Model slope contours
      const slopeContours: [number, number][][] = [
        [
          [30.40, 77.95],
          [30.45, 78.05],
          [30.48, 78.20],
        ],
        [
          [30.35, 77.95],
          [30.38, 78.08],
          [30.42, 78.25],
        ],
        [
          [30.25, 78.00],
          [30.30, 78.15],
          [30.35, 78.30],
        ],
      ];
      slopeContours.forEach((pts, i) => {
        const contourLine = L.polyline(pts, {
          color: '#737686',
          weight: 1.5,
          opacity: 0.6,
          dashArray: '4, 4',
        }).bindTooltip(`Orographic Contour ${(i + 1) * 500}m`, { sticky: true });
        group.addLayer(contourLine);
      });
    }
  }, [mapLayer]);

  // Render Station Location Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    const group = markersGroupRef.current;
    group.clearLayers();

    Object.values(LOCATIONS).forEach((loc) => {
      const isSelected = loc.id === selectedLocation;
      const isCritical = loc.riskCategory === 'CRITICAL' || loc.riskCategory === 'SEVERE';

      // Custom HTML Marker Icon
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            isCritical
              ? `<span class="w-7 h-7 rounded-full bg-red-500/30 animate-ping absolute"></span>`
              : ''
          }
          <div class="w-6 h-6 rounded-full flex items-center justify-center shadow-lg font-mono text-[10px] font-bold border-2 ${
            isSelected
              ? 'bg-[#ba1a1a] text-white border-white ring-2 ring-[#ba1a1a]'
              : isCritical
              ? 'bg-[#ba1a1a] text-white border-white'
              : 'bg-[#2563eb] text-white border-white'
          }">
            ${isCritical ? '!' : '•'}
          </div>
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-white text-[#0b1c30] rounded shadow-md whitespace-nowrap border border-[#c3c6d7] text-[10px] font-mono font-semibold pointer-events-none">
            ${loc.name.split('&')[0].trim()}
            <span class="${isCritical ? 'text-[#ba1a1a]' : 'text-[#004ac6]'} ml-1">
              (${loc.hazards.storm}%)
            </span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon });

      const popupContent = `
        <div style="min-width: 220px; font-family: Inter, sans-serif;">
          <div style="font-weight: 700; font-size: 13px; color: #0b1c30;">${loc.name}</div>
          <div style="font-size: 11px; color: #434655; margin-bottom: 6px;">${loc.lat.toFixed(4)}°N, ${loc.lng.toFixed(4)}°E • Elev: ${loc.elevation}m</div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; padding: 2px 4px; background: #f8f9ff; border-radius: 4px;">
            <span style="font-size: 11px; font-weight: 600;">Overall Risk:</span>
            <span style="font-size: 11px; font-weight: 700; color: ${isCritical ? '#ba1a1a' : '#004ac6'};">${loc.riskCategory} (${loc.overallRiskScore}%)</span>
          </div>
          
          <div style="font-size: 10px; font-family: 'JetBrains Mono', monospace; margin-top: 4px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Thunderstorm:</span> <strong>${loc.hazards.storm}%</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Cloudburst:</span> <strong>${loc.hazards.cloudburst}%</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Flash Flood:</span> <strong>${loc.hazards.flashFlood}%</strong>
            </div>
          </div>
          
          <div style="margin-top: 6px; font-size: 10px; color: #565e74; border-top: 1px solid #e5eeff; padding-top: 4px;">
            Primary Driver: Rapid IWV Surge + Escarpment Lift
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedLocation(loc.id);
      });

      group.addLayer(marker);
    });
  }, [selectedLocation]);

  // Zoom handlers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetCenter = () => {
    const loc = LOCATIONS[selectedLocation];
    if (loc && mapInstanceRef.current) {
      mapInstanceRef.current.setView([loc.lat, loc.lng], 11, { animate: true });
    }
  };

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!isFullscreen) {
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Layer buttons specification
  const layerButtons: { id: MapLayerType; label: string; hideOnMobile?: boolean }[] = [
    { id: 'overall', label: 'Overall Risk' },
    { id: 'storm', label: 'Severe Storm' },
    { id: 'cloudburst', label: 'Cloudburst' },
    { id: 'flashflood', label: 'Flash Flood' },
    { id: 'qpe', label: 'Rainfall QPE', hideOnMobile: true },
    { id: 'iwv', label: 'IWV', hideOnMobile: true },
    { id: 'ctt', label: 'CTT', hideOnMobile: true },
    { id: 'dem', label: 'DEM', hideOnMobile: true },
  ];

  return (
    <div id="gis-map-container" className="flex flex-col bg-white rounded-xl shadow-xs p-3 space-y-3">
      {/* Layer Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1 pb-1 bg-[#eff4ff] p-1.5 rounded-lg">
        <div className="flex flex-wrap items-center gap-1">
          {layerButtons.map((btn) => {
            const isActive = mapLayer === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => {
                  setMapLayer(btn.id);
                  if (btn.id === 'storm' || btn.id === 'cloudburst' || btn.id === 'flashflood') {
                    setSelectedHazard(btn.id);
                  }
                }}
                className={`px-2.5 py-1 rounded font-data-mono text-[11px] transition-colors ${
                  isActive
                    ? 'bg-[#004ac6] text-white font-semibold shadow-xs'
                    : 'bg-white text-[#0b1c30] hover:bg-[#e5eeff] font-medium'
                } ${btn.hideOnMobile ? 'hidden sm:inline-block' : ''}`}
                type="button"
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-data-mono text-[11px] text-[#434655] font-medium hidden sm:inline">
            GRID: 1.2km
          </span>
          <span className="px-1.5 py-0.5 bg-[#85f8c4]/30 text-[#002114] font-data-mono text-[10px] font-bold rounded">
            CALIBRATED
          </span>
        </div>
      </div>

      {/* Map Viewport */}
      <div className={`relative w-full ${heightClass} rounded-lg overflow-hidden border border-[#c3c6d7]/60 bg-[#e5eeff]`}>
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Map Controls (Top Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 bg-white/95 backdrop-blur-xs rounded-lg p-1 shadow-md z-20 border border-[#c3c6d7]/50">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#eff4ff] text-[#0b1c30] transition-colors"
            title="Zoom In"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#eff4ff] text-[#0b1c30] transition-colors"
            title="Zoom Out"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">remove</span>
          </button>
          <div className="h-px bg-[#dce9ff] mx-1"></div>
          <button
            onClick={handleResetCenter}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#eff4ff] text-[#0b1c30] transition-colors"
            title="Center on Selected Station"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">my_location</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#eff4ff] text-[#0b1c30] transition-colors"
            title="Toggle Fullscreen"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">fullscreen</span>
          </button>
        </div>

        {/* Floating Basemap Selector (Top Left) */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs rounded-lg shadow-md p-1 flex items-center gap-1 font-data-mono text-[11px] z-20 border border-[#c3c6d7]/50">
          <button
            onClick={() => setBasemap('light')}
            className={`px-2 py-1 rounded transition-colors ${
              basemap === 'light'
                ? 'bg-[#eff4ff] font-semibold text-[#004ac6]'
                : 'text-[#434655] hover:bg-[#eff4ff]'
            }`}
            type="button"
          >
            Light Topo
          </button>
          <button
            onClick={() => setBasemap('satellite')}
            className={`px-2 py-1 rounded transition-colors ${
              basemap === 'satellite'
                ? 'bg-[#eff4ff] font-semibold text-[#004ac6]'
                : 'text-[#434655] hover:bg-[#eff4ff]'
            }`}
            type="button"
          >
            Satellite Ortho
          </button>
          <button
            onClick={() => setBasemap('topo')}
            className={`px-2 py-1 rounded transition-colors ${
              basemap === 'topo'
                ? 'bg-[#eff4ff] font-semibold text-[#004ac6]'
                : 'text-[#434655] hover:bg-[#eff4ff]'
            }`}
            type="button"
          >
            Vector DEM
          </button>
        </div>

        {/* Floating GIS Hazard Ramp Legend (Bottom Left) */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs rounded-lg p-2 shadow-md z-20 border border-[#c3c6d7]/50">
          <div className="font-label-caps text-[10px] text-[#434655] uppercase font-bold mb-1">
            Hazard Intensity (dBZ / QPE)
          </div>
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <span className="w-6 h-2 rounded-2xs bg-[#006243]"></span>
              <span className="font-data-mono text-[9px] text-[#434655] mt-0.5">&lt;30</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-6 h-2 rounded-2xs bg-[#dae2fd]"></span>
              <span className="font-data-mono text-[9px] text-[#434655] mt-0.5">30-40</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-6 h-2 rounded-2xs bg-[#2563eb]"></span>
              <span className="font-data-mono text-[9px] text-[#434655] mt-0.5">40-50</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-6 h-2 rounded-2xs bg-[#ba1a1a]"></span>
              <span className="font-data-mono text-[9px] text-[#434655] mt-0.5">50-60</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-6 h-2 rounded-2xs bg-[#7f1d1d]"></span>
              <span className="font-data-mono text-[9px] text-[#434655] mt-0.5">&gt;60</span>
            </div>
          </div>
        </div>

        {/* Floating Scale Bar (Bottom Right) */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs rounded-lg px-2 py-1 shadow-xs font-data-mono text-[10px] text-[#434655] flex items-center gap-2 z-20 border border-[#c3c6d7]/50">
          <div className="w-12 h-1 bg-[#0b1c30]"></div>
          <span>10 km Scale</span>
        </div>
      </div>

      {/* Scrubber Timeline Controller on GIS */}
      <div className="bg-[#eff4ff] rounded-lg p-2 flex flex-wrap items-center justify-between gap-3 border border-[#c3c6d7]/40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlayingSimulation((prev) => !prev)}
            className="w-7 h-7 rounded bg-white flex items-center justify-center text-[#004ac6] shadow-2xs hover:bg-[#e5eeff] transition-colors"
            type="button"
            title={isPlayingSimulation ? 'Pause Time Animation' : 'Play Nowcasting Loop'}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isPlayingSimulation ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <span className="font-data-mono text-[12px] font-semibold text-[#0b1c30]">
            Nowcast Horizon:
          </span>
          <span className="font-data-mono text-[12px] text-[#004ac6] font-bold">
            +2h to +6h Simulation ({selectedForecastHour.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-2 font-data-mono text-[11px] text-[#434655]">
          <span>Active Layer:</span>
          <strong className="text-[#0b1c30] uppercase">{mapLayer} Mesh</strong>
          <span>•</span>
          <span className="text-[#006243] font-semibold">1.2km Cell Resolution</span>
        </div>
      </div>
    </div>
  );
};
