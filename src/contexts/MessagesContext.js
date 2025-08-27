import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  getCachedConversationMessages, 
  pollConversationUpdates, 
  clearConversationsCache,
  getCacheStats 
} from '../services/messagesService';

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
  
  // Referencias para manejar el polling
  const pollingIntervalRef = useRef(null);
  const POLLING_INTERVAL = 15000; // 15 segundos

  /**
   * Carga los mensajes de una conversación específica
   * @param {string} conversationId - ID de la conversación
   * @param {boolean} forceRefresh - Forzar recarga desde backend
   */
  const loadConversationMessages = async (conversationId, forceRefresh = false) => {
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
  };

  /**
   * Establece la conversación activa y maneja el polling
   * @param {string} conversationId - ID de la conversación activa
   */
  const setActiveConversation = async (conversationId) => {
    console.log(`🎯 Estableciendo conversación activa: ${conversationId}`);
    
    // Actualizar conversación activa
    setActiveConversationId(conversationId);
    
    // Cargar mensajes si no los tenemos y no han fallado previamente
    if (conversationId && !conversationMessages[conversationId] && !errorMessages[conversationId]) {
      await loadConversationMessages(conversationId);
    }
    
    // Reiniciar polling para la nueva conversación
    setupPolling(conversationId);
  };

  /**
   * Configura el sistema de polling para la conversación activa
   * @param {string} conversationId - ID de la conversación para hacer polling
   */
  const setupPolling = (conversationId) => {
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
      pollConversationUpdates(conversationId);
    }, POLLING_INTERVAL);
  };

  /**
   * Limpia todos los datos al hacer logout
   */
  const clearAllMessages = () => {
    console.log('🧹 Limpiando todos los mensajes y caché');
    
    // Detener polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Limpiar estado local
    setConversationMessages({});
    setLoadingMessages({});
    setErrorMessages({});
    setActiveConversationId(null);
    
    // Limpiar caché del servicio
    clearConversationsCache();
  };

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
    };
  }, []);

  // Debug: mostrar estadísticas cada 30 segundos en desarrollo
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const debugInterval = setInterval(() => {
        const debugInfo = getDebugInfo();
        console.log('📊 [DEBUG] Estado del MessagesContext:', debugInfo);
      }, 30000);

      return () => clearInterval(debugInterval);
    }
  // eslint-disable-next-line
  }, []);

  const value = {
    // Estado
    conversationMessages,
    loadingMessages,
    errorMessages,
    activeConversationId,
    
    // Acciones
    loadConversationMessages,
    setActiveConversation,
    clearAllMessages,
    
    // Utilidades
    getDebugInfo
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
};
