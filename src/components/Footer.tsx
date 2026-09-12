import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-10 bg-white border-t border-[#c3c6d7]/40 z-50 flex items-center justify-between px-3 sm:px-4">
      <div className="flex items-center gap-2 text-[#565e74] font-data-mono text-[11px]">
        <span className="font-semibold text-[#0b1c30]">MEGHNETRA</span>
        <span className="text-[#c3c6d7]">•</span>
        <span>SIH 2024 Prototype</span>
      </div>
      <div className="flex items-center gap-3 font-data-mono text-[10px] sm:text-[11px] text-[#565e74]">
        <span>
          Data: <strong className="text-[#004ac6]">Simulation Mode</strong>
        </span>
        <span className="hidden sm:inline text-[#c3c6d7]">•</span>
        <span className="hidden sm:inline">
          Model: <strong className="text-[#0b1c30]">v1.0 Prototype</strong>
        </span>
      </div>
    </footer>
  );
};
