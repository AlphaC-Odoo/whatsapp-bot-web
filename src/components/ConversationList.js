import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../contexts/MessagesContext';
import { formatContactForUI } from '../services/apiService';

const ConversationList = ({ onSelectConversation, selectedConversation }) => {
  const { contacts, loadingContacts, logout } = useAuth();
  const { conversationMessages } = useMessages();
  const [searchTerm, setSearchTerm] = useState('');

  // Actualizar contactos con los últimos mensajes reales cuando están disponibles
  const contactsWithUpdatedMessages = useMemo(() => {
    return contacts.map(contact => {
      // Re-formatear el contacto con los mensajes actuales
      const updatedContact = formatContactForUI(contact.originalData, conversationMessages);
      // Mantener propiedades que no se actualizan
      return {
        ...contact,
        lastMessage: updatedContact.lastMessage
      };
    });
  }, [contacts, conversationMessages]);

  // Filtrar contactos basado en el término de búsqueda
  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contactsWithUpdatedMessages;
    
    return contactsWithUpdatedMessages.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm)
    );
  }, [contactsWithUpdatedMessages, searchTerm]);

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header - Fixed */}
      <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800">Conversaciones</h2>
        <button
          onClick={logout}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-200 transition-colors"
          title="Cerrar sesión"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
      
      {/* Search bar - Fixed */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar lead..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Conversations list - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loadingContacts ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <span className="ml-2 text-gray-600">Cargando contactos...</span>
          </div>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onSelectConversation(contact)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversation?.id === contact.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  {contact.avatar}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {contact.name}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {contact.timestamp}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm text-gray-600 truncate">
                      {contact.lastMessage}
                    </p>
                  </div>
                  {/* Indicator de estado */}
                  <div className="flex items-center mt-1 space-x-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      contact.status === 'active' ? 'bg-green-400' : 
                      contact.status === 'paused' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></span>
                    <span className="text-xs text-gray-500">
                      {contact.conversationMode === 'bot' ? '🤖 Bot' : '👤 Humano'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center p-8 text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones disponibles'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
