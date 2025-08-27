import leadsData from '../testData/leads.json';

// Función que simula una llamada a la API para obtener contactos recientes
export const getRecentContacts = async () => {
  try {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // En un entorno real, esto sería una llamada fetch a tu API
    // const response = await fetch('/api/recent-contacts');
    // const data = await response.json();
    
    // Por ahora, devolvemos los datos del JSON local
    // Ordenar por updated_at más reciente y tomar los primeros 10
    const sortedContacts = leadsData
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 10);
    
    return {
      success: true,
      data: sortedContacts
    };
  } catch (error) {
    console.error('Error al obtener contactos recientes:', error);
    return {
      success: false,
      error: 'Error al cargar los contactos'
    };
  }
};

// Función auxiliar para formatear los datos del lead para mostrar en la UI
export const formatContactForUI = (lead, conversationMessages = {}) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getLastMessage = (lead, conversationMessages) => {
    // Verificar si ya se han cargado los mensajes de esta conversación
    const messages = conversationMessages[lead.id];
    
    if (messages && messages.length > 0) {
      // Si hay mensajes cargados, mostrar el último mensaje real
      const lastMessage = messages[messages.length - 1];
      
      // Truncar el mensaje si es muy largo
      const maxLength = 50;
      const truncatedText = lastMessage.text.length > maxLength 
        ? lastMessage.text.substring(0, maxLength) + '...'
        : lastMessage.text;
      
      // Agregar indicador de quién envió el mensaje
      const senderPrefix = lastMessage.sender === 'me' ? 'Tú: ' : '';
      
      return `${senderPrefix}${truncatedText}`;
    } else {
      // Si no se han cargado los mensajes, mostrar mensaje de invitación
      return 'Presione para visualizar...';
    }
  };

  const getTimestamp = (updatedAt) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffInHours = Math.floor((now - updated) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Hace ${diffInDays}d`;
    }
  };



  return {
    id: lead.id,
    leadId: lead.lead_id,
    name: lead.state.nombre_completo || lead.state.nombre,
    phone: lead.state.telefono,
    lastMessage: getLastMessage(lead, conversationMessages),
    timestamp: getTimestamp(lead.updated_at),
    avatar: getInitials(lead.state.nombre),
    status: lead.status,
    conversationMode: lead.conversation_mode,
    completed: lead.state.completed,
    assignedAdvisor: lead.asignado_asesor,
    originalData: lead // Mantener datos originales para futuras funcionalidades
  };
};
