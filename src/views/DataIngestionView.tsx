import React, { useState, useEffect } from 'react';
import {
  Satellite,
  Radio,
  Database,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  ShieldAlert,
  FileText,
  CloudRain,
  Zap,
  Waves,
  Mountain,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface ChannelStatus {
  id: string;
  name: string;
  type: string;
  directory: string;
  target_variables: string[];
  resolution: string;
  cadence: string;
  provider: string;
  file_count: number;
  size_mb: number;
  status: 'ONLINE_INGESTED' | 'DATA_INGESTION_PENDING';
  is_connected: boolean;
  directory_exists: boolean;
}

interface DataStatusResponse {
  timestamp: string;
  total_files_ingested: number;
  total_volume_mb: number;
  overall_status: 'REAL_DATA_DETECTED' | 'DATA_INGESTION_PENDING';
  pipeline_locked: boolean;
  mosdac_credentials_configured: boolean;
  channels: ChannelStatus[];
  guidance: string;
}

interface MOSDACGranule {
  id: string;
  identifier: string;
  updated: string;
  size_bytes: number;
  summary: string;
  dataset_id: string;
}

export const DataIngestionView: React.FC = () => {
  // Live Data Status State
  const [dataStatus, setDataStatus] = useState<DataStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [auditRunning, setAuditRunning] = useState<boolean>(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  // MOSDAC Search State
  const [datasetId, setDatasetId] = useState<string>('3RIMG_L1B_STD');
  const [startDate, setStartDate] = useState<string>('2024-07-01');
  const [endDate, setEndDate] = useState<string>('2024-07-02');
  const [bbox, setBbox] = useState<string>('77.5,28.5,81.2,31.5');
  const [searchLimit, setSearchLimit] = useState<number>(10);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{
    total_results: number;
    total_size_mb: number;
    entries: MOSDACGranule[];
    error?: string;
  } | null>(null);

  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  // Fetch real data status from backend
  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch('/api/data/status');
      if (res.ok) {
        const data = await res.json();
        setDataStatus(data);
      } else {
        // Fallback default structure
        setDataStatus({
          timestamp: new Date().toISOString(),
          total_files_ingested: 0,
          total_volume_mb: 0,
          overall_status: 'DATA_INGESTION_PENDING',
          pipeline_locked: true,
          mosdac_credentials_configured: false,
          channels: [],
          guidance: 'Awaiting scientific data ingestion. Place real files in data/raw/ or download via MOSDAC API.',
        });
      }
    } catch (err) {
      console.error('Error fetching data status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Trigger real data audit
  const handleRunAudit = async () => {
    try {
      setAuditRunning(true);
      setAuditMessage('Scanning filesystem & validating NetCDF/HDF5 headers...');
      const res = await fetch('/api/audit/run', { method: 'POST' });
      if (res.ok) {
        setAuditMessage('Audit complete! Manifests & metadata synchronized.');
        await fetchStatus();
      } else {
        setAuditMessage('Audit finished with warnings. Review terminal logs.');
      }
    } catch (err: any) {
      setAuditMessage(`Audit execution error: ${err.message}`);
    } finally {
      setAuditRunning(false);
      setTimeout(() => setAuditMessage(null), 5000);
    }
  };

  // Search MOSDAC catalog
  const handleSearchMOSDAC = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSearchLoading(true);
      setSearchResults(null);
      const res = await fetch('/api/mosdac/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: datasetId,
          start_date: startDate,
          end_date: endDate,
          bounding_box: bbox,
          limit: searchLimit,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSearchResults({
          total_results: data.total_results || 0,
          total_size_mb: data.total_size_mb || 0,
          entries: data.entries || [],
        });
      } else {
        setSearchResults({
          total_results: 0,
          total_size_mb: 0,
          entries: [],
          error: data.message || data.error || 'Failed to query MOSDAC catalog',
        });
      }
    } catch (err: any) {
      setSearchResults({
        total_results: 0,
        total_size_mb: 0,
        entries: [],
        error: `Network error reaching MOSDAC API: ${err.message}`,
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const copyDownloadCommand = () => {
    const cmd = `python3 scripts/download_mosdac.py --dataset_id ${datasetId} --start_date ${startDate} --end_date ${endDate} --limit ${searchLimit}`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const getChannelIcon = (id: string) => {
    switch (id) {
      case 'insat3dr':
        return <Satellite className="w-4 h-4 text-[#004ac6]" />;
      case 'imdaa':
        return <HardDrive className="w-4 h-4 text-[#006243]" />;
      case 'radar':
        return <Radio className="w-4 h-4 text-[#ba1a1a]" />;
      case 'rainfall':
        return <CloudRain className="w-4 h-4 text-[#006399]" />;
      case 'lightning':
        return <Zap className="w-4 h-4 text-[#8f4c00]" />;
      case 'hydrology':
        return <Waves className="w-4 h-4 text-[#006874]" />;
      case 'dem':
        return <Mountain className="w-4 h-4 text-[#4a635d]" />;
      default:
        return <Database className="w-4 h-4 text-[#434655]" />;
    }
  };

  return (
    <div className="flex flex-col w-full space-y-5 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs p-4 border border-[#c3c6d7]/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[11px] uppercase text-[#006243] font-bold tracking-wider">
              Data Ingestion & In-Situ Assimilation
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c3c6d7]"></span>
            <h2 className="font-headline-sm text-[17px] font-bold text-[#0b1c30]">
              Telemetry Feeds & MOSDAC Sync
            </h2>
          </div>
          <p className="text-[12px] text-[#434655] mt-0.5">
            Operational status across geostationary satellites, numerical models, Doppler radars, and topography
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-data-mono text-[11px]">
          <button
            onClick={handleRunAudit}
            disabled={auditRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#004ac6] text-white rounded-lg font-medium hover:bg-[#003896] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${auditRunning ? 'animate-spin' : ''}`} />
            <span>{auditRunning ? 'Auditing...' : 'Run Scientific Audit'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#eff4ff] border border-[#c3c6d7]/60 rounded-lg text-[#002114]">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-pulse"></span>
            <span className="font-bold text-[11px]">
              {dataStatus?.total_files_ingested ?? 0} REAL FILES INGESTED
            </span>
          </div>
        </div>
      </div>

      {auditMessage && (
        <div className="p-3 bg-[#e8f5e9] border border-[#85f8c4] rounded-xl text-[12px] text-[#002114] flex items-center justify-between font-data-mono">
          <span>{auditMessage}</span>
          <span className="text-[#006243] font-bold">LIVE SYNC</span>
        </div>
      )}

      {/* Scientific Integrity Lock Notice */}
      <div className="bg-[#fff8f6] border border-[#ffdad6] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#ffdad6] rounded-lg shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 text-[#ba1a1a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#ba1a1a] text-[14px]">Scientific Integrity Guardrail</h3>
              <span className="px-2 py-0.5 bg-[#ffdad6] text-[#ba1a1a] rounded text-[10px] font-bold font-data-mono">
                {dataStatus?.pipeline_locked ? 'PIPELINE LOCKED' : 'ONLINE'}
              </span>
            </div>
            <p className="text-[12px] text-[#410002] mt-1 max-w-3xl leading-relaxed">
              Real neural network training and high-precision inference are strictly locked until genuine scientific
              NetCDF/HDF/TIFF granules are ingested. In accordance with meteorological standards, zero artificial or
              fake data will be substituted. Use the official MOSDAC panel below or place verified files in the designated raw directories.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-[11px] font-data-mono">
          <span className="px-2.5 py-1 bg-white border border-[#ffdad6] rounded-lg text-[#ba1a1a] font-semibold">
            {dataStatus?.overall_status ?? 'DATA_INGESTION_PENDING'}
          </span>
        </div>
      </div>

      {/* Grid of 7 Ingestion Feeds */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-bold text-[#0b1c30] uppercase tracking-wider font-label-caps">
            Ingestion Channels & Local File Repositories
          </h3>
          <span className="text-[11px] text-[#434655] font-data-mono">
            Updated: {dataStatus?.timestamp ? new Date(dataStatus.timestamp).toLocaleTimeString() : 'Synchronizing...'}
          </span>
        </div>

        {loadingStatus ? (
          <div className="p-8 text-center bg-white rounded-xl border border-[#c3c6d7]/40 text-[#434655] font-data-mono text-[12px]">
            Reading local manifests and sensor indices...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {dataStatus?.channels.map((ch) => (
              <div
                key={ch.id}
                className="bg-white rounded-xl shadow-xs p-3.5 border border-[#c3c6d7]/40 flex flex-col justify-between space-y-3 hover:border-[#004ac6]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {getChannelIcon(ch.id)}
                      <span className="font-label-caps text-[10px] uppercase text-[#434655] font-bold truncate max-w-[130px]">
                        {ch.type}
                      </span>
                    </div>

                    <span
                      className={`font-data-mono text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                        ch.is_connected
                          ? 'bg-[#85f8c4]/30 text-[#002114] border-[#85f8c4]'
                          : 'bg-[#ffdad6]/40 text-[#ba1a1a] border-[#ffdad6]'
                      }`}
                    >
                      {ch.is_connected ? 'CONNECTED' : 'EMPTY / PENDING'}
                    </span>
                  </div>

                  <h4 className="font-headline-sm text-[14px] font-bold text-[#0b1c30] leading-snug">
                    {ch.name}
                  </h4>
                  <p className="text-[11px] text-[#434655] mt-0.5">{ch.provider}</p>

                  <div className="mt-2.5 p-2 bg-[#f8f9ff] rounded-lg font-data-mono text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#434655]">Directory:</span>
                      <span className="font-semibold text-[#0b1c30] truncate max-w-[140px]" title={ch.directory}>
                        {ch.directory}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#434655]">Physical Files:</span>
                      <span className={`font-bold ${ch.file_count > 0 ? 'text-[#006243]' : 'text-[#ba1a1a]'}`}>
                        {ch.file_count} files ({ch.size_mb} MB)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#434655]">Cadence:</span>
                      <span className="font-medium text-[#004ac6]">{ch.cadence}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#c3c6d7]/30 flex flex-wrap gap-1">
                  {ch.target_variables.slice(0, 3).map((v) => (
                    <span
                      key={v}
                      className="px-1.5 py-0.5 bg-[#eff4ff] text-[#004ac6] rounded text-[9px] font-data-mono"
                    >
                      {v}
                    </span>
                  ))}
                  {ch.target_variables.length > 3 && (
                    <span className="px-1.5 py-0.5 bg-[#f0f0f5] text-[#434655] rounded text-[9px] font-data-mono">
                      +{ch.target_variables.length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MOSDAC ISRO Satellite Ingestion Panel */}
      <div className="bg-white rounded-xl shadow-xs border border-[#c3c6d7]/40 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#c3c6d7]/30">
          <div>
            <div className="flex items-center gap-2">
              <Satellite className="w-5 h-5 text-[#004ac6]" />
              <h3 className="font-headline-sm text-[16px] font-bold text-[#0b1c30]">
                Official MOSDAC Data Download API Client
              </h3>
            </div>
            <p className="text-[12px] text-[#434655] mt-0.5">
              Programmatic catalog query and batch granule retrieval for INSAT-3DR Imager and Sounder datasets
            </p>
          </div>

          <div className="flex items-center gap-2 font-data-mono text-[11px]">
            <span
              className={`px-2.5 py-1 rounded-lg border font-semibold ${
                dataStatus?.mosdac_credentials_configured
                  ? 'bg-[#85f8c4]/30 text-[#002114] border-[#85f8c4]'
                  : 'bg-[#ffdad6]/40 text-[#ba1a1a] border-[#ffdad6]'
              }`}
            >
              {dataStatus?.mosdac_credentials_configured
                ? '✓ MOSDAC CREDENTIALS CONFIGURED'
                : '⚠ MOSDAC_USERNAME & PASSWORD REQUIRED'}
            </span>
          </div>
        </div>

        {/* Search & Configuration Form */}
        <form onSubmit={handleSearchMOSDAC} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-[#0b1c30] uppercase font-label-caps">Dataset ID</label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="px-3 py-1.5 border border-[#c3c6d7] rounded-lg text-[12px] font-data-mono bg-[#f8f9ff] text-[#0b1c30] focus:border-[#004ac6] focus:outline-hidden"
            >
              <option value="3RIMG_L1B_STD">3RIMG_L1B_STD (Imager Standard L1B)</option>
              <option value="3RIMG_L2B_HEM">3RIMG_L2B_HEM (Hydro-Estimator Rain)</option>
              <option value="3RIMG_L2G_RAIN">3RIMG_L2G_RAIN (Gridded Daily/Half-Hourly Rain)</option>
              <option value="3RIMG_L2B_CTP">3RIMG_L2B_CTP (Cloud Top Pressure/Temp)</option>
              <option value="3RSND_L2B_PRFL">3RSND_L2B_PRFL (Sounder Vertical Profile)</option>
            </select>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-[#0b1c30] uppercase font-label-caps">Start Date (UTC)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-[#c3c6d7] rounded-lg text-[12px] font-data-mono bg-[#f8f9ff] text-[#0b1c30] focus:border-[#004ac6] focus:outline-hidden"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-[#0b1c30] uppercase font-label-caps">End Date (UTC)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-[#c3c6d7] rounded-lg text-[12px] font-data-mono bg-[#f8f9ff] text-[#0b1c30] focus:border-[#004ac6] focus:outline-hidden"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-[#0b1c30] uppercase font-label-caps">Bounding Box</label>
            <input
              type="text"
              value={bbox}
              onChange={(e) => setBbox(e.target.value)}
              placeholder="77.5,28.5,81.2,31.5"
              className="px-3 py-1.5 border border-[#c3c6d7] rounded-lg text-[12px] font-data-mono bg-[#f8f9ff] text-[#0b1c30] focus:border-[#004ac6] focus:outline-hidden"
            />
          </div>

          <div className="flex flex-col justify-end space-y-1">
            <button
              type="submit"
              disabled={searchLoading}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#004ac6] text-white rounded-lg font-medium text-[12px] hover:bg-[#003896] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Search className={`w-3.5 h-3.5 ${searchLoading ? 'animate-spin' : ''}`} />
              <span>{searchLoading ? 'Querying...' : 'Search Catalog'}</span>
            </button>
          </div>
        </form>

        {/* Search Results Display */}
        {searchResults && (
          <div className="p-4 bg-[#f8f9ff] rounded-xl border border-[#c3c6d7]/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px] text-[#0b1c30]">MOSDAC Catalog Response:</span>
                {searchResults.error ? (
                  <span className="text-[#ba1a1a] text-[12px] font-data-mono">{searchResults.error}</span>
                ) : (
                  <span className="text-[#006243] text-[12px] font-data-mono font-bold">
                    Found {searchResults.total_results.toLocaleString()} granules ({searchResults.total_size_mb.toLocaleString()} MB)
                  </span>
                )}
              </div>

              <button
                onClick={copyDownloadCommand}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#c3c6d7] rounded-lg text-[11px] font-data-mono text-[#004ac6] hover:bg-[#eff4ff] cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedCmd ? 'Command Copied!' : 'Copy CLI Download Script'}</span>
              </button>
            </div>

            {searchResults.entries.length > 0 && (
              <div className="overflow-x-auto max-h-56 overflow-y-auto border border-[#c3c6d7]/30 rounded-lg bg-white">
                <table className="w-full text-left font-data-mono text-[11px]">
                  <thead className="bg-[#eff4ff] text-[#434655] sticky top-0 border-b border-[#c3c6d7]/30">
                    <tr>
                      <th className="p-2">Granule Identifier</th>
                      <th className="p-2">Product Timestamp</th>
                      <th className="p-2">Est. Size</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c3c6d7]/20 text-[#0b1c30]">
                    {searchResults.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#f8f9ff]">
                        <td className="p-2 font-medium truncate max-w-[280px]" title={entry.identifier}>
                          {entry.identifier}
                        </td>
                        <td className="p-2 text-[#434655]">{entry.updated}</td>
                        <td className="p-2">{(entry.size_bytes / (1024 * 1024)).toFixed(2)} MB</td>
                        <td className="p-2">
                          <span className="text-[#004ac6] font-semibold text-[10px]">Ready for Ingest</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Credentials Instructions & Guide */}
        <div className="p-4 bg-[#eff4ff] border border-[#c3c6d7]/40 rounded-xl space-y-2.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#004ac6]" />
            <h4 className="font-bold text-[13px] text-[#0b1c30]">
              How to Ingest Real Datasets into MEGHNETRA
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px] text-[#434655]">
            <div className="space-y-1.5">
              <span className="font-bold text-[#0b1c30]">Method A: Automated MOSDAC API Ingestion</span>
              <p className="text-[11px] leading-relaxed">
                1. Register an account at <a href="https://mosdac.gov.in/signup" target="_blank" rel="noreferrer" className="text-[#004ac6] underline font-medium">mosdac.gov.in/signup</a>
              </p>
              <p className="text-[11px] leading-relaxed">
                2. Add credentials to your workspace <code className="px-1.5 py-0.5 bg-white rounded border border-[#c3c6d7] text-[#ba1a1a]">.env</code>:
              </p>
              <pre className="p-2 bg-white rounded-lg border border-[#c3c6d7] font-data-mono text-[10px] text-[#0b1c30]">
                MOSDAC_USERNAME=your_email@example.com{'\n'}MOSDAC_PASSWORD=your_secret_password
              </pre>
              <p className="text-[11px] leading-relaxed">
                3. Run the automated ingestion CLI:
              </p>
              <pre className="p-2 bg-white rounded-lg border border-[#c3c6d7] font-data-mono text-[10px] text-[#004ac6]">
                python3 scripts/download_mosdac.py --dataset_id 3RIMG_L1B_STD --limit 10
              </pre>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-[#0b1c30]">Method B: Manual File Placement</span>
              <p className="text-[11px] leading-relaxed">
                Place authenticated meteorological files into the standardized directories:
              </p>
              <ul className="text-[11px] font-data-mono space-y-1 text-[#0b1c30]">
                <li>• <span className="font-bold text-[#004ac6]">data/raw/insat3dr/</span> — MOSDAC .nc / .h5 granules</li>
                <li>• <span className="font-bold text-[#006243]">data/raw/imdaa/</span> — NCMRWF IMDAA .nc / .nc4 files</li>
                <li>• <span className="font-bold text-[#ba1a1a]">data/raw/radar/</span> — IMD Doppler Radar .nc / .vol</li>
                <li>• <span className="font-bold text-[#4a635d]">data/raw/dem/</span> — ISRO CartoDEM / SRTM .tif</li>
                <li>• <span className="font-bold text-[#006874]">data/raw/hydrology/</span> — CWC Streamflow .csv / .nc</li>
              </ul>
              <p className="text-[11px] leading-relaxed pt-1">
                After placing files, click <span className="font-bold text-[#004ac6]">"Run Scientific Audit"</span> to verify headers and automatically unlock model pipelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
