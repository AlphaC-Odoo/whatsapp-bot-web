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
  
  // Estado para manejar notificaciones de contactos
  const [contactNotifications, setContactNotifications] = useState({});

  // Referencias para manejar el polling
  const pollingIntervalRef = useRef(null);
  const POLLING_INTERVAL = 15000; // 15 segundos
  
  // Referencias para manejar el polling de contactos
  const contactsPollingIntervalRef = useRef(null);
  const CONTACTS_POLLING_INTERVAL = 60 * 1000; // 1 minuto
  
  // Referencias para manejar el timeout de inactividad de contactos
  const contactsInactivityTimeoutRef = useRef(null);
  const CONTACTS_INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos
  
  // Referencias para manejar el timeout de inactividad de mensajes
  const inactivityTimeoutRef = useRef(null);
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos

  // Función auxiliar para ordenar contactos por updated_at
  const sortContactsByUpdatedAt = useCallback((contacts) => {
    return contacts.sort((a, b) => {
      const updatedAtA = a.originalData?.updated_at;
      const updatedAtB = b.originalData?.updated_at;
      
      // Si ambos tienen updated_at, ordenar por fecha descendente (más reciente primero)
      if (updatedAtA && updatedAtB) {
        return new Date(updatedAtB) - new Date(updatedAtA);
      }
      
      // Si solo uno tiene updated_at, ponerlo primero
      if (updatedAtA && !updatedAtB) return -1;
      if (!updatedAtA && updatedAtB) return 1;
      
      // Si ninguno tiene updated_at, mantener orden original
      return 0;
    });
  }, []);

  /**
   * Polling para obtener las 10 conversaciones más recientes y compararlas con las actuales
   */
  const pollForRecentContacts = useCallback(async () => {
    try {
      console.log('📡 Polling de contactos: obteniendo conversaciones más recientes');
      const response = await getRecentContacts();
      
      if (response.success && response.data.conversations) {
        const newContacts = response.data.conversations.map(lead => formatContactForUI(lead, conversationMessages));
        
        setContacts(prev => {
          // Crear un mapa de contactos actuales por ID para comparación rápida
          const currentContactsMap = new Map(prev.map(contact => [contact.id, contact]));
          
          // Crear un mapa de nuevos contactos por ID
          const newContactsMap = new Map(newContacts.map(contact => [contact.id, contact]));
          
          // Identificar contactos nuevos (que no están en la lista actual)
          const newContactIds = newContacts.filter(contact => !currentContactsMap.has(contact.id));
          
          // Identificar contactos con updated_at cambiado
          const updatedContacts = [];
          prev.forEach(currentContact => {
            const newContact = newContactsMap.get(currentContact.id);
            if (newContact && currentContact.originalData?.updated_at !== newContact.originalData?.updated_at) {
              console.log("DADU: Updated contact: ", newContact.id);
              console.log("DADU: Current contact updated_at: ", currentContact.originalData?.updated_at);
              console.log("DADU: New contact updated_at: ", newContact.originalData?.updated_at);

              // Solo agregar el contacto a la lista de contactos actualizados si la diferencia entre el updated_at del contacto actual y el nuevo es mayor a 2 segundos
              // Los contactos con updated_at menor a 2 segundos son mensajes de un agente humano, no se deben mostrar notificaciones
              if (Math.abs(new Date(newContact.originalData?.updated_at) - new Date(currentContact.originalData?.updated_at)) > 2000) {
                updatedContacts.push(newContact.id);
              } else {
                console.log("DADU: Contacto con updated_at menor a 2 segundos, no se debe mostrar notificación");
              }
            }
          });
          
          // Mostrar notificaciones
          if (newContactIds.length > 0) {
            console.log(`🆕 Polling de contactos: ${newContactIds.length} nuevas conversaciones encontradas`);
            // Agregar notificaciones para nuevos contactos
            setContactNotifications(prevNotifications => {
              const newNotifications = { ...prevNotifications };
              newContactIds.forEach(contact => {
                newNotifications[contact.id] = {
                  type: 'new_contact',
                  timestamp: Date.now()
                };
              });
              return newNotifications;
            });
          }
          
          if (updatedContacts.length > 0) {
            console.log(`🔄 Polling de contactos: ${updatedContacts.length} conversaciones con updated_at cambiado`);
            // Agregar notificaciones para contactos actualizados
            setContactNotifications(prevNotifications => {
              const newNotifications = { ...prevNotifications };
              updatedContacts.forEach(contactId => {
                newNotifications[contactId] = {
                  type: 'updated_contact',
                  timestamp: Date.now()
                };
              });
              return newNotifications;
            });
          }
          
          // Mantener el orden del endpoint: usar los nuevos contactos como base
          // y agregar los contactos existentes que no están en los nuevos
          const finalContacts = [...newContacts];
          
          // Agregar contactos existentes que no están en la respuesta del endpoint
          prev.forEach(contact => {
            if (!newContactsMap.has(contact.id)) {
              finalContacts.push(contact);
            }
          });
          
          return finalContacts;
        });
        
        // Actualizar el estado de si hay más contactos
        setProbablyMoreContacts(response.data.has_more);
        
      } else if (!response.success && response.error === 'Token expirado') {
        console.log('⏹️ Deteniendo polling de contactos - token expirado');
        if (contactsPollingIntervalRef.current) {
          clearInterval(contactsPollingIntervalRef.current);
          contactsPollingIntervalRef.current = null;
        }
      }
    } catch (error) {
      console.error('❌ Error en polling de contactos:', error);
      // No hacer nada más para evitar que el polling cause problemas
    }
  }, [conversationMessages]);

  /**
   * Detiene el polling de contactos automáticamente después del timeout de inactividad
   */
  const stopContactsPollingDueToInactivity = useCallback(() => {
    console.log('⏰ Deteniendo polling de contactos por inactividad del usuario (10 minutos)');
    if (contactsPollingIntervalRef.current) {
      clearInterval(contactsPollingIntervalRef.current);
      contactsPollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Reinicia el timeout de inactividad de contactos
   */
  const resetContactsInactivityTimeout = useCallback(() => {
    // Limpiar timeout anterior
    if (contactsInactivityTimeoutRef.current) {
      clearTimeout(contactsInactivityTimeoutRef.current);
    }
    
    // Solo configurar timeout si hay polling de contactos activo
    if (contactsPollingIntervalRef.current) {
      console.log('🔄 Reiniciando timeout de inactividad de contactos (10 minutos)');
      contactsInactivityTimeoutRef.current = setTimeout(() => {
        stopContactsPollingDueToInactivity();
      }, CONTACTS_INACTIVITY_TIMEOUT);
    }
  }, [stopContactsPollingDueToInactivity, CONTACTS_INACTIVITY_TIMEOUT]);

  /**
   * Inicia el polling de contactos
   */
  const startContactsPolling = useCallback(() => {
    // Limpiar polling anterior
    if (contactsPollingIntervalRef.current) {
      clearInterval(contactsPollingIntervalRef.current);
      contactsPollingIntervalRef.current = null;
    }

    console.log(`⏰ Iniciando polling de contactos cada ${CONTACTS_POLLING_INTERVAL/1000}s`);
    
    // Configurar nuevo polling
    contactsPollingIntervalRef.current = setInterval(() => {
      pollForRecentContacts();
    }, CONTACTS_POLLING_INTERVAL);
    
    // Iniciar timeout de inactividad
    resetContactsInactivityTimeout();
  }, [pollForRecentContacts, CONTACTS_POLLING_INTERVAL, resetContactsInactivityTimeout]);

  /**
   * Detiene el polling de contactos
   */
  const stopContactsPolling = useCallback(() => {
    console.log('⏹️ Deteniendo polling de contactos');
    if (contactsPollingIntervalRef.current) {
      clearInterval(contactsPollingIntervalRef.current);
      contactsPollingIntervalRef.current = null;
    }
  }, []);

  // Función para cargar contactos recientes
  const loadRecentContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const response = await getRecentContacts();
      if (response.success) {
        setProbablyMoreContacts(response.data.has_more);
        const formattedContacts = response.data.conversations.map(lead => formatContactForUI(lead, conversationMessages));
        setContacts(formattedContacts);
        
        // Iniciar polling de contactos después de cargar los contactos iniciales
        startContactsPolling();
      } else {
        console.error('Error al cargar contactos:', response.error);
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error);
    } finally {
      setLoadingContacts(false);
    }
  // eslint-disable-next-line
  }, [startContactsPolling]); // Agregar startContactsPolling como dependencia

  // Obtiene los contactos siguientes a partir de los IDs de las conversaciones actuales
  // Se deben pasar los IDs de las conversaciones actuales y se obtiene hasta 10 conversaciones más
  const loadNextContacts = useCallback(async () => {
    setLoadingMoreContacts(true);
    try {
      const response = await getNextContacts(contacts.map(contact => contact.id));
      if (response.success) {
        setProbablyMoreContacts(response.data.has_more);
        const formattedContacts = response.data.conversations.map(lead => formatContactForUI(lead, conversationMessages));
        // Append the formatted contacts to the existing contacts and reorder
        setContacts(prev => sortContactsByUpdatedAt([...prev, ...formattedContacts]));
      }
    } catch (error) {
      console.error('Error al cargar más contactos:', error);
      setProbablyMoreContacts(false);
    } finally {
      setLoadingMoreContacts(false);
    }
  }, [contacts, conversationMessages, sortContactsByUpdatedAt]);

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

            setContacts(prev => {
              const updatedContacts = prev.map(contact => {
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
              });
              
              // Reordenar contactos por updated_at (más reciente primero)
              return sortContactsByUpdatedAt(updatedContacts);
            });

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
  }, [conversationMessages, sortContactsByUpdatedAt]);

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
    
    // Limpiar notificación cuando se selecciona una conversación
    if (conversation && contactNotifications[conversation.id]) {
      setContactNotifications(prev => {
        const newNotifications = { ...prev };
        delete newNotifications[conversation.id];
        return newNotifications;
      });
    }
  }, [contactNotifications]);

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
        setContacts(prev => {
          const updatedContacts = prev.map(contact => {
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
          });
          
          // Reordenar contactos por updated_at (más reciente primero)
          return sortContactsByUpdatedAt(updatedContacts);
        });
        
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
  }, [conversationModes, updateConversationWithNewMessages, conversationMessages, contacts.length, sortContactsByUpdatedAt]);

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
    
    // Si el polling de contactos está detenido, reactivarlo
    if (!contactsPollingIntervalRef.current) {
      console.log('🔄 Reactivando polling de contactos por actividad del usuario');
      startContactsPolling();
    } else {
      // Solo reiniciar el timeout si el polling de contactos ya está activo
      resetContactsInactivityTimeout();
    }
  }, [activeConversationId, setupPolling, resetInactivityTimeout, startContactsPolling, resetContactsInactivityTimeout]);
  
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
        setContacts(prev => {
          const updatedContacts = prev.map(contact => {
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
          });
          
          // Reordenar contactos por updated_at (más reciente primero)
          return sortContactsByUpdatedAt(updatedContacts);
        });
        
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
  }, [conversationMessages, updateConversationWithNewMessages, conversationModes, sortContactsByUpdatedAt]);

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

    // Agregar mensaje a la conversación
    setConversationMessages(prev => ({
      ...prev,
      [conversationId]: [
        ...(prev[conversationId] || []),
        message
      ]
    }));

    // Si el mensaje es enviado por un agente humano, actualizar updated_at y reordenar contactos
    if (message.sender === 'human_agent') {
      console.log(`🔄 Mensaje de agente detectado, actualizando updated_at para ${conversationId}`);
      
      // Obtener el timestamp sin milisegundos
      const currentTimestamp = new Date().toISOString().slice(0, -5) + 'Z';
      console.log("DADU: Message current timestamp: ", currentTimestamp);
      
      setContacts(prev => {
        const updatedContacts = prev.map(contact => {
          if (contact.id === conversationId) {
            const updatedContact = formatContactForUI(
              {
                ...contact.originalData,
                updated_at: currentTimestamp
              },
              {
                ...conversationMessages,
                [conversationId]: [...(conversationMessages[conversationId] || []), message]
              }
            );
            setSelectedConversation(updatedContact);
            return updatedContact;
          }
          return contact;
        });
        
        // Reordenar contactos por updated_at (más reciente primero)
        return sortContactsByUpdatedAt(updatedContacts);
      });
    }
  }, [conversationMessages, sortContactsByUpdatedAt]); // Agregar dependencias necesarias

  /**
   * Limpia todos los datos al hacer logout
   */
  const clearAllMessages = useCallback(() => {
    console.log('🧹 Limpiando todos los mensajes y caché');
    
    // Detener polling de mensajes
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Detener polling de contactos
    if (contactsPollingIntervalRef.current) {
      clearInterval(contactsPollingIntervalRef.current);
      contactsPollingIntervalRef.current = null;
    }
    
    // Detener timeout de inactividad de contactos
    if (contactsInactivityTimeoutRef.current) {
      clearTimeout(contactsInactivityTimeoutRef.current);
      contactsInactivityTimeoutRef.current = null;
    }
    
    // Detener timeout de inactividad de mensajes
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
    setContactNotifications({}); // Limpiar notificaciones
    
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
      pollingActive: !!pollingIntervalRef.current,
      contactsPollingActive: !!contactsPollingIntervalRef.current,
      totalContacts: contacts.length
    };
  };

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (contactsPollingIntervalRef.current) {
        clearInterval(contactsPollingIntervalRef.current);
      }
      if (contactsInactivityTimeoutRef.current) {
        clearTimeout(contactsInactivityTimeoutRef.current);
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
    contactNotifications,
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
    // Polling de contactos
    startContactsPolling,
    stopContactsPolling,
    pollForRecentContacts,
    resetContactsInactivityTimeout,
    stopContactsPollingDueToInactivity,
    // Utilidades
    getDebugInfo
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
};
