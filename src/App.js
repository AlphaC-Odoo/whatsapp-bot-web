import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MessagesProvider } from './contexts/MessagesContext';
import LoginScreen from './components/LoginScreen';
import ChatApp from './components/ChatApp';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <ChatApp /> : <LoginScreen />;
};

function App() {
  return (
    <AuthProvider>
      <MessagesProvider>
        <AppContent />
      </MessagesProvider>
    </AuthProvider>
  );
}

export default App;
