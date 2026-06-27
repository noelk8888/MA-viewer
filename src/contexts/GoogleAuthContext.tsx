import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { GoogleOAuthProvider, useGoogleLogin, googleLogout } from '@react-oauth/google';

interface GoogleAuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
  isInitializing: boolean;
  isConfigured: boolean;
  error: string | null;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
};

interface GoogleAuthProviderProps {
  children: ReactNode;
}

const AUTH_STORAGE_KEY = 'inventory_viewer_auth_token';

// Separate component for when Google is actually configured
const ConfiguredAuthProvider: React.FC<GoogleAuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount or parse redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      // Parse token from redirect
      const params = new URLSearchParams(hash.substring(1).replace(/&/g, '&'));
      const token = params.get('access_token');
      if (token) {
        setAccessToken(token);
        localStorage.setItem(AUTH_STORAGE_KEY, token);
        // Clean up the URL to remove the hash
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    } else {
      const storedToken = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedToken) {
        setAccessToken(storedToken);
      }
    }
    setIsInitializing(false);
  }, []);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      const token = tokenResponse.access_token;
      setAccessToken(token);
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      setError(null);
      setIsLoading(false);
    },
    onError: (errorResponse) => {
      setError(errorResponse.error_description || 'Login failed');
      setIsLoading(false);
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
    flow: 'implicit',
    // Using redirect mode is much more reliable on mobile devices
    ux_mode: 'redirect',
    redirect_uri: window.location.origin + window.location.pathname,
  });

  const handleLogin = useCallback(() => {
    setIsLoading(true);
    setError(null);

    // Give it a slightly longer timeout for mobile network latency
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setError('Login timeout. Please try again. If the issue persists, try using a desktop browser.');
    }, 45000);

    try {
      login();
      // Don't clear timeout immediately because redirect takes them away from the page
    } catch (err) {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setError('Failed to open login. Please check your browser settings.');
    }
  }, [login]);

  const handleLogout = useCallback(() => {
    googleLogout();
    setAccessToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  return (
    <GoogleAuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        isConfigured: true,
        isInitializing,
        login: handleLogin,
        logout: handleLogout,
        isLoading,
        error,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

// Separate component for when Google is NOT configured
const UnconfiguredAuthProvider: React.FC<GoogleAuthProviderProps> = ({ children }) => {
  return (
    <GoogleAuthContext.Provider
      value={{
        accessToken: null,
        isAuthenticated: false,
        isConfigured: false,
        isInitializing: false,
        login: () => { },
        logout: () => { },
        isLoading: false,
        error: 'Google OAuth not configured',
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const GoogleAuthProvider: React.FC<GoogleAuthProviderProps> = ({ children }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return <UnconfiguredAuthProvider>{children}</UnconfiguredAuthProvider>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ConfiguredAuthProvider>{children}</ConfiguredAuthProvider>
    </GoogleOAuthProvider>
  );
};
