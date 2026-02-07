import ViewerTable from './components/ViewerTable'
import { GoogleAuthProvider, useGoogleAuth } from './contexts/GoogleAuthContext'
import { LoginScreen } from './components/LoginScreen'
import { Loader2, LogOut } from 'lucide-react'

function AppContent() {
  const { isAuthenticated, isInitializing, logout } = useGoogleAuth();

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
      {/* Logout Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          title="Sign out"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>

      <ViewerTable />

      <footer className="py-6 text-center text-xs text-gray-400">
        <p>Inventory Viewer App • {new Date().getFullYear()}</p>
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
