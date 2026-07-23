import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../contexts/MessagesContext';
import ConversationList from './ConversationList';
import ChatPanel from './ChatPanel';
import { requestNotificationPermission } from '../utils/browserNotifications';

const ChatApp = () => {
  const { isAuthenticated } = useAuth();
  const { clearAllMessages, loadRecentContacts, selectedConversation, selectConversation, markUserActivity } = useMessages();
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Cargar contactos cuando el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadRecentContacts();
    }
  // eslint-disable-next-line
  }, [isAuthenticated]); // Remover loadRecentContacts de las dependencias

  // Solicitar permiso de notificaciones del navegador al autenticarse
  useEffect(() => {
    if (isAuthenticated) {
      requestNotificationPermission();
    }
  }, [isAuthenticated]);

  // Limpiar mensajes si el usuario se desautentica
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllMessages();
      selectConversation(null);
      setShowMobileChat(false);
    }
  }, [isAuthenticated, clearAllMessages, selectConversation]);

  const handleSelectConversation = (conversation) => {
    selectConversation(conversation);
    // Marcar actividad del usuario para reiniciar timeout
    markUserActivity();
    // En móvil, cambiar a la vista de chat cuando se selecciona una conversación
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    // Regresar a la lista de conversaciones en móvil
    setShowMobileChat(false);
  };

  return (
    <div className="safe-viewport bg-gray-100 flex">
      {/* Left column - Conversations list */}
      <div className={`
        w-full md:w-1/3 md:min-w-[300px] md:max-w-[400px] h-full
        ${showMobileChat ? 'hidden md:block' : 'block'}
      `}>
        <ConversationList 
          onSelectConversation={handleSelectConversation}
          selectedConversation={selectedConversation}
        />
      </div>
      
      {/* Right column - Chat panel */}
      <div className={`
        w-full md:flex-1 h-full
        ${showMobileChat ? 'block' : 'hidden md:block'}
      `}>
        <ChatPanel 
          selectedConversation={selectedConversation}
          onBackToList={handleBackToList}
          showBackButton={showMobileChat}
        />
      </div>
    </div>
  );
};

export default ChatApp;
