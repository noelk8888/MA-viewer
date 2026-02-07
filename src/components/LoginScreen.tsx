import React from 'react';
import { Loader2, Package } from 'lucide-react';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

export const LoginScreen: React.FC = () => {
    const { login, isLoading, error, isConfigured } = useGoogleAuth();

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
                    {/* App Icon */}
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Package className="text-white" size={40} strokeWidth={2} />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            Inventory Viewer
                        </h1>
                        <p className="text-gray-600 text-sm">
                            Sign in to access the inventory management system
                        </p>
                    </div>

                    {/* Sign In Button */}
                    <div className="space-y-4">
                        {!isConfigured ? (
                            <div className="text-center py-4">
                                <p className="text-red-600 text-sm font-medium">Configuration Missing</p>
                                <p className="text-gray-500 text-xs mt-1">
                                    Google OAuth is not configured. Please contact your administrator.
                                </p>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={login}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Signing in...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path
                                                    fill="currentColor"
                                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                />
                                                <path
                                                    fill="currentColor"
                                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                />
                                                <path
                                                    fill="currentColor"
                                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                />
                                                <path
                                                    fill="currentColor"
                                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                />
                                            </svg>
                                            <span>Sign in with Google</span>
                                        </>
                                    )}
                                </button>

                                {error && (
                                    <div className="text-center space-y-2">
                                        <p className="text-red-600 text-sm">{error}</p>
                                        <p className="text-gray-500 text-xs">
                                            💡 Tip: If login isn't working on mobile, try allowing popups or use a desktop browser.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-xs text-gray-400">
                            © {new Date().getFullYear()} Inventory Viewer App
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
