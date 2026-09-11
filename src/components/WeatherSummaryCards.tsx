import React, { useState, useMemo } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import {
  Wind,
  Droplets,
  Gauge,
  TrendingUp,
  TrendingDown,
  Compass,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
} from 'lucide-react';

type TrendWindow = 'past3h' | 'now' | 'forecast3h' | 'full6h';

interface WeatherTrendPoint {
  timeLabel: string;
  windSpeed: number; // km/h
  windGust: number; // km/h
  humidity: number; // %
  pressure: number; // hPa
  isCurrent?: boolean;
}

export const WeatherSummaryCards: React.FC = () => {
  const { currentLocationData, selectedForecastHour } = useMeghnetra();

  const [activeWindow, setActiveWindow] = useState<TrendWindow>('now');
  const [selectedMetric, setSelectedMetric] = useState<'wind' | 'humidity' | 'pressure'>('wind');
  const [unitMode, setUnitMode] = useState<'kmh' | 'ms'>('kmh');
  const [simulatedJitter, setSimulatedJitter] = useState<number>(0);

  // Generate deterministic time series trends based on location's baseline
  const trends: WeatherTrendPoint[] = useMemo(() => {
    const baseWindShear = currentLocationData.atmospheric.windShear; // m/s
    const baseKmh = Math.round(baseWindShear * 3.6);
    const baseRh = currentLocationData.atmospheric.relativeHumidity;
    const baseP = currentLocationData.atmospheric.pressure;

    const timeLabels = ['-3h', '-2h', '-1h', 'NOW', '+1h', '+2h', '+3h'];
    
    // Convective storm pattern: rising wind & gusts, rising humidity, dropping pressure
    const windModifiers = [-14, -8, -3, 0, 8, 18, 12];
    const gustModifiers = [-10, -4, 2, 8, 22, 34, 20];
    const rhModifiers = [-12, -8, -4, 0, 3, 5, 2];
    const pressModifiers = [3.8, 2.4, 1.1, 0, -2.2, -4.6, -3.1];

    return timeLabels.map((label, idx) => {
      const isCurrent = label === 'NOW';
      const wMod = windModifiers[idx] + (isCurrent ? simulatedJitter * 1.5 : 0);
      const gMod = gustModifiers[idx] + (isCurrent ? simulatedJitter * 2 : 0);
      const rMod = rhModifiers[idx] + (isCurrent ? simulatedJitter * 0.5 : 0);
      const pMod = pressModifiers[idx] - (isCurrent ? simulatedJitter * 0.2 : 0);

      return {
        timeLabel: label,
        windSpeed: Math.max(8, Math.round(baseKmh + wMod)),
        windGust: Math.max(14, Math.round(baseKmh * 1.45 + gMod)),
        humidity: Math.min(99, Math.max(45, Math.round(baseRh + rMod))),
        pressure: Number((baseP + pMod).toFixed(1)),
        isCurrent,
      };
    });
  }, [currentLocationData, simulatedJitter]);

  const currentPoint = trends.find((t) => t.isCurrent) || trends[3];

  const handleSimulatePulse = () => {
    // Add temporary slight fluctuation to demonstrate live telemetry update
    setSimulatedJitter((prev) => (prev === 2 ? -1 : prev + 1));
  };

  // Convert wind display according to unit
  const formatWind = (kmhVal: number) => {
    if (unitMode === 'ms') {
      return `${(kmhVal / 3.6).toFixed(1)} m/s`;
    }
    return `${kmhVal} km/h`;
  };

  return (
    <section className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 space-y-3.5">
      {/* Header bar with controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#c3c6d7]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#004ac6] font-bold tracking-wider">
              Atmospheric Nowcast Telemetry
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h3 className="font-headline-sm text-[15px] font-bold text-[#0b1c30]">
              Simulated Surface Weather Trends & Gradients
            </h3>
          </div>
          <p className="text-[12px] text-[#434655] mt-0.5">
            Continuous boundary-layer observations for <span className="font-semibold text-[#0b1c30]">{currentLocationData.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 font-data-mono text-[11px]">
          {/* Time window selector */}
          <div className="bg-[#eff4ff] p-0.5 rounded-lg flex items-center">
            <button
              onClick={() => setActiveWindow('now')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activeWindow === 'now' ? 'bg-[#004ac6] text-white shadow-2xs' : 'text-[#434655] hover:text-[#0b1c30]'
              }`}
              type="button"
            >
              Current Frame
            </button>
            <button
              onClick={() => setActiveWindow('full6h')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activeWindow === 'full6h' ? 'bg-[#004ac6] text-white shadow-2xs' : 'text-[#434655] hover:text-[#0b1c30]'
              }`}
              type="button"
            >
              6h Sequence
            </button>
          </div>

          {/* Unit Toggle */}
          <button
            onClick={() => setUnitMode(unitMode === 'kmh' ? 'ms' : 'kmh')}
            className="px-2.5 py-1 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#004ac6] border border-[#c3c6d7]/50 rounded-lg font-bold cursor-pointer transition-colors"
            type="button"
            title="Toggle wind units between km/h and m/s"
          >
            Unit: {unitMode.toUpperCase()}
          </button>

          {/* Pulse Simulation button */}
          <button
            onClick={handleSimulatePulse}
            className="p-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#004ac6] border border-[#c3c6d7]/50 rounded-lg cursor-pointer transition-colors"
            type="button"
            title="Simulate incoming sensor pulse"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* The 3 Interactive Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* CARD 1: WIND DYNAMICS */}
        <div
          onClick={() => setSelectedMetric('wind')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            selectedMetric === 'wind'
              ? 'bg-[#eff4ff] border-[#004ac6] ring-1 ring-[#004ac6]/50 shadow-xs'
              : 'bg-[#f8f9ff] border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[#004ac6]">
                <Wind className="w-4 h-4" />
                <span className="font-label-caps text-[11px] font-bold uppercase">Wind & Gust Dynamics</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] font-data-mono font-bold rounded bg-[#004ac6]/10 text-[#004ac6]">
                SHEAR {currentLocationData.atmospheric.windShear} m/s
              </span>
            </div>

            {/* Metric values */}
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <span className="font-telemetry-value text-[26px] font-bold text-[#0b1c30]">
                  {formatWind(currentPoint.windSpeed)}
                </span>
                <span className="text-[11px] text-[#434655] font-data-mono ml-1">sustained</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#434655] font-data-mono block">Peak Gust</span>
                <span className="font-telemetry-value text-[16px] font-bold text-[#ba1a1a]">
                  {formatWind(currentPoint.windGust)}
                </span>
              </div>
            </div>

            {/* Direction & Mountain Ridge Guidance */}
            <div className="mt-2 text-[11px] font-data-mono flex items-center justify-between text-[#434655] bg-white/70 p-1.5 rounded border border-[#c3c6d7]/30">
              <div className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-[#004ac6]" />
                <span>SSW (210°) • Ridge Funnel</span>
              </div>
              <span className="text-[#ba1a1a] font-semibold flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                <span>+18 km/h in 2h</span>
              </span>
            </div>
          </div>

          {/* Sparkline visualization */}
          <div className="mt-3 pt-2 border-t border-[#c3c6d7]/30">
            <div className="flex items-center justify-between text-[10px] font-data-mono text-[#747785] mb-1">
              <span>Trend (-3h to +3h)</span>
              <span>Max: {formatWind(Math.max(...trends.map((t) => t.windGust)))}</span>
            </div>
            <div className="flex items-end gap-1.5 h-8">
              {trends.map((pt) => {
                const maxGust = 80;
                const heightPct = Math.min(100, Math.max(20, (pt.windGust / maxGust) * 100));
                return (
                  <div key={pt.timeLabel} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      className={`w-full rounded-t transition-all ${
                        pt.isCurrent
                          ? 'bg-[#004ac6] ring-2 ring-[#004ac6]/30'
                          : 'bg-[#004ac6]/30 group-hover:bg-[#004ac6]/60'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${pt.timeLabel}: Wind ${pt.windSpeed} km/h, Gust ${pt.windGust} km/h`}
                    />
                    <span
                      className={`text-[9px] font-data-mono ${
                        pt.isCurrent ? 'font-bold text-[#004ac6]' : 'text-[#747785]'
                      }`}
                    >
                      {pt.timeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 2: RELATIVE HUMIDITY & DEW POINT */}
        <div
          onClick={() => setSelectedMetric('humidity')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            selectedMetric === 'humidity'
              ? 'bg-[#eff4ff] border-[#006399] ring-1 ring-[#006399]/50 shadow-xs'
              : 'bg-[#f8f9ff] border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[#006399]">
                <Droplets className="w-4 h-4" />
                <span className="font-label-caps text-[11px] font-bold uppercase">Moisture & Humidity</span>
              </div>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-data-mono font-bold rounded ${
                  currentPoint.humidity >= 90
                    ? 'bg-[#ffdad6] text-[#ba1a1a]'
                    : 'bg-[#e5eeff] text-[#004ac6]'
                }`}
              >
                {currentPoint.humidity >= 90 ? 'SATURATED' : 'MOIST'}
              </span>
            </div>

            {/* Metric values */}
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <span className="font-telemetry-value text-[26px] font-bold text-[#0b1c30]">
                  {currentPoint.humidity}%
                </span>
                <span className="text-[11px] text-[#434655] font-data-mono ml-1">RH Surface</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#434655] font-data-mono block">Dew Point</span>
                <span className="font-telemetry-value text-[16px] font-bold text-[#006399]">
                  {(currentLocationData.atmospheric.surfaceTemp - (100 - currentPoint.humidity) / 5).toFixed(1)}°C
                </span>
              </div>
            </div>

            {/* Micro-bar moisture progress */}
            <div className="mt-2 space-y-1">
              <div className="w-full bg-[#dce9ff] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#006399] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${currentPoint.humidity}%` }}
                />
              </div>
              <div className="text-[10px] font-data-mono text-[#434655] flex justify-between">
                <span>IWV Surge: {currentLocationData.atmospheric.iwv} kg/m²</span>
                <span className="text-[#006399] font-semibold">{currentLocationData.atmospheric.iwvTrend}</span>
              </div>
            </div>
          </div>

          {/* Sparkline visualization */}
          <div className="mt-3 pt-2 border-t border-[#c3c6d7]/30">
            <div className="flex items-center justify-between text-[10px] font-data-mono text-[#747785] mb-1">
              <span>RH Trend (-3h to +3h)</span>
              <span>Peak: {Math.max(...trends.map((t) => t.humidity))}%</span>
            </div>
            <div className="flex items-end gap-1.5 h-8">
              {trends.map((pt) => {
                const heightPct = Math.min(100, Math.max(20, (pt.humidity / 100) * 100));
                return (
                  <div key={pt.timeLabel} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      className={`w-full rounded-t transition-all ${
                        pt.isCurrent
                          ? 'bg-[#006399] ring-2 ring-[#006399]/30'
                          : 'bg-[#006399]/30 group-hover:bg-[#006399]/60'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${pt.timeLabel}: Relative Humidity ${pt.humidity}%`}
                    />
                    <span
                      className={`text-[9px] font-data-mono ${
                        pt.isCurrent ? 'font-bold text-[#006399]' : 'text-[#747785]'
                      }`}
                    >
                      {pt.timeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 3: BAROMETRIC PRESSURE & CONVECTIVE DROP */}
        <div
          onClick={() => setSelectedMetric('pressure')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            selectedMetric === 'pressure'
              ? 'bg-[#eff4ff] border-[#ba1a1a] ring-1 ring-[#ba1a1a]/50 shadow-xs'
              : 'bg-[#f8f9ff] border-[#c3c6d7]/40 hover:border-[#c3c6d7]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[#ba1a1a]">
                <Gauge className="w-4 h-4" />
                <span className="font-label-caps text-[11px] font-bold uppercase">Barometric Pressure</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] font-data-mono font-bold rounded bg-[#ffdad6] text-[#ba1a1a] flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                <span>FALLING RAPIDLY</span>
              </span>
            </div>

            {/* Metric values */}
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <span className="font-telemetry-value text-[26px] font-bold text-[#0b1c30]">
                  {currentPoint.pressure}
                </span>
                <span className="text-[11px] text-[#434655] font-data-mono ml-1">hPa (Station)</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#434655] font-data-mono block">Elevation</span>
                <span className="font-telemetry-value text-[16px] font-bold text-[#0b1c30]">
                  {currentLocationData.elevation}m
                </span>
              </div>
            </div>

            {/* Tendency note */}
            <div className="mt-2 text-[11px] font-data-mono flex items-center justify-between text-[#434655] bg-white/70 p-1.5 rounded border border-[#c3c6d7]/30">
              <span>Tendency (3h):</span>
              <span className="text-[#ba1a1a] font-bold flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>-4.6 hPa Convective Trough</span>
              </span>
            </div>
          </div>

          {/* Sparkline visualization */}
          <div className="mt-3 pt-2 border-t border-[#c3c6d7]/30">
            <div className="flex items-center justify-between text-[10px] font-data-mono text-[#747785] mb-1">
              <span>Pressure Gradient (-3h to +3h)</span>
              <span className="text-[#ba1a1a] font-semibold">Trough Crest at +2h</span>
            </div>
            <div className="flex items-end gap-1.5 h-8">
              {trends.map((pt) => {
                // Inverted bar height to illustrate trough depth
                const minP = Math.min(...trends.map((t) => t.pressure));
                const maxP = Math.max(...trends.map((t) => t.pressure));
                const range = Math.max(1, maxP - minP);
                const heightPct = Math.min(100, Math.max(25, ((maxP - pt.pressure) / range) * 80 + 20));
                return (
                  <div key={pt.timeLabel} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      className={`w-full rounded-t transition-all ${
                        pt.isCurrent
                          ? 'bg-[#ba1a1a] ring-2 ring-[#ba1a1a]/30'
                          : 'bg-[#ba1a1a]/30 group-hover:bg-[#ba1a1a]/60'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${pt.timeLabel}: Pressure ${pt.pressure} hPa`}
                    />
                    <span
                      className={`text-[9px] font-data-mono ${
                        pt.isCurrent ? 'font-bold text-[#ba1a1a]' : 'text-[#747785]'
                      }`}
                    >
                      {pt.timeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Contextual insight footer */}
      <div className="p-2.5 bg-[#eff4ff] rounded-lg border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-2 text-[11px] font-data-mono text-[#434655]">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#004ac6]" />
          <span>
            {selectedMetric === 'wind' &&
              `High wind shear (${currentLocationData.atmospheric.windShear} m/s) over steep terrain triggers severe mechanical turbulence and convective updrafts.`}
            {selectedMetric === 'humidity' &&
              `Surface moisture pooling (RH ${currentPoint.humidity}%) combined with steep orographic lift fuels severe cloudburst formation.`}
            {selectedMetric === 'pressure' &&
              `Accelerated pressure drop (-4.6 hPa) signals an incoming mesoscale low-pressure core traversing the ${currentLocationData.terrain.activeRiverBasin}.`}
          </span>
        </div>
        <span className="text-[#004ac6] font-bold shrink-0">PROTOTYPE SIMULATION TELEMETRY</span>
      </div>
    </section>
  );
};
