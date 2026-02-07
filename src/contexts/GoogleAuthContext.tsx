import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { GoogleOAuthProvider, useGoogleLogin, googleLogout } from '@react-oauth/google';

interface GoogleAuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
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

const GoogleAuthProviderInner: React.FC<GoogleAuthProviderProps & { isConfigured: boolean }> = ({ children, isConfigured }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      setError(null);
      setIsLoading(false);
    },
    onError: (errorResponse) => {
      setError(errorResponse.error_description || 'Login failed');
      setIsLoading(false);
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
    flow: 'implicit',
  });

  const handleLogin = useCallback(() => {
    if (!isConfigured) {
      setError('Google Auth is not configured (missing Client ID)');
      return;
    }
    setIsLoading(true);
    setError(null);
    login();
  }, [login, isConfigured]);

  const handleLogout = useCallback(() => {
    googleLogout();
    setAccessToken(null);
  }, []);

  return (
    <GoogleAuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        isConfigured,
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

export const GoogleAuthProvider: React.FC<GoogleAuthProviderProps> = ({ children }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID not configured - upload features disabled');
    return (
      <GoogleAuthProviderInner isConfigured={false}>
        {children}
      </GoogleAuthProviderInner>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleAuthProviderInner isConfigured={true}>
        {children}
      </GoogleAuthProviderInner>
    </GoogleOAuthProvider>
  );
};
