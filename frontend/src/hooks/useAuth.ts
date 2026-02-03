import { useState, useEffect } from 'react';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Check if user is already authenticated
    const storedToken = localStorage.getItem('userToken');

    if (storedToken) {
      setAuthState({
        token: storedToken,
        isAuthenticated: true,
      });
    }
  }, []);

  const login = (email: string) => {
    // Generate base64 token from email
    const token = btoa(email.toUpperCase());

    localStorage.setItem('userToken', token);

    setAuthState({
      token,
      isAuthenticated: true,
    });
  };

  const logout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userToken');

    setAuthState({
      token: null,
      isAuthenticated: false,
    });
  };

  return {
    ...authState,
    login,
    logout,
  };
};
