// Función utilitaria para obtener headers de autenticación
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Función para manejar respuestas y detectar tokens expirados
const handleAuthResponse = async (response) => {
  if (response.status === 401) {
    // Token expirado o inválido, limpiar datos de autenticación
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('expires_in');
    
    // Recargar la página para forzar re-login
    window.location.reload();
    return null;
  }
  
  return response;
};

// Función para iniciar sesión usando el endpoint real
export const loginRequest = async (username, password) => {
  try {
    const endpoint = process.env.REACT_APP_LOGIN_ENDPOINT;
    
    if (!endpoint) {
      throw new Error('REACT_APP_LOGIN_ENDPOINT no está configurado');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, password })
    });

    return response;
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return {
      success: false,
      error: 'Error al iniciar sesión'
    };
  }
};

// Función para obtener contactos recientes desde el endpoint real
export const getRecentContacts = async () => {
  try {
    const endpoint = process.env.REACT_APP_GET_RECENT_LEADS_ENDPOINT;
    
    if (!endpoint) {
      console.warn('REACT_APP_GET_RECENT_LEADS_ENDPOINT no está configurado');
      return {
        success: false,
        error: 'Error al obtener contactos'
      };
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const authResponse = await handleAuthResponse(response);
    if (!authResponse) return { success: false, error: 'Token expirado' };

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('❌ Error al obtener contactos desde backend:', error);
    return {
      success: false,
      error: 'Error al obtener contactos'
    };
  }
};

// Función para obtener la conversación completa desde el endpoint real
export const getConversation = async (waId) => {
  try {
    const endpoint = process.env.REACT_APP_GET_CONVERSATION_ENDPOINT;
    
    if (!endpoint) {
      throw new Error('REACT_APP_GET_CONVERSATION_ENDPOINT no está configurado');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        wa_id: waId
      })
    });

    const authResponse = await handleAuthResponse(response);
    if (!authResponse) return { success: false, error: 'Token expirado' };

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error al obtener conversación:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener la conversación'
    };
  }
};

// Función para enviar mensaje del agente usando el endpoint real
export const sendAgentMessage = async (waId, message, multimedia = null, templateName = null) => {
  try {
    const endpoint = process.env.REACT_APP_SEND_AGENT_MESSAGE_ENDPOINT;
    
    if (!endpoint) {
      throw new Error('REACT_APP_SEND_AGENT_MESSAGE_ENDPOINT no está configurado');
    }

    let body = {
      wa_id: waId,
      message: message
    };

    if (multimedia) {
      body.multimedia = multimedia;
    }

    if (templateName) {
      body.template_name = templateName;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    const authResponse = await handleAuthResponse(response);
    if (!authResponse) return { success: false, error: 'Token expirado' };

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error al enviar mensaje del agente:', error);
    return {
      success: false,
      error: error.message || 'Error al enviar el mensaje'
    };
  }
};

// Función para cambiar el modo de conversación usando el endpoint real
export const changeConversationMode = async (waId, mode) => {
  try {
    const endpoint = process.env.REACT_APP_CONVERSATION_MODE_ENDPOINT;
    
    if (!endpoint) {
      throw new Error('REACT_APP_CONVERSATION_MODE_ENDPOINT no está configurado');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        wa_id: waId,
        mode: mode
      })
    });

    const authResponse = await handleAuthResponse(response);
    if (!authResponse) return { success: false, error: 'Token expirado' };

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error al cambiar modo de conversación:', error);
    return {
      success: false,
      error: error.message || 'Error al cambiar el modo de conversación'
    };
  }
};

// Función para obtener mensajes recientes usando el endpoint de polling
export const getRecentMessages = async (waId, lastMessageId = null) => {
  try {
    const endpoint = process.env.REACT_APP_GET_RECENT_MESSAGES_ENDPOINT;
    
    if (!endpoint) {
      throw new Error('REACT_APP_GET_RECENT_MESSAGES_ENDPOINT no está configurado');
    }

    const body = { wa_id: waId };
    if (lastMessageId) {
      body.last_message_id = lastMessageId;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    // Para polling, manejar errores de autenticación sin recargar la página
    if (response.status === 401) {
      return { success: false, error: 'Token expirado' };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error al obtener mensajes recientes:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener mensajes recientes'
    };
  }
};

// Función para obtener contactos siguientes a partir de los IDs de las conversaciones actuales
export const getNextContacts = async (currentConversationIds) => {
  try {
    const endpoint = process.env.REACT_APP_NEXT_CONVERSATIONS_ENDPOINT;

    if (!endpoint) {
      throw new Error('REACT_APP_NEXT_CONVERSATIONS_ENDPOINT no está configurado');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        conversation_ids: currentConversationIds
      })
    });

    const authResponse = await handleAuthResponse(response);
    if (!authResponse) return { success: false, error: 'Token expirado' };

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error al obtener contactos siguientes:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener contactos siguientes'
    };
  }
};

