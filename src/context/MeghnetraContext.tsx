import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  ViewType,
  LocationId,
  HazardType,
  MapLayerType,
  ForecastHorizonId,
  LocationData,
  HorizonForecast,
  EmergencyAlert,
  DataFeed,
  XAIFeature,
  IncidentReport,
} from '../types';
import {
  LOCATIONS,
  FORECAST_HORIZONS,
  ACTIVE_ALERTS,
  DATA_INGESTION_FEEDS,
  XAI_FEATURES_BY_HAZARD,
  METEOROLOGICAL_SYNTHESIS_BY_HAZARD,
  SAMPLE_INCIDENT_DISPATCH,
} from '../data/mockData';

interface MeghnetraContextType {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  selectedLocation: LocationId;
  setSelectedLocation: (id: LocationId) => void;
  selectedHazard: HazardType;
  setSelectedHazard: (hazard: HazardType) => void;
  selectedForecastHour: ForecastHorizonId;
  setSelectedForecastHour: (hour: ForecastHorizonId) => void;
  mapLayer: MapLayerType;
  setMapLayer: (layer: MapLayerType) => void;
  audioWarningEnabled: boolean;
  setAudioWarningEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
  isAudioAlertEnabled: boolean;
  toggleAudioAlert: () => void;
  simulationMode: boolean;
  setSimulationMode: (val: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (val: boolean) => void;

  // Derived current data
  currentLocationData: LocationData;
  currentForecasts: HorizonForecast[];
  selectedHorizonData: HorizonForecast;
  currentXaiFeatures: XAIFeature[];
  currentSynthesis: string;
  alerts: EmergencyAlert[];
  dataFeeds: DataFeed[];

  // Dynamic probabilities for currently selected location + forecast horizon
  currentProbabilities: {
    storm: number;
    cloudburst: number;
    flashFlood: number;
    overallRisk: number;
    riskCategory: string;
  };

  // Map state
  mapCenter: [number, number];
  setMapCenter: (coords: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;

  // Actions
  acknowledgeAlert: (alertId: string) => void;
  viewAlertOnMap: (alert: EmergencyAlert) => void;
  openReportModal: (report?: IncidentReport) => void;
  closeReportModal: () => void;
  activeReport: IncidentReport | null;

  openShareModal: (text?: string) => void;
  closeShareModal: () => void;
  shareModalData: { title: string; text: string; url: string } | null;

  openExportModal: (title?: string) => void;
  closeExportModal: () => void;
  exportModalData: { title: string; type: string } | null;
}

const MeghnetraContext = createContext<MeghnetraContextType | undefined>(undefined);

export const MeghnetraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedLocation, setSelectedLocation] = useState<LocationId>('haridwar');
  const [selectedHazard, setSelectedHazard] = useState<HazardType>('storm');
  const [selectedForecastHour, setSelectedForecastHour] = useState<ForecastHorizonId>('4h');
  const [mapLayer, setMapLayer] = useState<MapLayerType>('overall');
  const [audioWarningEnabled, setAudioWarningEnabled] = useState<boolean>(true);
  const [simulationMode, setSimulationMode] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const [alerts, setAlerts] = useState<EmergencyAlert[]>(ACTIVE_ALERTS);
  const [mapCenter, setMapCenter] = useState<[number, number]>([29.9457, 78.1642]);
  const [mapZoom, setMapZoom] = useState<number>(11);

  const [activeReport, setActiveReport] = useState<IncidentReport | null>(null);
  const [shareModalData, setShareModalData] = useState<{ title: string; text: string; url: string } | null>(null);
  const [exportModalData, setExportModalData] = useState<{ title: string; type: string } | null>(null);

  // Derived current data
  const currentLocationData = LOCATIONS[selectedLocation] || LOCATIONS.dehradun;
  const currentForecasts = FORECAST_HORIZONS[selectedLocation] || FORECAST_HORIZONS.dehradun;

  const selectedHorizonData = useMemo(() => {
    return (
      currentForecasts.find((f) => f.id === selectedForecastHour) ||
      currentForecasts[3] || // default +4h
      currentForecasts[0]
    );
  }, [currentForecasts, selectedForecastHour]);

