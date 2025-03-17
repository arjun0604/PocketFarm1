
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing user session
    const storedUser = localStorage.getItem('pocketfarm_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock API call - would be replaced with actual backend auth
      console.log('Login attempt:', { email, password });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login response
      const userData: User = {
        id: '123',
        name: email.split('@')[0],
        email,
        location: {
          city: 'Unknown',
          state: 'Unknown',
          country: 'Unknown'
        }
      };
      
      localStorage.setItem('pocketfarm_user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, phone?: string) => {
    setIsLoading(true);
    try {
      // Mock API call - would be replaced with actual backend auth
      console.log('Signup attempt:', { name, email, password, phone });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful signup response
      const userData: User = {
        id: '123',
        name,
        email,
        phone,
        location: {
          city: 'Unknown',
          state: 'Unknown',
          country: 'Unknown'
        }
      };
      
      localStorage.setItem('pocketfarm_user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Signup error:', error);
      throw new Error('Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('pocketfarm_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const logout = () => {
    localStorage.removeItem('pocketfarm_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateUserProfile
      }}
    >
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
