import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-10 bg-white border-t border-[#c3c6d7]/40 z-50 flex items-center justify-between px-3 sm:px-4">
      <div className="flex items-center gap-2 text-[#0b1c30] text-[11px] sm:text-[12px]">
        <span className="px-1.5 py-0.5 bg-[#eff4ff] text-[#004ac6] font-data-mono text-[10px] font-bold rounded border border-[#004ac6]/30">
          PROTOTYPE SIMULATION
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#006243] animate-pulse"></span>
        <span className="text-[#434655] font-medium hidden sm:inline">System Health:</span>
        <span className="text-[#006243] font-bold font-data-mono">Operational (Local Model Server)</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 text-[#434655] font-data-mono text-[10px] sm:text-[11px]">
        <span>
          Resolution: <strong className="text-[#0b1c30]">1.2km Mesh</strong>
        </span>
        <span className="hidden md:inline">•</span>
        <span className="hidden md:inline">
          Data Feeds: <strong className="text-[#006243]">5/5 Simulated</strong>
        </span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline text-[#565e74]">v1.0 Prototype</span>
      </div>
    </footer>
  );
};
