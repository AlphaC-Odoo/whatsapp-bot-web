import messagesData from '../testData/messages.json';

// Cache en memoria para almacenar conversaciones ya cargadas
// En producción, esto podría ser reemplazado por un sistema de cache más sofisticado
let conversationsCache = new Map();

// Cache para conversaciones que han fallado al cargar (evitar reintentos infinitos)
let failedConversationsCache = new Set();

/**
 * IMPORTANTE: Este JSON contiene TODAS las conversaciones para simular el backend.
 * En producción, cada request debería devolver únicamente UNA conversación específica.
 * Este enfoque global es solo para efectos de demostración y testing.
 */

/**
 * Simula una llamada al backend para obtener los mensajes de una conversación específica
 * @param {string} conversationId - ID de la conversación
 * @returns {Promise} - Promesa que resuelve con los mensajes de la conversación
 */
export const getConversationMessages = async (conversationId) => {
  try {
    console.log(`📡 Simulando request al backend para conversación: ${conversationId}`);
    
    // Simular delay de red (200-800ms)
    const delay = Math.random() * 600 + 200;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // NOTA: En producción, esto sería algo como:
    // const response = await fetch(`/api/conversations/${conversationId}/messages`);
    // const data = await response.json();
    
    // Buscar la conversación en el JSON global (solo para simulación)
    const conversationData = messagesData.find(
      conv => conv.conversation_id === conversationId
    );
    
    if (!conversationData) {
      throw new Error(`Conversación ${conversationId} no encontrada`);
    }
    
    // Formatear mensajes para la UI
    const formattedMessages = conversationData.messages.map(formatMessageForUI);
    
    console.log(`✅ Mensajes cargados para conversación ${conversationId}:`, formattedMessages.length);
    
    return {
      success: true,
      conversationId,
      messages: formattedMessages,
      totalMessages: formattedMessages.length
    };
    
  } catch (error) {
    console.error(`❌ Error al cargar mensajes para conversación ${conversationId}:`, error);
    return {
      success: false,
      error: error.message,
      conversationId
    };
  }
};

/**
 * Obtiene mensajes de una conversación, usando caché si ya están cargados
 * @param {string} conversationId - ID de la conversación
 * @param {boolean} forceRefresh - Forzar recarga desde el backend
 * @returns {Promise} - Mensajes de la conversación
 */
export const getCachedConversationMessages = async (conversationId, forceRefresh = false) => {
  // Verificar si esta conversación ya falló anteriormente (evitar reintentos infinitos)
  if (!forceRefresh && failedConversationsCache.has(conversationId)) {
    console.log(`⚠️ Conversación ${conversationId} falló previamente, evitando reintento`);
    return {
      success: false,
      conversationId,
      messages: [],
      error: 'Conversación no disponible',
      fromCache: true,
      previouslyFailed: true
    };
  }
  
  // Verificar si ya tenemos la conversación en caché
  if (!forceRefresh && conversationsCache.has(conversationId)) {
    console.log(`💾 Usando caché para conversación: ${conversationId}`);
    return {
      success: true,
      conversationId,
      messages: conversationsCache.get(conversationId),
      fromCache: true
    };
  }
  
  // Si no está en caché o se fuerza la recarga, obtener del "backend"
  const result = await getConversationMessages(conversationId);
  
  // Si la carga fue exitosa, guardar en caché
  if (result.success) {
    conversationsCache.set(conversationId, result.messages);
    console.log(`💾 Conversación ${conversationId} guardada en caché`);
  } else {
    // Si falló, marcarla como fallida para evitar reintentos
    failedConversationsCache.add(conversationId);
    console.log(`💀 Conversación ${conversationId} marcada como fallida`);
  }
  
  return result;
};

/**
 * Simula el polling para verificar nuevos mensajes en una conversación activa
 * @param {string} conversationId - ID de la conversación activa
 */
export const pollConversationUpdates = (conversationId) => {
  console.log(`🔄 [POLLING] Verificando actualizaciones para conversación: ${conversationId}`);
  
  // NOTA: En producción, esto haría una llamada al backend para verificar:
  // - Nuevos mensajes
  // - Cambios en el estado de entrega/lectura
  // - Actualizaciones del estado de la conversación
  
  // Por ahora solo mostramos el log para verificar que el polling funciona
  // En el futuro, aquí se podría hacer:
  // return fetch(`/api/conversations/${conversationId}/updates?since=${lastUpdateTimestamp}`)
};

/**
 * Formatea un mensaje del backend para mostrar en la UI
 * @param {Object} message - Mensaje raw del backend
 * @returns {Object} - Mensaje formateado para la UI
 */
const formatMessageForUI = (message) => {
  const getSenderType = (sender) => {
    if (sender === 'lead') return 'contact';
    if (sender === 'bot') return 'bot';
    if (sender.startsWith('asesor_')) return 'human_agent';
    return 'contact';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const formatMessageText = (text, sender) => {
    // Agregar emoji según el tipo de remitente
    if (sender === 'bot') {
      return `🤖 ${text}`;
    } else if (sender.startsWith('asesor_')) {
      return `👤 ${text}`;
    }
    // Para mensajes del lead (cliente), no agregar emoji
    return text;
  };



  return {
    id: message.id,
    text: formatMessageText(message.text, message.sender),
    sender: getSenderType(message.sender),
    messageDate: formatMessageDate(message.timestamp),
    timestamp: formatTimestamp(message.timestamp),
    originalTimestamp: message.timestamp,
    originalSender: message.sender // Mantener sender original para referencia
  };
};

/**
 * Limpia el caché de conversaciones (útil al hacer logout)
 */
export const clearConversationsCache = () => {
  console.log('🗑️ Limpiando caché de conversaciones');
  conversationsCache.clear();
  failedConversationsCache.clear();
};

/**
 * Obtiene estadísticas del caché (para debugging)
 */
export const getCacheStats = () => {
  return {
    totalCachedConversations: conversationsCache.size,
    cachedConversationIds: Array.from(conversationsCache.keys()),
    totalFailedConversations: failedConversationsCache.size,
    failedConversationIds: Array.from(failedConversationsCache)
  };
};
