import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  getCachedConversationMessages, 
  clearConversationsCache,
  getCacheStats 
} from '../services/messagesService';
import { changeConversationMode, getRecentMessages, getRecentContacts, getNextContacts } from '../services/apiService';
import { formatContactForUI } from '../services/contactsService';

const MessagesContext = createContext();

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
};

export const MessagesProvider = ({ children }) => {
  // Estado para manejar mensajes de conversaciones
  const [conversationMessages, setConversationMessages] = useState({});
  const [loadingMessages, setLoadingMessages] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversationModes, setConversationModes] = useState({}); // Estado para modos de conversación
  
  // Estado para manejar contactos
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMoreContacts, setLoadingMoreContacts] = useState(false);

  const [probablyMoreContacts, setProbablyMoreContacts] = useState(false);
  
  // Estado para manejar la conversación seleccionada
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Referencias para manejar el polling
  const pollingIntervalRef = useRef(null);
  const POLLING_INTERVAL = 15000; // 15 segundos
  
  // Referencias para manejar el timeout de inactividad
  const inactivityTimeoutRef = useRef(null);
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos

  // Función para cargar contactos recientes
  const loadRecentContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const response = await getRecentContacts();
      if (response.success) {
        setProbablyMoreContacts(response.data.has_more);
        const formattedContacts = response.data.conversations.map(lead => formatContactForUI(lead, conversationMessages));
        setContacts(formattedContacts);
      } else {
        console.error('Error al cargar contactos:', response.error);
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error);
    } finally {
      setLoadingContacts(false);
    }
  // eslint-disable-next-line
  }, []); // Remover conversationMessages de las dependencias para evitar re-renders

  // Obtiene los contactos siguientes a partir de los IDs de las conversaciones actuales
  // Se deben pasar los IDs de las conversaciones actuales y se obtiene hasta 10 conversaciones más
  const loadNextContacts = useCallback(async () => {
    setLoadingMoreContacts(true);
    try {
      const response = await getNextContacts(contacts.map(contact => contact.id));
      if (response.success) {
        setProbablyMoreContacts(response.data.has_more);
        const formattedContacts = response.data.conversations.map(lead => formatContactForUI(lead, conversationMessages));
        // Append the formatted contacts to the existing contacts
        setContacts(prev => [...prev, ...formattedContacts]);
      }
    } catch (error) {
      console.error('Error al cargar más contactos:', error);
      setProbablyMoreContacts(false);
    } finally {
      setLoadingMoreContacts(false);
    }
  }, [contacts, conversationMessages]);

  /**
   * Carga los mensajes de una conversación específica
   * @param {string} conversationId - ID de la conversación
   * @param {boolean} forceRefresh - Forzar recarga desde backend
   */
  const loadConversationMessages = useCallback(async (conversationId, forceRefresh = false) => {
    if (!conversationId) return;

    console.log(`📱 Cargando mensajes para conversación: ${conversationId}`);
    
    // Marcar como cargando
    setLoadingMessages(prev => ({ ...prev, [conversationId]: true }));

    try {
      const result = await getCachedConversationMessages(conversationId, forceRefresh);
      
      if (result.success) {
        setConversationMessages(prev => ({
          ...prev,
          [conversationId]: result.messages
        }));
        
        // Si hay información del modo de conversación, actualizarla
        if (result.conversationMode) {
          setConversationModes(prev => ({
            ...prev,
            [conversationId]: result.conversationMode
          }));
        }
        
        // Limpiar cualquier error previo
        setErrorMessages(prev => {
          const newState = { ...prev };
          delete newState[conversationId];
          return newState;
        });
        
        if (result.fromCache) {
          console.log(`💾 Mensajes cargados desde caché para: ${conversationId}`);
        } else {
          console.log(`🌐 Mensajes cargados desde backend para: ${conversationId}`);

          // Actualizar datos del contacto con información del backend
          if (result.name || result.phone || result.completed !== undefined) {

            setContacts(prev => prev.map(contact => {
              if (contact.id === conversationId) {
                const updatedConversation = formatContactForUI(
                  {
                    ...contact.originalData,
                    state: {
                      nombre: result.name,
                      telefono: result.phone,
                      completed: result.completed,
                    },
                    conversation_mode: result.conversationMode,
                    updated_at: result.updated_at
                  },
                  {
                    ...conversationMessages,
                    [conversationId]: result.messages
                  }
                );
                setSelectedConversation(updatedConversation);
                return updatedConversation;
              }
              return contact;
            }));

            // setSelectedConversation(updatedConversation);
            console.log(`📝 Contacto ${conversationId} actualizado con datos del backend`);
          }
        }
      } else {
        // Marcar como error para evitar intentos futuros
        setErrorMessages(prev => ({
          ...prev,
          [conversationId]: result.error || 'Error al cargar mensajes'
        }));
        
        // Si es un error previo, no mostrar el log repetidamente
        if (!result.previouslyFailed) {
          console.error(`❌ Error al cargar mensajes para ${conversationId}:`, result.error);
        }
        
        // Asegurar que haya un array vacío para esta conversación
        setConversationMessages(prev => ({
          ...prev,
          [conversationId]: []
        }));
      }
    } catch (error) {
      console.error(`❌ Error inesperado al cargar mensajes:`, error);
      setErrorMessages(prev => ({
        ...prev,
        [conversationId]: 'Error inesperado'
      }));
      setConversationMessages(prev => ({
        ...prev,
        [conversationId]: []
      }));
    } finally {
      // Quitar indicador de carga
      setLoadingMessages(prev => ({ ...prev, [conversationId]: false }));
    }
  }, [conversationMessages]);

  /**
   * Formatea un mensaje para mostrar correctamente en la UI
   * @param {Object} message - Mensaje del backend
   * @returns {Object} - Mensaje formateado
   */
  const formatMessageForUI = useCallback((message) => {
    const timestamp = new Date(message.timestamp);
    return {
      ...message,
      timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messageDate: timestamp.toLocaleDateString()
    };
  }, []);

  const selectConversation = useCallback((conversation) => {
    setSelectedConversation(conversation);
  }, []);

  /**
   * Actualiza los mensajes de una conversación con nuevos mensajes con polling
   * @param {string} conversationId - ID de la conversación
   * @param {Array} newMessages - Array de mensajes nuevos del backend
   */
  const updateConversationWithNewMessages = useCallback((conversationId, newMessages) => {
    if (!conversationId || !Array.isArray(newMessages)) {
      console.error('❌ Parámetros inválidos para updateConversationWithNewMessages:', { conversationId, newMessages });
      return;
    }

    console.log(`🔄 Actualizando conversación ${conversationId} con ${newMessages.length} mensajes nuevos`);

    setConversationMessages(prev => {
      const currentMessages = prev[conversationId] || [];
      
      // Combinar mensajes existentes con nuevos, evitando duplicados
      const existingIds = new Set(currentMessages.map(msg => msg.id));
      const uniqueNewMessages = newMessages
        .filter(msg => !existingIds.has(msg.id))
        .map(msg => formatMessageForUI(msg)); // Formatear cada mensaje nuevo

      return {
        ...prev,
        [conversationId]: [...currentMessages, ...uniqueNewMessages]
      };
    });
  }, [formatMessageForUI]);

  /**
   * Realiza polling para obtener mensajes nuevos de una conversación
   * @param {string} conversationId - ID de la conversación
   */
  const pollForNewMessages = useCallback(async (conversationId) => {
    if (!conversationId || contacts.length === 0) return;

    const waId = conversationId.replace('conv_', '');
    
    // Usar setConversationMessages para acceder al estado actual
    let shouldContinuePolling = false;
    let lastMessageId = null;
    
    setConversationMessages(currentState => {
      const currentMessages = currentState[conversationId] || [];
      
      // No hacer polling si no hay mensajes cargados aún
      if (currentMessages.length === 0) {
        console.log(`📡 Polling omitido para ${conversationId} - no hay mensajes cargados aún`);
        return currentState; // No cambiar el estado
      }
      
      shouldContinuePolling = true;
      lastMessageId = currentMessages[currentMessages.length - 1].id;
      return currentState; // No cambiar el estado
    });
    
    if (!shouldContinuePolling) return;

    try {
      console.log(`📡 Polling: ejecutando polling para ${conversationId}`);
      const result = await getRecentMessages(waId, lastMessageId);

      const newMessages = result.data.messages;
      
      if (result.success && newMessages && newMessages.length > 0) {
        console.log(`📡 Polling: ${result.data.messages.length} mensajes nuevos para ${conversationId}`);
        
        // Actualizar mensajes usando la función existente
        updateConversationWithNewMessages(conversationId, newMessages);

        // Actualizar datos del contacto con nuevos mensajes y datos del estado
        setContacts(prev => prev.map(contact => {
          if (contact.id === conversationId) {
            const updatedContact = formatContactForUI(
              {
                ...contact.originalData,
                state: {
                  ...result.data.lead_info, // Pasa los valores de nombre y teléfono del lead
                  completed: result.data.completed,
                },
                conversation_mode: result.data.conversation_mode,
                updated_at: result.data.updated_at
              },
              {
                ...conversationMessages,
                [conversationId]: [...(conversationMessages[conversationId] || []), ...newMessages]
              }
            );
            setSelectedConversation(updatedContact);
            return updatedContact;
          }
          return contact;
        }));
        
        // Actualizar modo de conversación si cambió
        if (result.data.conversation_mode) {
          const currentMode = conversationModes[conversationId];
          if (currentMode !== result.data.conversation_mode) {
            setConversationModes(prev => ({
              ...prev,
              [conversationId]: result.data.conversation_mode
            }));
          }
        }
      } else if (!result.success && result.error === 'Token expirado') {
        // Si el token expiró durante el polling, detener el polling sin recargar la página
        console.log('⏹️ Deteniendo polling - token expirado');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (error) {
      console.error(`❌ Error en polling para ${conversationId}:`, error);
      // No hacer nada más para evitar que el polling cause problemas
    }
  }, [conversationModes, updateConversationWithNewMessages, conversationMessages, contacts.length]);

  /**
   * Detiene el polling automáticamente después del timeout de inactividad
   */
  const stopPollingDueToInactivity = useCallback(() => {
    console.log('⏰ Deteniendo polling por inactividad del usuario (5 minutos)');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);
  
  /**
   * Reinicia el timeout de inactividad
   */
  const resetInactivityTimeout = useCallback(() => {
    // Limpiar timeout anterior
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    // Solo configurar timeout si hay polling activo
    if (pollingIntervalRef.current) {
      console.log('🔄 Reiniciando timeout de inactividad (5 minutos)');
      inactivityTimeoutRef.current = setTimeout(() => {
        stopPollingDueToInactivity();
      }, INACTIVITY_TIMEOUT);
    }
  }, [stopPollingDueToInactivity, INACTIVITY_TIMEOUT]);
  
  /**
   * Configura el sistema de polling para la conversación activa
   * @param {string} conversationId - ID de la conversación para hacer polling
   */
  const setupPolling = useCallback((conversationId) => {
    // Limpiar polling anterior
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Si no hay conversación activa, no hacer polling
    if (!conversationId) {
      console.log('⏹️ Deteniendo polling - no hay conversación activa');
      return;
    }

    console.log(`⏰ Iniciando polling cada ${POLLING_INTERVAL/1000}s para conversación: ${conversationId}`);
    
    // Configurar nuevo polling
    pollingIntervalRef.current = setInterval(() => {
      pollForNewMessages(conversationId);
    }, POLLING_INTERVAL);
    
    // Iniciar timeout de inactividad
    resetInactivityTimeout();
  }, [pollForNewMessages, resetInactivityTimeout]); // Depende de la función de polling y timeout
  
  /**
   * Marca actividad del usuario y reinicia el timeout
   */
  const markUserActivity = useCallback(() => {
    console.log('👤 Actividad del usuario detectada');
    
    // Si hay una conversación activa pero el polling está detenido, reactivarlo
    if (activeConversationId && !pollingIntervalRef.current) {
      console.log('🔄 Reactivando polling por actividad del usuario');
      setupPolling(activeConversationId);
    } else {
      // Solo reiniciar el timeout si el polling ya está activo
      resetInactivityTimeout();
    }
  }, [activeConversationId, setupPolling, resetInactivityTimeout]);
  
  /**
   * Verifica mensajes recientes al abrir una conversación que ya está en caché
   * @param {string} conversationId - ID de la conversación
   */
  const checkForRecentMessagesOnOpen = useCallback(async (conversationId) => {
    if (!conversationId || !conversationMessages[conversationId]) return;

    const waId = conversationId.replace('conv_', '');
    const currentMessages = conversationMessages[conversationId] || [];
    
    // Si no hay mensajes cargados, no hacer nada
    if (currentMessages.length === 0) {
      console.log(`📡 Verificación omitida para ${conversationId} - no hay mensajes cargados`);
      return;
    }

    const lastMessageId = currentMessages[currentMessages.length - 1].id;

    try {
      console.log(`📡 Verificando mensajes recientes al abrir conversación: ${conversationId}`);
      const result = await getRecentMessages(waId, lastMessageId);

      const newMessages = result.data.messages;
      
      if (result.success && newMessages && newMessages.length > 0) {
        console.log(`📡 Conversación abierta: ${result.data.messages.length} mensajes nuevos para ${conversationId}`);
        
        // Actualizar mensajes usando la función existente
        updateConversationWithNewMessages(conversationId, newMessages);

        // Actualizar datos del contacto con nuevos mensajes y datos del estado
        setContacts(prev => prev.map(contact => {
          if (contact.id === conversationId) {
            const updatedContact = formatContactForUI(
              {
                ...contact.originalData,
                state: {
                  ...result.data.lead_info, // Pasa los valores de nombre y teléfono del lead
                  completed: result.data.completed,
                },
                conversation_mode: result.data.conversation_mode,
                updated_at: result.data.updated_at
              },
              {
                ...conversationMessages,
                [conversationId]: [...(conversationMessages[conversationId] || []), ...newMessages]
              }
            );
            setSelectedConversation(updatedContact);
            return updatedContact;
          }
          return contact;
        }));
        
        // Actualizar modo de conversación si cambió
        if (result.data.conversation_mode) {
          const currentMode = conversationModes[conversationId];
          if (currentMode !== result.data.conversation_mode) {
            setConversationModes(prev => ({
              ...prev,
              [conversationId]: result.data.conversation_mode
            }));
          }
        }
      } else if (result.success) {
        console.log(`📡 Conversación abierta: no hay mensajes nuevos para ${conversationId}`);
      }
    } catch (error) {
      console.error(`❌ Error al verificar mensajes recientes para ${conversationId}:`, error);
      // No hacer nada más para evitar que cause problemas
    }
  }, [conversationMessages, updateConversationWithNewMessages, conversationModes]);

  /**
   * Establece la conversación activa y maneja el polling
   * @param {string} conversationId - ID de la conversación activa
   * @param {Object} conversationData - Datos completos de la conversación (opcional)
   */
  const setActiveConversation = useCallback(async (conversationId, conversationData = null) => {
    console.log(`🎯 Estableciendo conversación activa: ${conversationId}`);
    
    // Actualizar conversación activa
    setActiveConversationId(conversationId);
    
    // Si se proporcionan datos de la conversación, inicializar el modo solo si no existe
    if (conversationData && conversationData.conversationMode) {
      const currentMode = conversationModes[conversationId];
      // Solo actualizar si no existe el modo actual (primera carga)
      if (!currentMode) {
        console.log(`🔧 Inicializando modo desde datos de conversación: ${conversationId} -> ${conversationData.conversationMode}`);
        setConversationModes(prev => ({
          ...prev,
          [conversationId]: conversationData.conversationMode
        }));
      }
    }
    
    // Cargar mensajes si no los tenemos y no han fallado previamente
    if (conversationId && !conversationMessages[conversationId] && !errorMessages[conversationId]) {
      await loadConversationMessages(conversationId);
      // Configurar polling después de cargar los mensajes
      setupPolling(conversationId);
    } else if (conversationId && conversationMessages[conversationId]) {
      // Si ya hay mensajes en caché, obtener mensajes recientes antes de configurar polling
      await checkForRecentMessagesOnOpen(conversationId);
      // Configurar polling después de verificar mensajes recientes
      setupPolling(conversationId);
    } else {
      // Si ya hay mensajes, configurar polling inmediatamente
      setupPolling(conversationId);
    }
  // eslint-disable-next-line
  }, [conversationMessages, errorMessages, loadConversationMessages, setupPolling, checkForRecentMessagesOnOpen]); // Incluir dependencias necesarias

  /**
   * Cambia el modo de conversación (bot/agente)
   * @param {string} conversationId - ID de la conversación
   * @param {string} mode - Nuevo modo ('bot' o 'agente')
   */
  const setConversationMode = useCallback(async (conversationId, mode) => {
    if (!conversationId || (mode !== 'bot' && mode !== 'agente')) {
      console.error('❌ Parámetros inválidos para setConversationMode:', { conversationId, mode });
      return { success: false, error: 'Parámetros inválidos' };
    }
    
    console.log(`🔄 Cambiando modo de conversación ${conversationId} a: ${mode}`);
    
    // Extraer wa_id del conversationId (remover prefijo 'conv_' si existe)
    const waId = conversationId.replace('conv_', '');
    
    try {
      const result = await changeConversationMode(waId, mode);
      
      if (result.success) {
        // Solo actualizar el estado local si la llamada al backend fue exitosa
        setConversationModes(prev => ({
          ...prev,
          [conversationId]: mode
        }));

        // Actualizar datos del contacto con el nuevo modo
        setContacts(prev => prev.map(contact => {
          if (contact.id === conversationId) {
            return { ...contact, conversationMode: mode };
          }
          return contact;
        }));

        // Actualizar la conversación seleccionada con el nuevo modo
        setSelectedConversation(prev => ({ ...prev, conversationMode: mode }));
        
        console.log(`✅ Modo cambiado exitosamente a: ${mode}`);
        return { success: true, data: result.data };
      } else {
        console.error(`❌ Error al cambiar modo: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`❌ Error inesperado al cambiar modo:`, error);
      return { success: false, error: 'Error inesperado al cambiar modo' };
    }
  }, []); // Sin dependencias ya que solo usa setters estables

  /**
   * Obtiene el modo actual de una conversación
   * @param {string} conversationId - ID de la conversación
   * @returns {string} - 'bot' o 'agente'
   */
  const getConversationMode = useCallback((conversationId) => {
    return conversationModes[conversationId] || 'bot'; // Por defecto en modo bot
  }, [conversationModes]); // Depende del estado de modos

  /**
   * Agrega un mensaje local a una conversación
   * @param {string} conversationId - ID de la conversación
   * @param {Object} message - Objeto del mensaje con text, sender, etc.
   */
  const addMessageToConversation = useCallback((conversationId, message) => {
    if (!conversationId || !message) {
      console.error('❌ Parámetros inválidos para addMessageToConversation:', { conversationId, message });
      return;
    }

    console.log(`📝 Agregando mensaje local a conversación ${conversationId}:`, message);

    setConversationMessages(prev => ({
      ...prev,
      [conversationId]: [
        ...(prev[conversationId] || []),
        message
      ]
    }));
  }, []); // Sin dependencias ya que usa solo setters estables

  /**
   * Limpia todos los datos al hacer logout
   */
  const clearAllMessages = useCallback(() => {
    console.log('🧹 Limpiando todos los mensajes y caché');
    
    // Detener polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Detener timeout de inactividad
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    
    // Limpiar estado local
    setConversationMessages({});
    setLoadingMessages({});
    setErrorMessages({});
    setActiveConversationId(null);
    setConversationModes({});
    setContacts([]); // Limpiar contactos también
    
    // Limpiar caché del servicio
    clearConversationsCache();
  }, []); // Sin dependencias ya que usa refs y setters estables

  /**
   * Obtiene estadísticas de caché para debugging
   */
  const getDebugInfo = () => {
    const cacheStats = getCacheStats();
    return {
      ...cacheStats,
      localConversations: Object.keys(conversationMessages),
      activeConversation: activeConversationId,
      pollingActive: !!pollingIntervalRef.current
    };
  };

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  const value = {
    // Estado
    conversationMessages,
    loadingMessages,
    errorMessages,
    activeConversationId,
    conversationModes,
    contacts,
    loadingContacts,
    loadingMoreContacts,
    selectedConversation,
    probablyMoreContacts,
    // Acciones
    loadConversationMessages,
    setActiveConversation,
    setConversationMode,
    getConversationMode,
    addMessageToConversation,
    updateConversationWithNewMessages,
    pollForNewMessages,
    clearAllMessages,
    loadRecentContacts,
    selectConversation,
    loadNextContacts,
    markUserActivity,
    // Utilidades
    getDebugInfo
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
};
