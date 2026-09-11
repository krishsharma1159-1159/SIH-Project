import React, { useState } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import {
  Satellite,
  Radio,
  HardDrive,
  Waves,
  Mountain,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Info,
  Database,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { DataFeed } from '../types';

export const DataIngestionView: React.FC = () => {
  const { dataFeeds, currentLocationData } = useMeghnetra();
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleManualSync = (feedId: string, feedName: string) => {
    setSyncingFeedId(feedId);
    setSyncNotice(`Synchronizing simulated telemetry frame for ${feedName}...`);
    setTimeout(() => {
      setSyncingFeedId(null);
      setSyncNotice(`Telemetry frame for ${feedName} verified at ${new Date().toLocaleTimeString()} UTC.`);
      setTimeout(() => setSyncNotice(null), 3500);
    }, 800);
  };

  const handleSyncAll = () => {
    setSyncingFeedId('all');
    setSyncNotice('Polling and assimilating all 5 multi-source sensor streams...');
    setTimeout(() => {
      setSyncingFeedId(null);
      setSyncNotice('All telemetry feeds successfully assimilated into memory cache.');
      setTimeout(() => setSyncNotice(null), 3500);
    }, 1000);
  };

  const getFeedIcon = (id: string) => {
    switch (id) {
      case 'insat3dr':
        return <Satellite className="w-5 h-5 text-[#004ac6]" />;
      case 'imdaa':
        return <HardDrive className="w-5 h-5 text-[#006243]" />;
      case 'radar':
        return <Radio className="w-5 h-5 text-[#ba1a1a]" />;
      case 'cwc':
        return <Waves className="w-5 h-5 text-[#006874]" />;
      case 'cartodem':
        return <Mountain className="w-5 h-5 text-[#4a635d]" />;
      default:
        return <Database className="w-5 h-5 text-[#434655]" />;
    }
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#006243] font-bold tracking-wider">
              Data Assimilation & Telemetry
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[17px] font-bold text-[#0b1c30]">
              Multi-Source Ingestion Engine
            </h2>
          </div>
          <p className="text-[12px] text-[#434655] mt-0.5">
            Real-time assimilation of satellite sounders, Doppler radar reflectivity, NWP mesoscale models, and hydrologic telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-data-mono text-[11px]">
          <div className="px-2.5 py-1.5 bg-[#eff4ff] border border-[#c3c6d7]/60 rounded-lg text-[#004ac6] flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-[#006243] animate-pulse"></span>
            <span>PROTOTYPE SIMULATION ACTIVE</span>
          </div>

          <button
            onClick={handleSyncAll}
            disabled={syncingFeedId !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#004ac6] text-white rounded-lg font-medium hover:bg-[#003896] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            type="button"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingFeedId === 'all' ? 'animate-spin' : ''}`} />
            <span>Resync Feeds</span>
          </button>
        </div>
      </div>

      {/* Sync notification toast banner */}
      {syncNotice && (
        <div className="p-3 bg-[#e8f5e9] border border-[#85f8c4] rounded-xl text-[12px] text-[#002114] flex items-center justify-between font-data-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#006243]" />
            <span>{syncNotice}</span>
          </div>
          <span className="text-[#006243] font-bold text-[10px] uppercase">Telemetry State</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
          <span className="font-label-caps text-[10px] uppercase text-[#434655] font-semibold">
            Active Sensor Feeds
          </span>
          <div className="font-telemetry-value text-[24px] text-[#004ac6] font-bold mt-1">5 / 5</div>
          <div className="text-[11px] text-[#006243] font-data-mono mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Ingestion Nominal</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
          <span className="font-label-caps text-[10px] uppercase text-[#434655] font-semibold">
            Mean Pipeline Latency
          </span>
          <div className="font-telemetry-value text-[24px] text-[#0b1c30] font-bold mt-1">2.4 min</div>
          <div className="text-[11px] text-[#434655] font-data-mono mt-0.5">
            Well within 15-min SLA
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
          <span className="font-label-caps text-[10px] uppercase text-[#434655] font-semibold">
            Telemetry Quality Score
          </span>
          <div className="font-telemetry-value text-[24px] text-[#006243] font-bold mt-1">98.5%</div>
          <div className="text-[11px] text-[#006243] font-data-mono mt-0.5">
            Zero Missing Packets
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40">
          <span className="font-label-caps text-[10px] uppercase text-[#434655] font-semibold">
            Active Focus Area
          </span>
          <div className="font-telemetry-value text-[16px] text-[#0b1c30] font-bold mt-1 truncate">
            {currentLocationData.name}
          </div>
          <div className="text-[11px] text-[#004ac6] font-data-mono mt-0.5">
            Lat {currentLocationData.lat.toFixed(2)}°, Lon {currentLocationData.lng.toFixed(2)}°
          </div>
        </div>
      </div>

      {/* Feeds List */}
      <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-[15px] font-bold text-[#0b1c30]">
              Operational Telemetry Feeds
            </h3>
            <p className="text-[12px] text-[#434655]">
              Sensor data streams mapped to Uttarakhand's hydrological & atmospheric grid
            </p>
          </div>
          <span className="text-[11px] font-data-mono px-2 py-0.5 bg-[#eff4ff] text-[#004ac6] rounded font-semibold">
            MODE: HIGH-CADENCE SIMULATION
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dataFeeds.map((feed: DataFeed) => (
            <div
              key={feed.id}
              className="p-3.5 rounded-xl border border-[#c3c6d7]/50 bg-[#f8f9ff] flex flex-col justify-between hover:border-[#004ac6]/40 transition-all space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white border border-[#c3c6d7]/40">
                      {getFeedIcon(feed.id)}
                    </div>
                    <div>
                      <h4 className="font-headline-sm text-[13px] font-bold text-[#0b1c30]">
                        {feed.name}
                      </h4>
                      <p className="text-[11px] text-[#434655]">{feed.subType}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-data-mono rounded font-bold bg-[#85f8c4]/40 text-[#002114]">
                    ONLINE
                  </span>
                </div>

                <p className="text-[11px] text-[#434655] leading-relaxed line-clamp-2">
                  {feed.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#c3c6d7]/30 flex items-center justify-between text-[11px] font-data-mono text-[#434655]">
                <div>
                  <span className="text-[#747785]">Latency: </span>
                  <span className="font-semibold text-[#0b1c30]">{feed.latency}</span>
                </div>
                <div>
                  <span className="text-[#747785]">Quality: </span>
                  <span className="font-semibold text-[#006243]">{feed.qualityPct}%</span>
                </div>
                <button
                  onClick={() => handleManualSync(feed.id, feed.name)}
                  disabled={syncingFeedId !== null}
                  className="px-2 py-1 bg-white hover:bg-[#eff4ff] border border-[#c3c6d7] rounded text-[10px] text-[#004ac6] font-bold cursor-pointer transition-colors"
                  type="button"
                >
                  {syncingFeedId === feed.id ? 'Syncing...' : 'Ping'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architectural Flow Diagram */}
      <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#004ac6]" />
          <h3 className="font-headline-sm text-[14px] font-bold text-[#0b1c30]">
            Nowcasting Pipeline Assimilation Architecture
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 font-data-mono text-[11px]">
          <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#c3c6d7]/40">
            <span className="text-[#004ac6] font-bold block mb-1">01. INGESTION</span>
            <p className="text-[#434655] text-[11px] leading-relaxed">
              INSAT-3DR Sounder & IMD Doppler radar reflectivity ingested at 15-minute cadence.
            </p>
          </div>
          <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#c3c6d7]/40">
            <span className="text-[#004ac6] font-bold block mb-1">02. HARMONIZATION</span>
            <p className="text-[#434655] text-[11px] leading-relaxed">
              Topographic DEM re-gridding with 10m CartoDEM slope and drainage accumulation matrices.
            </p>
          </div>
          <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#c3c6d7]/40">
            <span className="text-[#004ac6] font-bold block mb-1">03. MULTI-HAZARD INFERENCE</span>
            <p className="text-[#434655] text-[11px] leading-relaxed">
              Deep spatiotemporal network predicts storm, cloudburst, and flash flood risks (+2h to +6h).
            </p>
          </div>
          <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#c3c6d7]/40">
            <span className="text-[#004ac6] font-bold block mb-1">04. DISPATCH & XAI</span>
            <p className="text-[#434655] text-[11px] leading-relaxed">
              Plain-English meteorology synthesis generated with Shapley value attribution for SDMA/NDMA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
