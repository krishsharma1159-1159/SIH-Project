export type ViewType =
  | 'dashboard'
  | 'live-gis-map'
  | 'live-map'
  | 'hazard-prediction'
  | 'forecast-timeline'
  | 'alert-center'
  | 'location-intelligence'
  | 'location-intel'
  | 'model-intelligence-and-xai'
  | 'model-xai'
  | 'incident-reports'
  | 'data-ingestion'
  | 'system-status-and-telemetry'
  | 'system-status'
  | 'settings';

export type LocationId =
  | 'dehradun'
  | 'mussoorie'
  | 'rishikesh'
  | 'haridwar'
  | 'tehri'
  | 'rudraprayag';

export type HazardType = 'storm' | 'cloudburst' | 'flashflood';

export type MapLayerType =
  | 'overall'
  | 'storm'
  | 'cloudburst'
  | 'flashflood'
  | 'qpe'
  | 'iwv'
  | 'ctt'
  | 'dem';

export type ForecastHorizonId = 'now' | '2h' | '3h' | '4h' | '5h' | '6h';

export interface LocationData {
  id: LocationId;
  name: string;
  subName: string;
  lat: number;
  lng: number;
  elevation: number; // in meters
  exposedAreaKm2: number;
  populationExposed: number;
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';
  overallRiskScore: number; // 0 - 100
  hazards: {
    storm: number; // %
    cloudburst: number; // %
    flashFlood: number; // %
  };
  peaks: {
    storm: string;
    cloudburst: string;
    flashFlood: string;
  };
  atmospheric: {
    iwv: number; // kg/m²
    iwvTrend: string;
    cape: number; // J/kg
    cin: number; // J/kg
    ctt: number; // °C
    cttTrend: string;
    rainfallRate: number; // mm/hr
    rainfallRatePeak: number; // mm/hr
    windShear: number; // m/s (0-6km)
    relativeHumidity: number; // %
    surfaceTemp: number; // °C
    pressure: number; // hPa
    lowLevelConvergence: string;
  };
  terrain: {
    meanSlope: number; // degrees
    slopeDescription: string;
    flowAccumulation: 'Low' | 'Moderate' | 'High' | 'Critical';
    soilSaturationApi: number; // %
    drainageProximityMeters: number;
    activeRiverBasin: string;
  };
}

export interface HorizonForecast {
  id: ForecastHorizonId;
  label: string;
  timeUtc: string;
  statusTag: string;
  tagColor: string;
  stormProb: number;
  cloudburstProb: number;
  flashFloodProb: number;
  notes: string;
  isPeakStorm?: boolean;
  isPeakCloudburst?: boolean;
  isPeakFlood?: boolean;
}

export interface XAIFeature {
  id: string;
  name: string;
  attributionPct: number;
  category: 'atmospheric' | 'radar' | 'terrain' | 'nwp';
  hazardTarget: HazardType | 'all';
  description?: string;
}

export interface EmergencyAlert {
  id: string;
  hazard: HazardType;
  level: 'RED ADVISORY' | 'ORANGE WATCH' | 'YELLOW ADVISORY';
  badgeClass: string;
  title: string;
  locationName: string;
  locationId: LocationId;
  coordinates: [number, number];
  leadTime: string;
  probability: number;
  affectedArea: string;
  affectedPop: string;
  recommendedAction: string;
  timestampUtc: string;
  issuedAtUtc?: string;
  isAcknowledged: boolean;
  dispatchId: string;
}

export type AlertItem = EmergencyAlert;

export interface DataFeed {
  id: string;
  name: string;
  subType: string;
  type?: string;
  provider?: string;
  resolution?: string;
  status: 'active' | 'delayed' | 'offline';
  lastUpdate: string;
  latency: string;
  qualityPct: number;
  isSimulation: boolean;
  description: string;
}

export interface IncidentReport {
  id: string;
  title: string;
  locationId: LocationId;
  locationName: string;
  hazardType: HazardType;
  generatedAtUtc: string;
  forecastWindow: string;
  leadTime: string;
  riskCategory: string;
  probability: number;
  affectedArea: string;
  affectedPop: string;
  meteorologicalSynthesis: string;
  atmosphericSnapshot: Record<string, string | number>;
  terrainSnapshot: Record<string, string | number>;
  topAttributions: { feature: string; weight: string }[];
  recommendedActions: string[];
  sdmaReference: string;
  dispatchedTo: string[];
}
