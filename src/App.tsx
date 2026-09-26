import ViewerTable from './components/ViewerTable'
import { SupplierSummaryPage } from './components/SupplierSummaryPage'
import { SupplierMonthDetailPage } from './components/SupplierMonthDetailPage'
import { GoogleAuthProvider, useGoogleAuth } from './contexts/GoogleAuthContext'
import { LoginScreen } from './components/LoginScreen'
import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react';
import type { SupplierDateColumn } from './services/googleSheetsService';

const todayInputValue = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

function AppContent() {
  const localNewMenuPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('previewNewMenu');
  const { isAuthenticated, isInitializing } = useGoogleAuth();
  const [view, setView] = useState<'viewer' | 'supplierSummary' | 'nckSummary' | 'supplierMonth'>('viewer');
  const [selectedSupplierMonth, setSelectedSupplierMonth] = useState<string | null>(null);
  const [supplierCutoffDate, setSupplierCutoffDate] = useState(todayInputValue);
  const [supplierDateColumn, setSupplierDateColumn] = useState<SupplierDateColumn>('K');
  const [supplierMonthBackView, setSupplierMonthBackView] = useState<'supplierSummary' | 'nckSummary'>('supplierSummary');
  useEffect(() => {
    // Keep this for any future initialization if needed, or remove completely if not
  }, [isAuthenticated]);

  if (localNewMenuPreview) {
    return <div className="min-h-screen w-full bg-[#f8f9fa] sm:py-8 sm:px-4"><ViewerTable initialNewMenu /></div>;
  }

  // Show loading screen while checking session
  if (isInitializing) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Show main app if authenticated
  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] sm:py-8 sm:px-4">
      {view === 'viewer' ? (
        <ViewerTable onSupplierClick={() => setView('supplierSummary')} />
      ) : view === 'supplierSummary' ? (
        <SupplierSummaryPage
          onBack={() => setView('viewer')}
          dateColumn="K"
          cutoffDate={supplierCutoffDate}
          onCutoffDateChange={setSupplierCutoffDate}
          onMonthClick={(month) => { setSelectedSupplierMonth(month); setSupplierDateColumn('K'); setSupplierMonthBackView('supplierSummary'); setView('supplierMonth'); }}
          onNckClick={() => setView('nckSummary')}
        />
      ) : view === 'nckSummary' ? (
        <SupplierSummaryPage
          onBack={() => setView('supplierSummary')}
          dateColumn="O"
          cutoffDate={supplierCutoffDate}
          onCutoffDateChange={setSupplierCutoffDate}
          onMonthClick={(month) => { setSelectedSupplierMonth(month); setSupplierDateColumn('O'); setSupplierMonthBackView('nckSummary'); setView('supplierMonth'); }}
        />
      ) : view === 'supplierMonth' && selectedSupplierMonth ? (
        <SupplierMonthDetailPage month={selectedSupplierMonth} cutoffDate={supplierCutoffDate} dateColumn={supplierDateColumn} onBack={() => setView(supplierMonthBackView)} />
      ) : null}

      <footer className="py-6 text-center text-xs text-gray-400">Inventory Viewer App • {new Date().getFullYear()}</footer>
    </div>
  );
}

function App() {
  return (
    <GoogleAuthProvider>
      <AppContent />
    </GoogleAuthProvider>
  )
}

export default App
