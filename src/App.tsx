import ViewerTable from './components/ViewerTable'
import { SummaryPage } from './components/SummaryPage'
import { MonthDetailPage } from './components/MonthDetailPage'
import { AccountPage } from './components/AccountPage'
import { SupplierSummaryPage } from './components/SupplierSummaryPage'
import { SupplierMonthDetailPage } from './components/SupplierMonthDetailPage'
import { GoogleAuthProvider, useGoogleAuth } from './contexts/GoogleAuthContext'
import { LoginScreen } from './components/LoginScreen'
import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react';

const todayInputValue = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

function AppContent() {
  const { isAuthenticated, isInitializing } = useGoogleAuth();
  const [view, setView] = useState<'viewer' | 'summary' | 'month' | 'account' | 'supplierSummary' | 'supplierMonth'>('viewer');
  const [selectedMonth, setSelectedMonth] = useState<{ index: number; label: string } | null>(null);
  const [monthBackView, setMonthBackView] = useState<'summary' | 'supplierSummary'>('summary');
  const [selectedSupplierMonth, setSelectedSupplierMonth] = useState<string | null>(null);
  const [supplierCutoffDate, setSupplierCutoffDate] = useState(todayInputValue);
  useEffect(() => {
    // Keep this for any future initialization if needed, or remove completely if not
  }, [isAuthenticated]);

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
        <ViewerTable onSummaryClick={() => setView('summary')} onSupplierClick={() => setView('supplierSummary')} />
      ) : view === 'summary' ? (
        <SummaryPage
          onBack={() => setView('viewer')}
          onMonthClick={(index, label) => {
            setSelectedMonth({ index, label });
            setMonthBackView('summary');
            setView('month');
          }}
        />
      ) : view === 'month' && selectedMonth ? (
        <MonthDetailPage
          monthIndex={selectedMonth.index}
          monthLabel={selectedMonth.label}
          onBack={() => setView(monthBackView)}
        />
      ) : view === 'account' ? (
        <AccountPage onBack={() => setView('viewer')} />
      ) : view === 'supplierSummary' ? (
        <SupplierSummaryPage
          onBack={() => setView('viewer')}
          cutoffDate={supplierCutoffDate}
          onCutoffDateChange={setSupplierCutoffDate}
          onMonthClick={(month) => { setSelectedSupplierMonth(month); setView('supplierMonth'); }}
          onSpecialClick={(index, label) => {
            setSelectedMonth({ index, label });
            setMonthBackView('supplierSummary');
            setView('month');
          }}
        />
      ) : view === 'supplierMonth' && selectedSupplierMonth ? (
        <SupplierMonthDetailPage month={selectedSupplierMonth} cutoffDate={supplierCutoffDate} onBack={() => setView('supplierSummary')} />
      ) : null}

      <footer className="py-6 text-center text-xs text-gray-400">
        <button
          type="button"
          onClick={() => {
            setSelectedMonth(null);
            setView('account');
          }}
          className="hover:text-blue-600 hover:underline transition-colors"
          title="Open account summary"
        >
          Inventory Viewer App • {new Date().getFullYear()}
        </button>
      </footer>
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