/**
 * Obtiene un archivo de audio desde el endpoint personalizado
 * @param {string} multimediaId - ID del archivo multimedia
 * @returns {Promise<Object>} - URL del archivo de audio para reproducción
 */
export const getWhatsAppAudio = async (multimediaId) => {
  try {
    const endpoint = process.env.REACT_APP_GET_MULTIMEDIA_ENDPOINT;
    
    if (!endpoint) {
      throw new Error('REACT_APP_GET_MULTIMEDIA_ENDPOINT no está configurado');
    }

    // Construir URL con el ID del multimedia como query parameter
    const url = `${endpoint}&id=${multimediaId}`;

    const token = localStorage.getItem('access_token');

    // Hacer una petición HEAD para verificar que el archivo existe y obtener metadatos
    const headResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      redirect: 'follow'
    });

    if (!headResponse.ok) {
      throw new Error(`HTTP ${headResponse.status}: ${headResponse.statusText}`);
    }

    // Obtener información del archivo desde los headers
    const contentType = headResponse.headers.get('content-type') || 'audio/ogg';
    const contentLength = headResponse.headers.get('content-length');
    
    // Verificar que sea un archivo de audio
    if (!contentType.startsWith('audio/')) {
      return {
        success: false,
        error: 'El archivo no es de tipo audio'
      };
    }

    return {
      success: true,
      data: {
        url: url, // URL directa para reproducción
        mimeType: contentType,
        fileSize: contentLength ? parseInt(contentLength) : null,
        duration: null // Se calculará cuando se cargue el audio
      }
    };
  } catch (error) {
    console.error('Error al obtener archivo de audio:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener archivo de audio'
    };
  }
};

/**
 * Obtiene una imagen desde el endpoint personalizado
 * @param {string} multimediaId - ID del archivo multimedia
 * @returns {Promise<Object>} - URL de la imagen para visualización
 */
export const getWhatsAppImage = async (multimediaId) => {
  try {
    const endpoint = process.env.REACT_APP_GET_MULTIMEDIA_ENDPOINT;
    
    if (!endpoint) {
      throw new Error('REACT_APP_GET_MULTIMEDIA_ENDPOINT no está configurado');
    }

    // Construir URL con el ID del multimedia como query parameter
    const url = `${endpoint}&id=${multimediaId}`;

    const token = localStorage.getItem('access_token');

    // Hacer una petición HEAD para verificar que el archivo existe y obtener metadatos
    const headResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      redirect: 'follow'
    });

    if (!headResponse.ok) {
      throw new Error(`HTTP ${headResponse.status}: ${headResponse.statusText}`);
    }

    // Obtener información del archivo desde los headers
    const contentType = headResponse.headers.get('content-type') || 'image/jpeg';
    const contentLength = headResponse.headers.get('content-length');
    
    // Verificar que sea un archivo de imagen
    if (!contentType.startsWith('image/')) {
      return {
        success: false,
        error: 'El archivo no es de tipo imagen'
      };
    }

    return {
      success: true,
      data: {
        url: url, // URL directa para visualización
        mimeType: contentType,
        fileSize: contentLength ? parseInt(contentLength) : null
      }
    };
  } catch (error) {
    console.error('Error al obtener imagen:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener imagen'
    };
  }
};

/**
 * Obtiene un video desde el endpoint personalizado
 * @param {string} multimediaId - ID del archivo multimedia
 * @returns {Promise<Object>} - URL del video para reproducción
 */
export const getWhatsAppVideo = async (multimediaId) => {
  try {
    const endpoint = process.env.REACT_APP_GET_MULTIMEDIA_ENDPOINT;
    
    if (!endpoint) {
      throw new Error('REACT_APP_GET_MULTIMEDIA_ENDPOINT no está configurado');
    }

    // Construir URL con el ID del multimedia como query parameter
    const url = `${endpoint}&id=${multimediaId}`;

    const token = localStorage.getItem('access_token');

    // Hacer una petición HEAD para verificar que el archivo existe y obtener metadatos
    const headResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      redirect: 'follow'
    });

    if (!headResponse.ok) {
      throw new Error(`HTTP ${headResponse.status}: ${headResponse.statusText}`);
    }

    // Obtener información del archivo desde los headers
    const contentType = headResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = headResponse.headers.get('content-length');
    
    // Verificar que sea un archivo de video
    if (!contentType.startsWith('video/')) {
      return {
        success: false,
        error: 'El archivo no es de tipo video'
      };
    }

    return {
      success: true,
      data: {
        url: url, // URL directa para reproducción
        mimeType: contentType,
        fileSize: contentLength ? parseInt(contentLength) : null
      }
    };
  } catch (error) {
    console.error('Error al obtener video:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener video'
    };
  }
};

/**
 * Obtiene un documento desde el endpoint personalizado
 * @param {string} multimediaId - ID del archivo multimedia
 * @returns {Promise<Object>} - URL del documento para descarga
 */
