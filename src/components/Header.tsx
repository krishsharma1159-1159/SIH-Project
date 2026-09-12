import React, { useState, useEffect } from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { LOCATIONS } from '../data/mockData';
import { LocationId } from '../types';

export const Header: React.FC = () => {
  const {
    selectedLocation,
    setSelectedLocation,
    audioWarningEnabled,
    setAudioWarningEnabled,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useMeghnetra();

  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleAudio = () => {
    setAudioWarningEnabled(!audioWarningEnabled);
  };

  const handleSelectRegion = (locId: LocationId) => {
    setSelectedLocation(locId);
    setRegionDropdownOpen(false);
  };

  const currentLocation = LOCATIONS[selectedLocation];

  const utcString = currentTime.toUTCString().replace('GMT', 'UTC').slice(0, -4);
  // Format as "12 Sep 2026 • 15:10 UTC"
  const d = currentTime;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const timeLabel = `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} • ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#ffffff] border-b border-[#c3c6d7]/40 z-50 flex items-center justify-between px-3 sm:px-4">
      {/* Brand & Identity */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="lg:hidden p-1.5 rounded-lg border border-[#c3c6d7]/60 text-[#434655] hover:bg-[#eff4ff] transition-colors"
          type="button"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[20px]">
            {mobileSidebarOpen ? 'close' : 'menu'}
          </span>
        </button>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#004ac6] flex items-center justify-center text-white shadow-sm shrink-0">
          <span className="material-symbols-outlined text-[22px]">radar</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-[15px] sm:text-[16px] text-[#0b1c30] tracking-tight">
              MEGHNETRA
            </span>
            <span className="px-1.5 py-0.5 bg-[#eff4ff] text-[#004ac6] font-data-mono text-[10px] font-bold rounded border border-[#004ac6]/25 hidden sm:inline">
              SIH DEMO • PROTOTYPE
            </span>
          </div>
          <p className="text-[11px] sm:text-[12px] text-[#434655] hidden sm:block leading-tight">
            AI-Driven Hyper-Local Weather Early Warning System
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* UTC Timestamp — hidden on small screens */}
        <div className="hidden lg:flex items-center gap-1.5 text-[#565e74] font-data-mono text-[11px]">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          <span>{timeLabel}</span>
        </div>

        <div className="h-5 w-px bg-[#c3c6d7]/50 hidden lg:block" />

        {/* Interactive Location / Region Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRegionDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 bg-[#eff4ff] border border-[#c3c6d7]/70 rounded-lg px-2 sm:px-2.5 py-1.5 hover:bg-[#e5eeff] transition-colors text-left"
            type="button"
            aria-label="Select monitoring location"
          >
            <span className="material-symbols-outlined text-[#004ac6] text-[18px]">location_on</span>
            <div className="flex flex-col">
              <span className="text-[12px] text-[#0b1c30] font-semibold leading-tight max-w-[110px] sm:max-w-none truncate">
                {currentLocation?.name.split('&')[0].trim() || 'Haridwar'}
              </span>
              <span className="text-[10px] text-[#434655] hidden md:inline">Uttarakhand</span>
            </div>
            <span className="material-symbols-outlined text-[#434655] text-[16px] ml-0.5">
              {regionDropdownOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Region Dropdown Menu */}
          {regionDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-[#c3c6d7] rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
              <div className="px-3 py-1.5 bg-[#eff4ff] border-b border-[#c3c6d7]/40 flex items-center justify-between">
                <span className="font-label-caps text-[10px] text-[#434655] uppercase font-bold">
                  Select Monitoring Location
                </span>
                <span className="text-[10px] font-data-mono text-[#004ac6]">Uttarakhand</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {Object.values(LOCATIONS).map((loc) => {
                  const isSelected = loc.id === selectedLocation;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectRegion(loc.id)}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#eff4ff] transition-colors ${
                        isSelected ? 'bg-[#dbe1ff]/50 font-semibold text-[#004ac6]' : 'text-[#0b1c30]'
                      }`}
                    >
                      <div>
                        <div className="text-[13px] font-medium leading-snug">{loc.name}</div>
                        <div className="text-[11px] text-[#434655] font-data-mono">
                          Elev: {loc.elevation}m • {loc.riskCategory} RISK
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-data-mono font-bold px-1.5 py-0.5 rounded ${
                          loc.riskCategory === 'CRITICAL'
                            ? 'bg-[#ffdad6] text-[#ba1a1a]'
                            : loc.riskCategory === 'SEVERE'
                            ? 'bg-[#ffdad6] text-[#ba1a1a]'
                            : loc.riskCategory === 'HIGH'
                            ? 'bg-[#dbe1ff] text-[#004ac6]'
                            : 'bg-[#dae2fd] text-[#565e74]'
                        }`}
                      >
                        {loc.riskCategory}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-[#c3c6d7]/50 hidden sm:block" />

        {/* Audio Alert Toggle — icon only, no label */}
        <button
          onClick={toggleAudio}
          className={`p-1.5 rounded-lg border transition-all ${
            audioWarningEnabled
              ? 'bg-[#dbe1ff] text-[#004ac6] border-[#004ac6]/30 hover:bg-[#c3c6d7]/40'
              : 'bg-white text-[#434655] border-[#c3c6d7]/60 hover:bg-[#e5eeff]'
          }`}
          title={audioWarningEnabled ? 'Audio alerts enabled — click to mute' : 'Audio alerts muted — click to enable'}
          type="button"
          aria-label={audioWarningEnabled ? 'Mute audio alerts' : 'Enable audio alerts'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {audioWarningEnabled ? 'volume_up' : 'volume_off'}
          </span>
        </button>

        {/* Settings icon */}
        <button
          className="p-1.5 rounded-lg border border-[#c3c6d7]/60 text-[#434655] hover:bg-[#eff4ff] transition-colors hidden sm:flex items-center"
          title="Settings"
          type="button"
          aria-label="Settings"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>
    </header>
  );
};
