// Función auxiliar para formatear los datos del lead para mostrar en la UI
export const formatContactForUI = (lead, conversationMessages = {}) => {
    const getInitials = (name) => {
        return name ? name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('') : ' ';
    };

    const getLastMessage = (lead, conversationMessages) => {
      // Verificar si ya se han cargado los mensajes de esta conversación
      const messages = conversationMessages[lead.id];
      
      if (messages && messages.length > 0) {
        // Si hay mensajes cargados, mostrar el último mensaje real
        const lastMessage = messages[messages.length - 1];
        
        // Truncar el mensaje si es muy largo
        const maxLength = 50;
        let truncatedText = '';
        if (lastMessage.text) {
          truncatedText = lastMessage.text.length > maxLength 
            ? lastMessage.text.substring(0, maxLength) + '...'
            : lastMessage.text;
        } else {
          truncatedText = 'Mensaje multimedia';
        }

        
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

    // Extraer leadInfo de lead.state si está disponible
    const extractLeadInfo = (state) => {
      if (!state) return null;
      
      // Solo crear leadInfo si hay al menos un campo con valor
      const hasData = state.nombre || state.telefono || state.tipo_maquinaria || 
                     state.lugar_requerimiento || state.sitio_web || 
                     state.uso_empresa_o_venta || state.nombre_empresa || 
                     state.giro_empresa || state.correo;
      
      if (!hasData) return null;
      
      return {
        nombre: state.nombre || null,
        telefono: state.telefono || null,
        tipo_maquinaria: state.tipo_maquinaria || null,
        lugar_requerimiento: state.lugar_requerimiento || null,
        sitio_web: state.sitio_web || null,
        uso_empresa_o_venta: state.uso_empresa_o_venta || null,
        nombre_empresa: state.nombre_empresa || null,
        giro_empresa: state.giro_empresa || null,
        correo: state.correo || null
      };
    };
  
    return {
      id: lead.id,
      leadId: lead.lead_id,
      name: lead.state.nombre || 'Nuevo lead',
      phone: lead.state.telefono,
      lastMessage: getLastMessage(lead, conversationMessages),
      timestamp: getTimestamp(lead.updated_at),
      avatar: getInitials(lead.state.nombre),
      status: lead.state.completed ? 'completed' : 'active',
      conversationMode: lead.conversation_mode,
      completed: lead.state.completed,
      assignedAdvisor: lead.asignado_asesor,
      leadInfo: extractLeadInfo(lead.state), // Extraer leadInfo de state
      originalData: lead // Mantener datos originales para futuras funcionalidades
    };
};