export const getWhatsAppDocument = async (multimediaId) => {
  try {
    const endpoint = process.env.REACT_APP_GET_MULTIMEDIA_ENDPOINT;
    
    if (!endpoint) {
      throw new Error('REACT_APP_GET_MULTIMEDIA_ENDPOINT no está configurado');
    }

    // Construir URL con el ID del multimedia como query parameter
    const url = `${endpoint}&id=${multimediaId}`;

    const token = localStorage.getItem('access_token');

    // Solicitud para obtener metadatos del archivo
    const headResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      redirect: 'follow'
    });

    if (!headResponse.ok) {
      throw new Error(`HTTP ${headResponse.status}: ${headResponse.statusText}`);
    }

    const contentType = headResponse.headers.get('content-type') || 'application/octet-stream';
    const contentLength = headResponse.headers.get('content-length');
    const contentDisposition = headResponse.headers.get('content-disposition');

    // Intentar extraer nombre de archivo del header Content-Disposition
    let fileName = null;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      if (match) {
        fileName = decodeURIComponent(match[1] || match[2] || '').trim();
      }
    }

    // Para documentos permitimos tipos comunes no multimedia (audio/image/video)
    const isMedia = contentType.startsWith('audio/') || contentType.startsWith('image/') || contentType.startsWith('video/');
    if (isMedia) {
      return {
        success: false,
        error: 'El archivo no es de tipo documento'
      };
    }

    return {
      success: true,
      data: {
        url: url, // URL directa para descarga
        mimeType: contentType,
        fileSize: contentLength ? parseInt(contentLength) : null,
        fileName: fileName || undefined
      }
    };
  } catch (error) {
    console.error('Error al obtener documento:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener documento'
    };
  }
};

/**
 * Sube una imagen a Facebook Graph API para WhatsApp
 * @param {File} imageFile - Archivo de imagen a subir
 * @returns {Promise<Object>} - Respuesta de la API de Facebook
 */
export const uploadImageToFacebook = async (imageFile) => {
  try {
    const whatsappToken = process.env.REACT_APP_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.REACT_APP_PHONE_NUMBER_ID;
    
    if (!whatsappToken) {
      throw new Error('REACT_APP_WHATSAPP_TOKEN no está configurado');
    }

    // Crear FormData para la subida
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', imageFile, imageFile.name);

    const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error al subir imagen a Facebook:', error);
    return {
      success: false,
      error: error.message || 'Error al subir imagen'
    };
  }
};

/**
 * Sube un documento a Facebook Graph API para WhatsApp
 * @param {File} documentFile - Archivo de documento a subir
 * @returns {Promise<Object>} - Respuesta de la API de Facebook
 */
export const uploadDocumentToFacebook = async (documentFile) => {
  try {
    const whatsappToken = process.env.REACT_APP_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.REACT_APP_PHONE_NUMBER_ID;
    
    if (!whatsappToken) {
      throw new Error('REACT_APP_WHATSAPP_TOKEN no está configurado');
    }

    if (!phoneNumberId) {
      throw new Error('REACT_APP_PHONE_NUMBER_ID no está configurado');
    }

    console.log(`📤 Subiendo documento: ${documentFile.name} (${documentFile.type})`);

    // Crear FormData para la subida
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', documentFile, documentFile.name);
    formData.append('type', 'document');

    const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error al subir documento a Facebook:', error);
    return {
      success: false,
      error: error.message || 'Error al subir documento'
    };
  }
};

/**
 * Sube un archivo de audio a Facebook Graph API para WhatsApp
 * @param {Blob} audioBlob - Archivo de audio a subir
 * @returns {Promise<Object>} - Respuesta de la API de Facebook
 */
export const uploadAudioToFacebook = async (audioBlob) => {
  try {
    const whatsappToken = process.env.REACT_APP_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.REACT_APP_PHONE_NUMBER_ID;
    
    if (!whatsappToken) {
      throw new Error('REACT_APP_WHATSAPP_TOKEN no está configurado');
    }

    if (!phoneNumberId) {
      throw new Error('REACT_APP_PHONE_NUMBER_ID no está configurado');
    }

    // Determinar el nombre del archivo basado en el tipo MIME
    const getFileName = (mimeType) => {
      if (mimeType.includes('ogg')) return 'audio.ogg';
      if (mimeType.includes('mp4')) return 'audio.mp4';
      if (mimeType.includes('mpeg')) return 'audio.mp3';
      if (mimeType.includes('aac')) return 'audio.aac';
      if (mimeType.includes('amr')) return 'audio.amr';
      return 'audio.webm'; // fallback
    };

    const fileName = getFileName(audioBlob.type);
    console.log(`📤 Subiendo audio como: ${fileName} (${audioBlob.type})`);

    // Crear FormData para la subida
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', audioBlob, fileName);
    formData.append('type', 'audio');

    const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error al subir audio a Facebook:', error);
    return {
      success: false,
      error: error.message || 'Error al subir audio'
    };
  }
};