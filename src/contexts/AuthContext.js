import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest } from '../services/apiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has a valid JWT token
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Verificar si el token no ha expirado
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp > now) {
            setIsAuthenticated(true);
          } else {
            // Token expirado, limpiar
            localStorage.removeItem('access_token');
            localStorage.removeItem('token_type');
            localStorage.removeItem('expires_in');
          }
        } catch (error) {
          // Token inválido, limpiar
          console.error('Token inválido:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('token_type');
          localStorage.removeItem('expires_in');
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (username, password) => {
    try {
      // Validating credentials in backend
      const response = await loginRequest(username, password);

      if (response.ok) {
        const data = await response.json();
        
        if (data.access_token) {
          // Guardar token JWT y información relacionada
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('token_type', data.token_type || 'Bearer');
          if (data.expires_in) {
            localStorage.setItem('expires_in', data.expires_in);
          }
          
          console.log('✅ Login exitoso, token JWT guardado');
          setIsAuthenticated(true);
          return true;
        } else {
          console.error('Error en login: No se recibió access_token');
          return false;
        }
      } else {
        const errorData = await response.text().catch(() => 'Error desconocido');
        console.error('Error en login:', response.status, errorData);
        return false;
      }
    } catch (error) {
      console.error('Error al conectar con el servidor:', error);
      return false;
    }
  };

  const logout = () => {
    // Limpiar todos los datos de autenticación
    localStorage.removeItem('lastLogin');
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('expires_in');
    
    setIsAuthenticated(false);
    
    console.log('🚪 Logout realizado, tokens JWT eliminados');
  };

  const value = {
    isAuthenticated,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
