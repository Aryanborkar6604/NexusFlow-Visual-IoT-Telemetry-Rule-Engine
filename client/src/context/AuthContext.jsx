
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => authService.getToken());

  // Demo login for local development
  useEffect(() => {
    if (!token) {
      const demoUser = {
        id: 'demo_user_01',
        name: 'Factory Manager',
        email: 'manager@nexusflow.io',
        role: 'manager',
        factoryId: 'FACTORY_01',
      };

      // Development-only placeholder.
      // The backend currently supports demo access without a token.
      localStorage.setItem('nexusflow_user', JSON.stringify(demoUser));

      setUser(demoUser);
    }
  }, [token]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);

    localStorage.setItem('nexusflow_token', data.token);
    localStorage.setItem('nexusflow_user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);

    return data;
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
