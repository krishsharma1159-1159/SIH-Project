import React from 'react';
import { useMeghnetra } from '../context/MeghnetraContext';
import { ViewType } from '../types';

interface NavItem {
  id: ViewType;
  label: string;
  icon: string;
  badge?: string;
  badgeClass?: string;
}

export const Sidebar: React.FC<{
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}> = ({ isOpenMobile: propIsOpenMobile, onCloseMobile: propOnCloseMobile }) => {
  const { activeView, setActiveView, alerts, mobileSidebarOpen, setMobileSidebarOpen } =
    useMeghnetra();

  const isOpen = propIsOpenMobile !== undefined ? propIsOpenMobile : mobileSidebarOpen;
  const handleClose = propOnCloseMobile || (() => setMobileSidebarOpen(false));

  const unacknowledgedCount = alerts.filter((a) => !a.isAcknowledged).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
    { id: 'live-gis-map', label: 'Live GIS Map', icon: 'map' },
    {
      id: 'hazard-prediction',
      label: 'Hazard Prediction',
      icon: 'crisis_alert',
      badge: '+2h to +6h',
      badgeClass: 'bg-[#d3e4fe] text-[#004ac6] font-semibold',
    },
    { id: 'forecast-timeline', label: 'Forecast Timeline', icon: 'timelapse' },
    {
      id: 'alert-center',
      label: 'Alert Center',
      icon: 'warning',
      badge: `${unacknowledgedCount} Active`,
      badgeClass: 'bg-[#ffdad6] text-[#ba1a1a] font-bold',
    },
    { id: 'location-intelligence', label: 'Location Intelligence', icon: 'share_location' },
    { id: 'model-intelligence-and-xai', label: 'Model Intelligence & XAI', icon: 'psychology' },
    { id: 'incident-reports', label: 'Incident Reports', icon: 'description' },
    { id: 'data-ingestion', label: 'Data Ingestion', icon: 'cloud_sync' },
    { id: 'system-status-and-telemetry', label: 'System Status & Telemetry', icon: 'monitor_heart' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const handleNavClick = (id: ViewType) => {
    setActiveView(id);
    handleClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-16 bottom-10 w-64 bg-[#f8f9ff] border-r border-[#c3c6d7]/40 z-40 flex flex-col justify-between py-3 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-3 overflow-y-auto flex-1">
          {/* Operations Rail Header */}
          <div className="px-2 pb-2 mb-1 border-b border-[#c3c6d7]/30 flex items-center justify-between">
            <span className="font-label-caps text-[11px] text-[#434655] uppercase tracking-wider font-bold">
              Operations Rail
            </span>
            <span className="font-data-mono text-[11px] text-[#004ac6] font-bold">11 MODULES</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 py-1">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  type="button"
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-[#dbe1ff] text-[#00174b] font-bold shadow-2xs border-l-3 border-[#004ac6]'
                      : 'text-[#434655] hover:bg-[#e5eeff] hover:text-[#0b1c30]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isActive ? 'text-[#004ac6]' : 'text-[#434655]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="text-[13px]">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 font-data-mono text-[10px] rounded-full whitespace-nowrap ${
                        item.badgeClass || 'bg-[#e5eeff] text-[#0b1c30]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Cluster Health Footer */}
        <div className="px-3 pt-2 shrink-0">
          <div className="bg-[#eff4ff] border border-[#c3c6d7]/40 rounded-lg p-2.5">
            <div className="flex items-center justify-between font-label-caps text-[10px] text-[#434655] uppercase">
              <span className="font-bold">Cluster Health</span>
              <span className="text-[#006243] font-bold">99.98%</span>
            </div>
            <div className="w-full bg-[#e5eeff] rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="bg-[#006243] h-1.5 rounded-full w-[99.98%]"></div>
            </div>
            <div className="flex justify-between items-center text-[9px] font-data-mono text-[#434655] mt-1">
              <span>Nodes: 8/8 Synced</span>
              <span>Latency: 42ms</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
