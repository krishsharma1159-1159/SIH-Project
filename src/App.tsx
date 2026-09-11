/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MeghnetraProvider, useMeghnetra } from './context/MeghnetraContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { IncidentReportModal } from './components/IncidentReportModal';
import { ShareModal } from './components/ShareModal';
import { ExportModal } from './components/ExportModal';

// Views
import { DashboardView } from './views/DashboardView';
import { LiveGisMapView } from './views/LiveGisMapView';
import { HazardPredictionView } from './views/HazardPredictionView';
import { ForecastTimelineView } from './views/ForecastTimelineView';
import { AlertCenterView } from './views/AlertCenterView';
import { LocationIntelligenceView } from './views/LocationIntelligenceView';
import { ModelIntelligenceXaiView } from './views/ModelIntelligenceXaiView';
import { IncidentReportsView } from './views/IncidentReportsView';
import { DataIngestionView } from './views/DataIngestionView';
import { SystemStatusTelemetryView } from './views/SystemStatusTelemetryView';
import { SettingsView } from './views/SettingsView';

const MainContent: React.FC = () => {
  const { activeView, setActiveView } = useMeghnetra();

  // Scroll to top whenever active view changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeView]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'live-gis-map':
      case 'live-map':
        return <LiveGisMapView />;
      case 'hazard-prediction':
        return <HazardPredictionView />;
      case 'forecast-timeline':
        return <ForecastTimelineView />;
      case 'alert-center':
        return <AlertCenterView />;
      case 'location-intelligence':
      case 'location-intel':
        return <LocationIntelligenceView />;
      case 'model-intelligence-and-xai':
      case 'model-xai':
        return <ModelIntelligenceXaiView />;
      case 'incident-reports':
        return <IncidentReportsView />;
      case 'data-ingestion':
        return <DataIngestionView />;
      case 'system-status-and-telemetry':
      case 'system-status':
        return <SystemStatusTelemetryView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <div className="bg-white rounded-xl shadow-xs p-8 border border-[#c3c6d7]/40 text-center max-w-lg mx-auto my-12 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#eff4ff] text-[#004ac6] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">explore_off</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-[18px] font-bold text-[#0b1c30]">
                Module Not Found
              </h2>
              <p className="text-[13px] text-[#434655] mt-1">
                The requested operational view <code className="text-[#ba1a1a] font-mono font-semibold">"{activeView}"</code> is not currently registered.
              </p>
            </div>
            <button
              onClick={() => setActiveView('dashboard')}
              className="px-4 py-2 bg-[#004ac6] text-white rounded-lg text-[13px] font-semibold hover:bg-[#003ea8] transition-colors shadow-2xs"
              type="button"
            >
              Return to Primary Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-5 max-w-[1600px] mx-auto w-full">
      {renderView()}
    </main>
  );
};

export default function App() {
  return (
    <MeghnetraProvider>
      <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans selection:bg-[#dbe1ff] selection:text-[#00174b]">
        {/* Fixed Header (h-16) */}
        <Header />

        {/* Layout with Sidebar & Content */}
        <div className="flex-1 flex pt-16 pb-10">
          {/* Navigation Sidebar (w-64) */}
          <Sidebar />

          {/* Main View Area */}
          <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-200 overflow-x-hidden">
            <MainContent />
          </div>
        </div>

        {/* Global Modals */}
        <IncidentReportModal />
        <ShareModal />
        <ExportModal />

        {/* Operational Status Footer (h-10) */}
        <Footer />
      </div>
    </MeghnetraProvider>
  );
}
