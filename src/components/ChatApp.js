import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../contexts/MessagesContext';
import ConversationList from './ConversationList';
import ChatPanel from './ChatPanel';

const ChatApp = () => {
  const { isAuthenticated } = useAuth();
  const { clearAllMessages } = useMessages();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Limpiar mensajes si el usuario se desautentica
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllMessages();
      setSelectedConversation(null);
      setShowMobileChat(false);
    }
  }, [isAuthenticated, clearAllMessages]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    // En móvil, cambiar a la vista de chat cuando se selecciona una conversación
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    // Regresar a la lista de conversaciones en móvil
    setShowMobileChat(false);
  };

  return (
    <div className="h-screen bg-gray-100 flex">
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
