import React, { createContext, useState, useContext, useEffect } from 'react';
import { firebaseApi } from '@/api/firebaseClient';

const AuthContext = createContext();

const LOCAL_PREVIEW_KEY = 'darRentNestLocalPreview';

const isLocalPreviewHost = () => {
  if (typeof window === 'undefined') return false;
  return ['127.0.0.1', 'localhost'].includes(window.location.hostname);
};

const localPreviewUser = {
  id: 'local-preview-owner',
  uid: 'local-preview-owner',
  email: 'myspellcard@gmail.com',
  full_name: 'myspellcard@gmail.com',
  name: 'myspellcard@gmail.com',
  username: 'myspellcard',
  role: 'admin',
  status: 'approved',
  is_active: true,
  approved: true,
  is_owner: true,
  is_admin: true,
  permissions: ['admin', '*'],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  const checkUserAuth = React.useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      if (isLocalPreviewHost() && localStorage.getItem(LOCAL_PREVIEW_KEY) === 'true') {
        setUser(localPreviewUser);
        setIsAuthenticated(true);
        setAuthError(null);
        return;
      }

      const redirectedUser = await firebaseApi.auth.completeGoogleRedirect();
      if (redirectedUser) {
        setUser(redirectedUser);
        setIsAuthenticated(true);
        setAuthError(null);
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          window.history.replaceState({}, '', '/');
        }
        return;
      }

      const currentUser = await firebaseApi.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('Firebase auth check failed:', error);
      setAuthError({ type: 'auth_required', message: error.message || 'Authentication required' });
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const checkAppState = React.useCallback(async () => {
    setIsLoadingPublicSettings(false);
    setAppPublicSettings({});
    await checkUserAuth();
  }, [checkUserAuth]);

  const login = React.useCallback(async ({ email, password }) => {
    const loggedInUser = await firebaseApi.auth.login({ email, password });
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);
    return loggedInUser;
  }, []);

  const register = React.useCallback(async ({ email, password, fullName }) => {
    const registeredUser = await firebaseApi.auth.register({ email, password, fullName });
    setUser(registeredUser);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);
    return registeredUser;
  }, []);

  const googleLogin = React.useCallback(async () => {
    const loggedInUser = await firebaseApi.auth.loginWithGoogle();
    if (!loggedInUser) return null;
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);
    return loggedInUser;
  }, []);

  const previewLogin = React.useCallback(() => {
    if (!isLocalPreviewHost()) {
      throw new Error('Local preview is only available on localhost.');
    }
    localStorage.setItem(LOCAL_PREVIEW_KEY, 'true');
    setUser(localPreviewUser);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);
    return localPreviewUser;
  }, []);

  const logout = React.useCallback(async () => {
    localStorage.removeItem(LOCAL_PREVIEW_KEY);
    await firebaseApi.auth.logout().catch(() => {});
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required', message: 'Logged out' });
    if (typeof window !== 'undefined') window.location.href = '/login';
  }, []);

  const navigateToLogin = React.useCallback(() => {
    firebaseApi.auth.redirectToLogin();
  }, []);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      login,
      register,
      googleLogin,
      previewLogin,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