  // Compute dynamic probabilities based on selected forecast hour & location
  const currentProbabilities = useMemo(() => {
    const storm = selectedHorizonData.stormProb;
    const cloudburst = selectedHorizonData.cloudburstProb;
    const flashFlood = selectedHorizonData.flashFloodProb;
    const maxVal = Math.max(storm, cloudburst, flashFlood);

    let riskCategory = 'LOW';
    if (maxVal >= 80) riskCategory = 'CRITICAL';
    else if (maxVal >= 70) riskCategory = 'SEVERE';
    else if (maxVal >= 50) riskCategory = 'HIGH';
    else if (maxVal >= 30) riskCategory = 'MODERATE';

    return {
      storm,
      cloudburst,
      flashFlood,
      overallRisk: Math.round(storm * 0.4 + cloudburst * 0.35 + flashFlood * 0.25),
      riskCategory,
    };
  }, [selectedHorizonData]);

  const currentXaiFeatures = useMemo(() => {
    return XAI_FEATURES_BY_HAZARD[selectedHazard] || XAI_FEATURES_BY_HAZARD.storm;
  }, [selectedHazard]);

  const currentSynthesis = useMemo(() => {
    return METEOROLOGICAL_SYNTHESIS_BY_HAZARD[selectedHazard] || METEOROLOGICAL_SYNTHESIS_BY_HAZARD.storm;
  }, [selectedHazard]);

  // When location changes, update map center
  const handleSelectLocation = (id: LocationId) => {
    setSelectedLocation(id);
    const loc = LOCATIONS[id];
    if (loc) {
      setMapCenter([loc.lat, loc.lng]);
    }
  };

