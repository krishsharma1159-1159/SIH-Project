import React, { useState } from 'react';
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
  const [soundFeedback, setSoundFeedback] = useState<string | null>(null);

  const feedbackTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const toggleAudio = () => {
    const nextState = !audioWarningEnabled;
    setAudioWarningEnabled(nextState);
    setSoundFeedback(nextState ? 'Audio Alert Armed' : 'Audio Muted');

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setSoundFeedback(null);
    }, 2000);
  };

  React.useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectRegion = (locId: LocationId) => {
    setSelectedLocation(locId);
    setRegionDropdownOpen(false);
  };

  const currentLocation = LOCATIONS[selectedLocation];

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
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-bold text-[15px] sm:text-[16px] text-[#0b1c30] tracking-tight">
              MEGHNETRA
            </span>
            <span className="px-1.5 py-0.5 bg-[#dbe1ff] text-[#00174b] font-data-mono text-[10px] sm:text-[11px] font-bold rounded">
              TEAM VIRAJ
            </span>
            <span className="px-1.5 py-0.5 bg-[#eff4ff] text-[#004ac6] font-data-mono text-[10px] font-bold rounded border border-[#004ac6]/30">
              PROTOTYPE SIMULATION
            </span>
          </div>
          <p className="text-[11px] sm:text-[12px] text-[#434655] hidden sm:block">
            AI-Driven Hyper-Local Weather Early Warning System
          </p>
        </div>
      </div>

      {/* Operational State & Location Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* All Systems Operational */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-[#85f8c4]/30 border border-[#85f8c4] text-[#002114] rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#006243] animate-pulse"></span>
          <span className="font-label-caps text-[11px] font-bold">ALL SYSTEMS OPERATIONAL (SIMULATED)</span>
        </div>

        {/* Audio Warning Toggle Button */}
        <div className="relative">
          <button
            onClick={toggleAudio}
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
              audioWarningEnabled
                ? 'bg-[#dbe1ff] text-[#004ac6] border-[#004ac6]/30 hover:bg-[#c3c6d7]/40'
                : 'bg-white text-[#434655] border-[#c3c6d7]/60 hover:bg-[#e5eeff]'
            }`}
            title={audioWarningEnabled ? 'Audio Warning System Active (Click to mute)' : 'Audio Muted (Click to arm)'}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {audioWarningEnabled ? 'volume_up' : 'volume_off'}
            </span>
            <span className="hidden sm:inline text-[11px] font-data-mono font-medium">
              {audioWarningEnabled ? 'ARMED' : 'MUTED'}
            </span>
          </button>
          {soundFeedback && (
            <div className="absolute top-full mt-1 right-0 bg-[#0b1c30] text-white text-[10px] font-data-mono px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
              {soundFeedback}
            </div>
          )}
        </div>

        {/* Interactive Location / Region Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRegionDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 bg-[#eff4ff] border border-[#c3c6d7]/70 rounded-lg px-2 sm:px-2.5 py-1.5 hover:bg-[#e5eeff] transition-colors text-left"
            type="button"
          >
            <span className="material-symbols-outlined text-[#004ac6] text-[18px]">location_on</span>
            <div className="flex flex-col">
              <span className="text-[12px] text-[#0b1c30] font-semibold leading-tight max-w-[110px] sm:max-w-none truncate">
                {currentLocation?.name.split('&')[0].trim() || 'Haridwar'}
              </span>
              <span className="text-[10px] text-[#434655] hidden md:inline">Uttarakhand Topography</span>
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
                  Select Observation Station
                </span>
                <span className="text-[10px] font-data-mono text-[#004ac6]">6 Stations Active</span>
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

        <div className="h-6 w-px bg-[#c3c6d7]/50 hidden sm:block"></div>

        {/* User Profile */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-[12px] font-semibold text-[#0b1c30] leading-tight">Dr. R. Sharma</div>
            <div className="font-label-caps text-[10px] text-[#434655] uppercase">IMD Liaison</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#004ac6] flex items-center justify-center text-white font-bold text-[13px]">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};
