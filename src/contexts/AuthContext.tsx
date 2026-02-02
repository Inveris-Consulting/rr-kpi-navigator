import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { users, User } from '@/lib/mockData';

interface AuthContextType {
  user: User | null;
  login: (name: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kpi_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return users.find(u => u.id === parsed.id) || null;
    }
    return null;
  });

  const login = useCallback((name: string) => {
    const foundUser = users.find(
      u => u.name.toLowerCase() === name.toLowerCase()
    );
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('kpi_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('kpi_user');
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