  // When hazard changes, sync map layer if relevant
  const handleSelectHazard = (hazard: HazardType) => {
    setSelectedHazard(hazard);
    setMapLayer(hazard);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isAcknowledged: true } : a))
    );
  };

  const viewAlertOnMap = (alert: EmergencyAlert) => {
    setSelectedLocation(alert.locationId);
    setMapCenter(alert.coordinates);
    setMapZoom(12);
    if (alert.hazard) {
      setSelectedHazard(alert.hazard);
      setMapLayer(alert.hazard);
    }
    // If not in live GIS map, go to map view or scroll to map in dashboard
    setActiveView('dashboard');
    setTimeout(() => {
      const mapElem = document.getElementById('gis-map-container');
      if (mapElem) {
        mapElem.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const openReportModal = (report?: IncidentReport) => {
    if (report) {
      setActiveReport(report);
    } else {
      // Build dynamic report for currently selected location & horizon
      const dynamicReport: IncidentReport = {
        id: `MN-2024-${selectedLocation.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `${currentLocationData.name} - Automated Multi-Hazard Nowcast Bulletin`,
        locationId: selectedLocation,
        locationName: currentLocationData.name,
        hazardType: selectedHazard,
        generatedAtUtc: `2026-09-11 14:32 UTC (Prototype Simulation)`,
        forecastWindow: `${selectedHorizonData.timeUtc} (${selectedHorizonData.label})`,
        leadTime: selectedHorizonData.label,
        riskCategory: currentProbabilities.riskCategory,
        probability:
          selectedHazard === 'storm'
            ? currentProbabilities.storm
            : selectedHazard === 'cloudburst'
            ? currentProbabilities.cloudburst
            : currentProbabilities.flashFlood,
        affectedArea: `${currentLocationData.exposedAreaKm2} km²`,
        affectedPop: `~${currentLocationData.populationExposed.toLocaleString()} residents`,
        meteorologicalSynthesis: currentSynthesis,
        atmosphericSnapshot: {
          'Integrated Water Vapor (IWV)': `${currentLocationData.atmospheric.iwv} kg/m²`,
          'CAPE / CIN': `${currentLocationData.atmospheric.cape} J/kg / ${currentLocationData.atmospheric.cin} J/kg`,
          'Cloud Top Temp (CTT)': `${currentLocationData.atmospheric.ctt}°C (${currentLocationData.atmospheric.cttTrend})`,
          'Radar Rainfall Rate (QPE)': `${currentLocationData.atmospheric.rainfallRate} mm/hr (Peak: ${currentLocationData.atmospheric.rainfallRatePeak} mm/hr)`,
          'Deep Wind Shear (0-6km)': `${currentLocationData.atmospheric.windShear} m/s`,
        },
        terrainSnapshot: {
          'Mean Orographic Slope': `${currentLocationData.terrain.meanSlope}° (${currentLocationData.terrain.slopeDescription})`,
          'Flow Accumulation Index': `${currentLocationData.terrain.flowAccumulation} (${currentLocationData.terrain.activeRiverBasin})`,
          'Soil Saturation (API)': `${currentLocationData.terrain.soilSaturationApi}% Saturation`,
          'Drainage Proximity': `< ${currentLocationData.terrain.drainageProximityMeters}m to active drainage bed`,
        },
        topAttributions: currentXaiFeatures.map((f) => ({
          feature: f.name,
          weight: `+${f.attributionPct}%`,
        })),
        recommendedActions: [
          `Activate local emergency sirens across vulnerable sectors of ${currentLocationData.name}.`,
          `Alert District Emergency Operations Center (DEOC) for immediate readiness.`,
          `Pre-position SDRF personnel and rescue watercraft in riparian zones.`,
          `Restrict transit on river-adjacent roads and hilly corridors prone to debris flow.`,
        ],
        sdmaReference: `SDMA-UT-${selectedLocation.toUpperCase()}-2024`,
        dispatchedTo: ['NDMA HQ', 'Uttarakhand SDMA', `DEOC ${currentLocationData.name}`, 'SDRF Battalions', 'IMD NWP Division'],
      };
      setActiveReport(dynamicReport);
    }
  };

  const closeReportModal = () => setActiveReport(null);

  const openShareModal = (text?: string) => {
    setShareModalData({
      title: `MEGHNETRA Weather Early Warning - ${currentLocationData.name}`,
      text:
        text ||
        `MEGHNETRA Warning Alert for ${currentLocationData.name}: ${currentProbabilities.riskCategory} Risk. Thunderstorm: ${currentProbabilities.storm}%, Cloudburst: ${currentProbabilities.cloudburst}%, Flash Flood: ${currentProbabilities.flashFlood}%. Peak window: ${selectedHorizonData.label}.`,
      url: window.location.href,
    });
  };

  const closeShareModal = () => setShareModalData(null);

  const openExportModal = (title?: string) => {
    setExportModalData({
      title: title || `Official Bulletin - ${currentLocationData.name}`,
      type: 'NDMA / SDMA Multi-Hazard Format (JSON / PDF / CSV)',
    });
  };

  const closeExportModal = () => setExportModalData(null);

  return (
    <MeghnetraContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedLocation,
        setSelectedLocation: handleSelectLocation,
        selectedHazard,
        setSelectedHazard: handleSelectHazard,
        selectedForecastHour,
        setSelectedForecastHour,
        mapLayer,
        setMapLayer,
        audioWarningEnabled,
        setAudioWarningEnabled,
        isAudioAlertEnabled: audioWarningEnabled,
        toggleAudioAlert: () => setAudioWarningEnabled((prev) => !prev),
        simulationMode,
        setSimulationMode,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        currentLocationData,
        currentForecasts,
        selectedHorizonData,
        currentXaiFeatures,
        currentSynthesis,
        alerts,
        dataFeeds: DATA_INGESTION_FEEDS,
        currentProbabilities,
        mapCenter,
        setMapCenter,
        mapZoom,
        setMapZoom,
        acknowledgeAlert: handleAcknowledgeAlert,
        viewAlertOnMap,
        openReportModal,
        closeReportModal,
        activeReport,
        openShareModal,
        closeShareModal,
        shareModalData,
        openExportModal,
        closeExportModal,
        exportModalData,
      }}
    >
      {children}
    </MeghnetraContext.Provider>
  );
};

export const useMeghnetra = (): MeghnetraContextType => {
  const context = useContext(MeghnetraContext);
  if (!context) {
    throw new Error('useMeghnetra must be used within a MeghnetraProvider');
  }
  return context;
};
