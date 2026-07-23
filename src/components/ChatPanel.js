import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useMessages } from '../contexts/MessagesContext';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { sendAgentMessage, uploadImageToFacebook, uploadAudioToFacebook, uploadDocumentToFacebook } from '../services/apiService';
import AudioPlayer from './AudioPlayer';
import ImageMessage from './ImageMessage';
import VideoMessage from './VideoMessage';
import AudioRecorder from './AudioRecorder';
import DocumentMessage from './DocumentMessage';

const ChatPanel = ({ selectedConversation, onBackToList, showBackButton }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [showFileUploadPopover, setShowFileUploadPopover] = useState(false);
  const [isUltraSmall, setIsUltraSmall] = useState(false); // < 380px
  const [showLeadInfoPopover, setShowLeadInfoPopover] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioFileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const fileUploadPopoverRef = useRef(null);
  const leadInfoPopoverRef = useRef(null);
  const { 
    conversationMessages, 
    loadingMessages, 
    setActiveConversation,
    getConversationMode,
    setConversationMode,
    addMessageToConversation,
    markUserActivity
  } = useMessages();

  // Obtener mensajes de la conversación actual
  const messages = useMemo(() => {
    return selectedConversation 
      ? conversationMessages[selectedConversation.id] || []
      : [];
  }, [selectedConversation, conversationMessages]);
  
  const isLoadingCurrentConversation = selectedConversation 
    ? loadingMessages[selectedConversation.id] || false
    : false;

  // Obtener el modo actual de la conversación
  const currentMode = selectedConversation ? getConversationMode(selectedConversation.id) : 'bot';
  
  // Estados para controlar el botón de continuación
  const [showContinuationButton, setShowContinuationButton] = useState(false);
  const [continuationButtonBlocked, setContinuationButtonBlocked] = useState(false);
  const [lastHumanAgentMessageTime, setLastHumanAgentMessageTime] = useState(null);

  // Función para verificar si han pasado 24 horas desde el último mensaje del lead
  const shouldShowContinuationButton = useCallback(() => {
    if (!selectedConversation || !messages || messages.length === 0) {
      return false;
    }
    
    // Buscar el último mensaje del lead (que no sea bot ni human_agent)
    const leadMessages = messages.filter(message => 
      message.sender !== 'bot' && message.sender !== 'human_agent'
    );
    
    // Si no hay mensajes del lead, no mostrar el botón
    if (leadMessages.length === 0) {
      return false;
    }
    
    // Obtener el último mensaje del lead
    const lastLeadMessage = leadMessages[leadMessages.length - 1];

    console.log('🔄 ChatPanel: Último mensaje del lead:', lastLeadMessage);
    
    // Si tiene messageDate, usar esa fecha; si no, usar el timestamp como hora de hoy
    let messageDate = new Date(lastLeadMessage.originalTimestamp);
    
    const now = new Date();
    
    // Calcular la diferencia en horas
    const hoursDifference = (now - messageDate) / (1000 * 60 * 60);
  

    console.log('🔄 ChatPanel: Han pasado 24 horas o más desde el último mensaje del lead:', hoursDifference >= 24);
    
    // Mostrar el botón si:
    // 1. Han pasado 24 horas o más desde el último mensaje del lead Y
    return hoursDifference >= 24;
  }, [selectedConversation, messages]);

  // Función para verificar si el botón debe estar bloqueado
  const shouldBlockContinuationButton = useCallback(() => {
    if (!lastHumanAgentMessageTime) {
      return false;
    }

    const now = new Date();
    const messageTime = new Date(lastHumanAgentMessageTime);
    const hoursDifference = (now - messageTime) / (1000 * 60 * 60);

    // Bloquear por 1 hora después del último mensaje del agente humano
    return hoursDifference < 1;
  }, [lastHumanAgentMessageTime]);
  
  // Cargar mensajes cuando cambia la conversación seleccionada
  useEffect(() => {
    if (selectedConversation) {
      console.log(`🎯 ChatPanel: Conversación seleccionada cambiada a ${selectedConversation.id}`);
      // Pasar los datos completos de la conversación para inicializar el modo correctamente
      setActiveConversation(selectedConversation.id, selectedConversation);
    } else {
      console.log('🎯 ChatPanel: No hay conversación seleccionada');
      setActiveConversation(null);
    }
  // eslint-disable-next-line
  }, [selectedConversation?.id]); // Remover setActiveConversation de las dependencias
  
  // Verificar si se debe mostrar el botón de continuación cuando cambian los mensajes o la conversación
  useEffect(() => {
    if (selectedConversation && !isLoadingCurrentConversation) {
      const shouldShow = shouldShowContinuationButton();
      const isBlocked = shouldBlockContinuationButton();
      
      setShowContinuationButton(shouldShow);
      
      if (shouldShow) {
        // Si debe mostrar el botón, verificar si está bloqueado
        setContinuationButtonBlocked(isBlocked);
        
        if (isBlocked) {
          console.log(`🔄 Botón "Solicitar continuación" bloqueado por timeout de 1 hora para conversación ${selectedConversation.id}`);
        } else {
          console.log(`🔄 Botón "Solicitar continuación" disponible para conversación ${selectedConversation.id}`);
        }
      } else {
        // No mostrar el botón si no han pasado 24 horas o si el lead respondió
        setContinuationButtonBlocked(false);
        console.log(`🔄 Botón "Solicitar continuación" oculto - lead respondió o no han pasado 24 horas para conversación ${selectedConversation.id}`);
      }
    } else {
      setShowContinuationButton(false);
      setContinuationButtonBlocked(false);
    }
  }, [selectedConversation, isLoadingCurrentConversation, shouldShowContinuationButton, shouldBlockContinuationButton]);

  // Detectar cuando se envía un mensaje del agente humano para actualizar el timestamp
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Buscar el último mensaje del agente humano
      const humanAgentMessages = messages.filter(message => message.sender === 'human_agent');
      
      if (humanAgentMessages.length > 0) {
        const lastHumanMessage = humanAgentMessages[humanAgentMessages.length - 1];
        if (lastHumanMessage.originalTimestamp) {
          setLastHumanAgentMessageTime(lastHumanMessage.originalTimestamp);
        }
      }
    }
  }, [messages]);

  // Función para hacer scroll automático al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll cuando cambian los mensajes o se selecciona una nueva conversación
  useEffect(() => {
    if (!isLoadingCurrentConversation && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, selectedConversation?.id, isLoadingCurrentConversation]);

  // Cerrar popover cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fileUploadPopoverRef.current && !fileUploadPopoverRef.current.contains(event.target)) {
        setShowFileUploadPopover(false);
      }
      if (leadInfoPopoverRef.current && !leadInfoPopoverRef.current.contains(event.target)) {
        setShowLeadInfoPopover(false);
      }
    };

    if (showFileUploadPopover || showLeadInfoPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFileUploadPopover, showLeadInfoPopover]);

  // Detectar pantallas muy pequeñas (< 380px)
  useEffect(() => {
    const updateMedia = () => setIsUltraSmall(window.innerWidth < 380);
    updateMedia();
    window.addEventListener('resize', updateMedia);
    return () => window.removeEventListener('resize', updateMedia);
  }, []);

  // Función para validar archivo de imagen
  const validateImageFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Solo se permiten archivos JPG y PNG' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: 'El archivo no puede ser mayor a 5MB' };
    }
    
    return { valid: true };
  };

  // Función para validar archivo de audio
  const validateAudioFile = (file) => {
    const maxSize = 16 * 1024 * 1024; // 16MB (límite de WhatsApp)
    const allowedTypes = [
      'audio/ogg; codecs=opus',
      'audio/mp4',
      'audio/mpeg',
      'audio/aac',
      'audio/amr',
      'audio/mp3',
    ];
    
    // Validar por tipo MIME y extensión
    const isValidType = allowedTypes.includes(file.type) || 
                       file.name.toLowerCase().match(/\.(aac|amr|mp3|mp4|ogg)$/);
    
    if (!isValidType) {
      return { valid: false, error: 'Solo se permiten archivos de audio en formatos: AAC, AMR, MP3, MP4, OGG (OPUS codecs only)' };
    }
    
    // Validación especial para archivos OGG - solo permitir OPUS
    if (file.type === 'audio/ogg' && !file.type.includes('codecs=opus')) {
      return { valid: false, error: 'Los archivos OGG deben usar codecs OPUS únicamente' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: 'El archivo de audio no puede ser mayor a 16MB' };
    }
    
    return { valid: true };
  };

  // Función para validar archivo de documento
  const validateDocumentFile = (file) => {
    const maxSize = 100 * 1024 * 1024; // 100MB (límite de WhatsApp para documentos)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ];
    
    // Validar por tipo MIME y extensión
    const isValidType = allowedTypes.includes(file.type) || 
                       file.name.toLowerCase().match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|7z)$/);
    
    if (!isValidType) {
      return { valid: false, error: 'Solo se permiten documentos en formatos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ZIP, RAR, 7Z' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: 'El documento no puede ser mayor a 100MB' };
    }
    
    return { valid: true };
  };

  // Función para manejar selección de imagen
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    
    setSelectedImage(file);
    
    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Función para limpiar imagen seleccionada
  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Función para manejar selección de archivo de audio
  const handleAudioFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    
    setSelectedAudioFile(file);
    
    // Crear preview de audio
    const audioUrl = URL.createObjectURL(file);
    setAudioPreview(audioUrl);
  };

  // Función para limpiar archivo de audio seleccionado
  const clearSelectedAudioFile = () => {
    setSelectedAudioFile(null);
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
      setAudioPreview(null);
    }
    if (audioFileInputRef.current) {
      audioFileInputRef.current.value = '';
    }
  };

  // Función para manejar selección de documento
  const handleDocumentSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    
    setSelectedDocument(file);
  };

  // Función para limpiar documento seleccionado
  const clearSelectedDocument = () => {
    setSelectedDocument(null);
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  // Función para enviar imagen
  const handleSendImage = async () => {
    if (!selectedImage || currentMode === 'bot' || isUploadingImage) return;
    
    const waId = selectedConversation.id.replace('conv_', '');
    console.log('🎯 ChatPanel: ID de la conversación:', waId);
    setIsUploadingImage(true);
    
    try {
      console.log('📤 Subiendo imagen a Facebook...');
      
      const uploadResult = await uploadImageToFacebook(selectedImage);

      if (uploadResult.success) {
        console.log('✅ Imagen subida exitosamente:', uploadResult.data);

        const multimedia = {
          type: 'image',
          multimedia_id: uploadResult.data.id
        };

        const sendResult = await sendAgentMessage(waId, '', multimedia);
      
        if (sendResult.success) {
          console.log('✅ Imagen enviada al lead exitosamente:', sendResult.data);

          // Crear mensaje con la imagen
          const newMessage = {
            id: sendResult.data.message_id_sent,
            sender: 'human_agent',
            text: '',
            timestamp: new Date(sendResult.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messageDate: new Date(sendResult.data.timestamp).toLocaleDateString(),
            delivered: true,
            read: false,
            multimedia: multimedia
          };
          
          // Agregar mensaje a la conversación
          addMessageToConversation(selectedConversation.id, newMessage);
        } else {
          console.error('❌ Error al enviar imagen:', sendResult.error);
          alert('Error al enviar la imagen: ' + sendResult.error);
        }
        
        // Marcar actividad del usuario
        markUserActivity();
        
        // Limpiar imagen seleccionada
        clearSelectedImage();
      } else {
        console.error('❌ Error al subir imagen:', uploadResult.error);
        alert('Error al subir la imagen: ' + uploadResult.error);
      }
    } catch (error) {
      console.error('❌ Error inesperado al subir imagen:', error);
      alert('Error inesperado al subir la imagen');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Función para enviar audio
  const handleSendAudio = async (audioBlob) => {
    if (!audioBlob || currentMode === 'bot' || isUploadingAudio) return;
    
    const waId = selectedConversation.id.replace('conv_', '');
    console.log('🎯 ChatPanel: Enviando audio, ID de la conversación:', waId);
    setIsUploadingAudio(true);
    
    try {
      console.log('📤 Subiendo audio a Facebook...');
      
      const uploadResult = await uploadAudioToFacebook(audioBlob);

      if (uploadResult.success) {
        console.log('✅ Audio subido exitosamente:', uploadResult.data);

        const multimedia = {
          type: 'audio',
          multimedia_id: uploadResult.data.id
        };

        const sendResult = await sendAgentMessage(waId, '', multimedia);
      
        if (sendResult.success) {
          console.log('✅ Audio enviado al lead exitosamente:', sendResult.data);

          // Crear mensaje con el audio
          const newMessage = {
            id: sendResult.data.message_id_sent,
            sender: 'human_agent',
            text: '',
            timestamp: new Date(sendResult.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messageDate: new Date(sendResult.data.timestamp).toLocaleDateString(),
            delivered: true,
            read: false,
            multimedia: multimedia
          };
          
          // Agregar mensaje a la conversación
          addMessageToConversation(selectedConversation.id, newMessage);
        } else {
          console.error('❌ Error al enviar audio:', sendResult.error);
          alert('Error al enviar el audio: ' + sendResult.error);
        }
        
        // Marcar actividad del usuario
        markUserActivity();
      } else {
        console.error('❌ Error al subir audio:', uploadResult.error);
        alert('Error al subir el audio: ' + uploadResult.error);
      }
    } catch (error) {
      console.error('❌ Error inesperado al subir audio:', error);
      alert('Error inesperado al subir el audio');
    } finally {
      setIsUploadingAudio(false);
      setShowAudioRecorder(false);
    }
  };

  // Función para cancelar grabación de audio
  const handleCancelAudio = () => {
    setShowAudioRecorder(false);
  };

  // Función para enviar documento
  const handleSendDocument = async () => {
    if (!selectedDocument || currentMode === 'bot' || isUploadingDocument) return;
    
    const waId = selectedConversation.id.replace('conv_', '');
    console.log('🎯 ChatPanel: Enviando documento, ID de la conversación:', waId);
    setIsUploadingDocument(true);
    
    try {
      console.log('📤 Subiendo documento a Facebook...');
      
      const uploadResult = await uploadDocumentToFacebook(selectedDocument);

      if (uploadResult.success) {
        console.log('✅ Documento subido exitosamente:', uploadResult.data);

        const multimedia = {
          type: 'document',
          multimedia_id: uploadResult.data.id
        };

        const sendResult = await sendAgentMessage(waId, '', multimedia);
      
        if (sendResult.success) {
          console.log('✅ Documento enviado al lead exitosamente:', sendResult.data);

          // Crear mensaje con el documento
          const newMessage = {
            id: sendResult.data.message_id_sent,
            sender: 'human_agent',
            text: '',
            timestamp: new Date(sendResult.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messageDate: new Date(sendResult.data.timestamp).toLocaleDateString(),
            delivered: true,
            read: false,
            multimedia: multimedia
          };
          
          // Agregar mensaje a la conversación
          addMessageToConversation(selectedConversation.id, newMessage);
        } else {
          console.error('❌ Error al enviar documento:', sendResult.error);
          alert('Error al enviar el documento: ' + sendResult.error);
        }
        
        // Marcar actividad del usuario
        markUserActivity();
        
        // Limpiar documento seleccionado
        clearSelectedDocument();
      } else {
        console.error('❌ Error al subir documento:', uploadResult.error);
        alert('Error al subir el documento: ' + uploadResult.error);
      }
    } catch (error) {
      console.error('❌ Error inesperado al subir documento:', error);
      alert('Error inesperado al subir el documento');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  // Función para enviar archivo de audio
  const handleSendAudioFile = async () => {
    if (!selectedAudioFile || currentMode === 'bot' || isUploadingAudio) return;
    
    const waId = selectedConversation.id.replace('conv_', '');
    console.log('🎯 ChatPanel: Enviando archivo de audio, ID de la conversación:', waId);
    setIsUploadingAudio(true);
    
    try {
      console.log('📤 Subiendo archivo de audio a Facebook...');
      
      const uploadResult = await uploadAudioToFacebook(selectedAudioFile);

      if (uploadResult.success) {
        console.log('✅ Archivo de audio subido exitosamente:', uploadResult.data);

        const multimedia = {
          type: 'audio',
          multimedia_id: uploadResult.data.id
        };

        const sendResult = await sendAgentMessage(waId, '', multimedia);
      
        if (sendResult.success) {
          console.log('✅ Archivo de audio enviado al lead exitosamente:', sendResult.data);

          // Crear mensaje con el audio
          const newMessage = {
            id: sendResult.data.message_id_sent,
            sender: 'human_agent',
            text: '',
            timestamp: new Date(sendResult.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messageDate: new Date(sendResult.data.timestamp).toLocaleDateString(),
            delivered: true,
            read: false,
            multimedia: multimedia
          };
          
          // Agregar mensaje a la conversación
          addMessageToConversation(selectedConversation.id, newMessage);
        } else {
          console.error('❌ Error al enviar archivo de audio:', sendResult.error);
          alert('Error al enviar el archivo de audio: ' + sendResult.error);
        }
        
        // Marcar actividad del usuario
        markUserActivity();
        
        // Limpiar archivo de audio seleccionado
        clearSelectedAudioFile();
      } else {
        console.error('❌ Error al subir archivo de audio:', uploadResult.error);
        alert('Error al subir el archivo de audio: ' + uploadResult.error);
      }
    } catch (error) {
      console.error('❌ Error inesperado al subir archivo de audio:', error);
      alert('Error inesperado al subir el archivo de audio');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || currentMode === 'bot' || isLoading) return;
    
    const messageToSend = newMessage.trim();
    const waId = selectedConversation.id.replace('conv_', '');
    
    setIsLoading(true);
    
    try {
      console.log('📤 Enviando mensaje del agente:', messageToSend);
      
      const result = await sendAgentMessage(waId, messageToSend);
      
      if (result.success) {
        console.log('✅ Mensaje enviado exitosamente:', result.data);
        
        // Crear mensaje con datos reales del backend
        const newMessage = {
          id: result.data.message_id_sent,
          sender: 'human_agent',
          text: messageToSend,
          timestamp: new Date(result.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messageDate: new Date(result.data.timestamp).toLocaleDateString(),
          delivered: true,
          read: true
        };
        
        // Agregar mensaje a la conversación solo después del éxito
        addMessageToConversation(selectedConversation.id, newMessage);
        
        // Marcar actividad del usuario para reiniciar timeout
        markUserActivity();
        
        // Limpiar el input solo después del éxito
        setNewMessage('');
      } else {
        console.error('❌ Error al enviar mensaje:', result.error);
        // TODO: Mostrar notificación de error al usuario
      }
    } catch (error) {
      console.error('❌ Error inesperado al enviar mensaje:', error);
      // TODO: Mostrar notificación de error al usuario
    } finally {
      setIsLoading(false);
    }
  };

  // Función para detectar mensajes inválidos (fuera de dominio)
  const isInvalidMessage = (messageText) => {
    return messageText && messageText.startsWith('(FD) MENSAJE INVÁLIDO');
  };

  // Función para extraer el mensaje del lead de un mensaje inválido
  const extractLeadMessage = (messageText) => {
    if (!isInvalidMessage(messageText)) {
      return messageText;
    }
    
    // Buscar el patrón "(FD) Mensaje del lead: " y extraer lo que viene después
    const leadMessageMatch = messageText.match(/\(FD\) Mensaje del lead:\s*(.+)/);
    if (leadMessageMatch) {
      return leadMessageMatch[1].trim();
    }
    
    // Si no se encuentra el patrón específico, devolver el mensaje original
    return messageText;
  };

  const handleToggleMode = async () => {
    if (!selectedConversation || isLoading) return;

    // Permitir alternar el modo en ambos sentidos (bot <-> humano)
    const newMode = currentMode === 'bot' ? 'agente' : 'bot';
    
    setIsLoading(true);
    
    try {
      const result = await setConversationMode(selectedConversation.id, newMode);
      
      if (result.success) {
        console.log(`✅ Modo cambiado exitosamente a: ${newMode}`);
        // Marcar actividad del usuario para reiniciar timeout
        markUserActivity();
      } else {
        console.error(`❌ Error al cambiar modo: ${result.error}`);
        // Aquí podrías mostrar una notificación de error al usuario
      }
    } catch (error) {
      console.error(`❌ Error inesperado al cambiar modo:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar el clic del botón "Solicitar continuación"
  const handleRequestContinuation = async () => {
    if (!selectedConversation || isLoading) return;
    
    console.log(`🔄 Botón "Solicitar continuación" activado para conversación ${selectedConversation.id}`);
    
    const waId = selectedConversation.id.replace('conv_', '');
    setIsLoading(true);
    
    try {
      console.log('📤 Enviando solicitud de continuación con template...');
      
      // Enviar mensaje vacío con template_name
      const result = await sendAgentMessage(waId, '', null, 'seguimiento_conversacion');
      
      if (result.success) {
        console.log('✅ Solicitud de continuación enviada exitosamente:', result.data);
        
        // Crear mensaje con datos reales del backend
        const newMessage = {
          id: result.data.message_id_sent,
          sender: 'human_agent',
          text: result.data.message,
          timestamp: new Date(result.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messageDate: new Date(result.data.timestamp).toLocaleDateString(),
          delivered: true,
          read: true,
          originalTimestamp: result.data.timestamp
        };
        
        // Agregar mensaje a la conversación
        addMessageToConversation(selectedConversation.id, newMessage);
        
        // Actualizar el timestamp del último mensaje del agente humano
        setLastHumanAgentMessageTime(result.data.timestamp);
        
        // Bloquear el botón por 1 hora
        setContinuationButtonBlocked(true);
        
        // Marcar actividad del usuario para reiniciar timeout
        markUserActivity();
        
        console.log('🔄 Botón bloqueado por 1 hora desde:', result.data.timestamp);
      } else {
        console.error('❌ Error al enviar solicitud de continuación:', result.error);
        alert('Error al enviar la solicitud de continuación: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error inesperado al enviar solicitud de continuación:', error);
      alert('Error inesperado al enviar la solicitud de continuación');
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedConversation) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">WhatsApp Bot Web</h3>
          <p className="text-gray-500">Selecciona una conversación para comenzar a chatear</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col relative">
      {/* Header */}
      <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Botón de regreso - solo visible en móvil */}
          {showBackButton && onBackToList && (
            <button
              onClick={onBackToList}
              className="md:hidden text-gray-600 hover:text-gray-800 p-1 rounded-md hover:bg-gray-200 transition-colors"
              title="Volver a conversaciones"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold">
            {selectedConversation.avatar}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{selectedConversation.name}</h2>
            <p className="text-sm text-gray-500">
              {selectedConversation.phone ? formatPhoneNumber(selectedConversation.phone) : 'Teléfono: No disponible'}
            </p>
          </div>
        </div>
        
        {/* Botón de información del lead */}
        {selectedConversation.leadInfo && (
          <div className="relative" ref={leadInfoPopoverRef}>
            <button
              type="button"
              onClick={() => setShowLeadInfoPopover(!showLeadInfoPopover)}
              onMouseEnter={() => setShowLeadInfoPopover(true)}
              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              title="Información del lead"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            
            {/* Popover con información del lead */}
            {showLeadInfoPopover && (
            <div 
              className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 max-h-96 overflow-y-auto"
              onMouseLeave={() => setShowLeadInfoPopover(false)}
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                Información del Lead
              </h3>
              <div className="space-y-2">
                {selectedConversation.leadInfo.nombre && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Nombre</p>
                    <p className="text-sm text-gray-900">{selectedConversation.leadInfo.nombre}</p>
                  </div>
                )}
                {selectedConversation.leadInfo.telefono && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Teléfono</p>
                    <p className="text-sm text-gray-900">{formatPhoneNumber(selectedConversation.leadInfo.telefono)}</p>
                  </div>
                )}
                {selectedConversation.leadInfo.tipo_maquinaria && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Tipo de Maquinaria</p>
                    <p className="text-sm text-gray-900">{selectedConversation.leadInfo.tipo_maquinaria}</p>
                  </div>
                )}
                {selectedConversation.leadInfo.lugar_requerimiento && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Lugar de Requerimiento</p>
                    <p className="text-sm text-gray-900">{selectedConversation.leadInfo.lugar_requerimiento}</p>
                  </div>
                )}
                {selectedConversation.leadInfo.sitio_web && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Sitio Web</p>
                    <p className="text-sm text-gray-900">{selectedConversation.leadInfo.sitio_web}</p>
                  </div>
                )}
                {selectedConversation.leadInfo.uso_empresa_o_venta && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Uso Empresa o Venta</p>
                    <p className="text-sm text-gray-900">{selectedConversation.leadInfo.uso_empresa_o_venta}</p>
                  </div>
                )}
                {selectedConversation.leadInfo.nombre_empresa && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Nombre de Empresa</p>
                    <p className="text-sm text-gray-900">{selectedConversation.leadInfo.nombre_empresa}</p>
                  </div>
                )}
                {selectedConversation.leadInfo.giro_empresa && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Giro de Empresa</p>
                    <p className="text-sm text-gray-900">{selectedConversation.leadInfo.giro_empresa}</p>
                  </div>
                )}
                {selectedConversation.leadInfo.correo && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Correo</p>
                    <p className="text-sm text-gray-900">{selectedConversation.leadInfo.correo}</p>
                  </div>
                )}
                {!selectedConversation.leadInfo.nombre && 
                 !selectedConversation.leadInfo.telefono && 
                 !selectedConversation.leadInfo.tipo_maquinaria &&
                 !selectedConversation.leadInfo.lugar_requerimiento &&
                 !selectedConversation.leadInfo.sitio_web &&
                 !selectedConversation.leadInfo.uso_empresa_o_venta &&
                 !selectedConversation.leadInfo.nombre_empresa &&
                 !selectedConversation.leadInfo.giro_empresa &&
                 !selectedConversation.leadInfo.correo && (
                  <p className="text-sm text-gray-500 italic">No hay información disponible</p>
                )}
              </div>
            </div>
            )}
          </div>
        )}
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoadingCurrentConversation ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Cargando mensajes...</p>
            </div>
          </div>
        ) : messages.length > 0 ? (
          messages.map((message) => {
            const isInvalid = isInvalidMessage(message.text);
            const leadMessage = extractLeadMessage(message.text);
            
            return (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'bot' || message.sender === 'human_agent' 
                    ? 'justify-end' 
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md min-w-[200px] px-4 py-2 rounded-lg ${
                    message.sender === 'bot'
                      ? 'bg-blue-500 text-white'
                      : message.sender === 'human_agent'
                      ? 'bg-green-500 text-white'
                      : isInvalid
                      ? 'bg-red-50 text-gray-800 border border-red-200'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                {/* Mostrar reproductor de audio si el mensaje contiene multimedia de audio */}
                {message.multimedia && message.multimedia.type === 'audio' ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">
                        {message.sender === 'bot' && '🤖 '}
                        {message.sender === 'human_agent' && '👤 '}
                        🎵 Audio
                      </span>
                    </div>
                    <AudioPlayer 
                      multimediaId={message.multimedia.multimedia_id} 
                      sender={message.sender}
                    />
                  </div>
                ) : message.multimedia && message.multimedia.type === 'image' ? (
                  /* Mostrar imagen si el mensaje contiene multimedia de imagen */
                  <ImageMessage 
                    multimediaId={message.multimedia.multimedia_id}
                    caption={message.multimedia.caption}
                    sender={message.sender}
                  />
                ) : message.multimedia && message.multimedia.type === 'video' ? (
                  /* Mostrar video si el mensaje contiene multimedia de video */
                  <VideoMessage 
                    multimediaId={message.multimedia.multimedia_id}
                    caption={message.multimedia.caption}
                    sender={message.sender}
                  />
                ) : message.multimedia && message.multimedia.type === 'document' ? (
                  /* Mostrar documento si el mensaje contiene multimedia de documento */
                  <DocumentMessage
                    multimediaId={message.multimedia.multimedia_id}
                    caption={message.multimedia.caption}
                    sender={message.sender}
                  />
                ) : (
                  /* Mostrar texto normal si no hay multimedia */
                  <div className="space-y-1">
                    {isInvalid && (
                      <p className="text-xs text-red-600 font-medium">
                        Mensaje fuera de dominio detectado:
                      </p>
                    )}
                    <p className="text-sm">
                      {message.sender === 'bot' && '🤖 '}
                      {message.sender === 'human_agent' && '👤 '}
                      {leadMessage}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-1">
                  {/* Mostrar hora del mensaje */}
                  <p className={`text-xs ${
                    message.sender === 'bot'
                      ? 'text-blue-100'
                      : message.sender === 'human_agent'
                      ? 'text-green-100'
                      : 'text-gray-500'
                  }`}>
                    {message.timestamp}
                  </p>
                  {/* Mostrar fecha del mensaje */}
                  {message.messageDate && (
                    <span className={`text-xs font-medium ${
                      message.sender === 'bot'
                        ? 'text-blue-200'
                        : message.sender === 'human_agent'
                        ? 'text-green-200'
                        : 'text-gray-600'
                    }`}>
                      {message.messageDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
            );
          })
        ) : selectedConversation ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>No hay mensajes en esta conversación</p>
            </div>
          </div>
        ) : null}
        
        {/* Elemento invisible para hacer scroll automático */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Loading bar */}
      {isLoading && (
        <div className="h-1 bg-gray-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-green-500 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-bounce"></div>
        </div>
      )}
      
      {/* Image preview */}
      {imagePreview && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-lg border border-gray-300"
              />
              <button
                onClick={clearSelectedImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                title="Eliminar imagen"
              >
                ×
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {selectedImage?.name} ({(selectedImage?.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              <p className="text-xs text-gray-500">Lista para enviar</p>
            </div>
            <button
              onClick={handleSendImage}
              disabled={currentMode === 'bot' || isUploadingImage}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isUploadingImage ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Enviar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Audio file preview */}
      {audioPreview && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-16 h-16 bg-blue-100 rounded-lg border border-gray-300 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <button
                onClick={clearSelectedAudioFile}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                title="Eliminar archivo de audio"
              >
                ×
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {selectedAudioFile?.name} ({(selectedAudioFile?.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              <p className="text-xs text-gray-500">Listo para enviar</p>
              <audio controls className="w-full mt-2" src={audioPreview}>
                Tu navegador no soporta el elemento de audio.
              </audio>
            </div>
            <button
              onClick={handleSendAudioFile}
              disabled={currentMode === 'bot' || isUploadingAudio}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isUploadingAudio ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Enviar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Document preview */}
      {selectedDocument && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h8a2 2 0 012 2v4h-3a2 2 0 00-2 2v3H7a2 2 0 01-2-2V5a2 2 0 012-2zm5 10l4 4m0 0l4-4m-4 4V9" />
                </svg>
              </div>
              <button
                onClick={clearSelectedDocument}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                title="Eliminar documento"
              >
                ×
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {selectedDocument?.name} ({(selectedDocument?.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              <p className="text-xs text-gray-500">Listo para enviar</p>
            </div>
            <button
              onClick={handleSendDocument}
              disabled={currentMode === 'bot' || isUploadingDocument}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isUploadingDocument ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Enviar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {showContinuationButton ? (
          /* Botón de solicitar continuación */
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRequestContinuation}
              disabled={continuationButtonBlocked || isLoading}
              className={`px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors font-medium ${
                continuationButtonBlocked || isLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Enviando...</span>
                  </>
                ) : continuationButtonBlocked ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Solicitud enviada - Esperando respuesta</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Solicitar continuación</span>
                  </>
                )}
              </div>
            </button>
          </div>
        ) : (
          /* Formulario normal de mensaje */
          <form onSubmit={handleSendMessage} className="flex space-x-2">
          {/* Botones en pantallas normales */}
          {!isUltraSmall && (
            <>
              {/* Botón de cambio de modo */}
              <button
                type="button"
                onClick={handleToggleMode}
                disabled={isLoading}
                className={`flex items-center space-x-1 px-3 py-2 rounded-full font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  currentMode === 'agente'
                  ? 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500'
                  : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={currentMode === 'agente' ? 'Modo humano activo - Cambiar a bot' : 'Modo bot activo - Cambiar a humano'}
              >
                <span className="text-base">
                  {currentMode === 'agente' ? '👤' : '🤖'}
                </span>
                <span className="hidden sm:inline">
                  {currentMode === 'agente' ? 'Humano' : 'Bot'}
                </span>
              </button>

              {/* Botón de subir archivos - solo visible en modo agente */}
              {currentMode === 'agente' && (
                <div className="relative" ref={fileUploadPopoverRef}>
                  <button
                    type="button"
                    onClick={() => setShowFileUploadPopover(!showFileUploadPopover)}
                    disabled={isLoading || isUploadingImage || isUploadingAudio || isUploadingDocument}
                    className="bg-gray-600 text-white p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Subir archivos"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </button>

                  {/* Popover con opciones de archivo */}
                  {showFileUploadPopover && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1 z-50 min-w-[140px]">
                      {/* Botón de subir imagen */}
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowFileUploadPopover(false);
                        }}
                        disabled={isLoading || isUploadingImage}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Subir imagen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Imagen</span>
                      </button>

                      {/* Botón de subir archivo de audio */}
                      <button
                        type="button"
                        onClick={() => {
                          audioFileInputRef.current?.click();
                          setShowFileUploadPopover(false);
                        }}
                        disabled={isLoading || isUploadingAudio}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Subir archivo de audio"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <span>Audio</span>
                      </button>

                      {/* Botón de subir documento */}
                      <button
                        type="button"
                        onClick={() => {
                          documentInputRef.current?.click();
                          setShowFileUploadPopover(false);
                        }}
                        disabled={isLoading || isUploadingDocument}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Subir documento"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h8a2 2 0 012 2v4h-3a2 2 0 00-2 2v3H7a2 2 0 01-2-2V5a2 2 0 012-2zm5 10l4 4m0 0l4-4m-4 4V9" />
                        </svg>
                        <span>Documento</span>
                      </button>

                      {/* Botón de grabar audio */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowAudioRecorder(true);
                          setShowFileUploadPopover(false);
                        }}
                        disabled={false}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                        title="Grabar audio"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span>Grabar Audio</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Menú único en pantallas ultra pequeñas (<380px) */}
          {isUltraSmall && (
            <div className="relative" ref={fileUploadPopoverRef}>
              <button
                type="button"
                onClick={() => setShowFileUploadPopover(!showFileUploadPopover)}
                disabled={isLoading || isUploadingImage || isUploadingAudio || isUploadingDocument}
                className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Opciones"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6a2 2 0 110-4 2 2 0 010 4zM12 14a2 2 0 110-4 2 2 0 010 4zM12 22a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {showFileUploadPopover && (
                <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1 z-50 min-w-[160px]">
                  {/* Cambiar modo (solo permitido de bot -> humano) */}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleMode();
                      setShowFileUploadPopover(false);
                    }}
                    disabled={isLoading}
                    className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      currentMode === 'agente'
                        ? 'text-blue-700 hover:bg-blue-50 hover:text-blue-800'
                        : 'text-green-700 hover:bg-green-50 hover:text-green-800'
                    } ${isLoading ? 'opacity-50' : ''}`}
                    title={currentMode === 'agente' ? 'Modo humano activo - Cambiar a bot' : 'Cambiar a modo humano'}
                  >
                    <span className="text-base">{currentMode === 'agente' ? '🤖' : '👤'}</span>
                    <span>{currentMode === 'agente' ? 'Cambiar a bot' : 'Cambiar a humano'}</span>
                  </button>

                  <div className="my-1 h-px bg-gray-200" />

                  {/* Media options (deshabilitadas si no está en modo agente) */}
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowFileUploadPopover(false);
                    }}
                    disabled={isLoading || isUploadingImage || currentMode !== 'agente'}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Subir imagen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Imagen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      audioFileInputRef.current?.click();
                      setShowFileUploadPopover(false);
                    }}
                    disabled={isLoading || isUploadingAudio || currentMode !== 'agente'}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Subir archivo de audio"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span>Audio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      documentInputRef.current?.click();
                      setShowFileUploadPopover(false);
                    }}
                    disabled={isLoading || isUploadingDocument || currentMode !== 'agente'}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Subir documento"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h8a2 2 0 012 2v4h-3a2 2 0 00-2 2v3H7a2 2 0 01-2-2V5a2 2 0 012-2zm5 10l4 4m0 0l4-4m-4 4V9" />
                    </svg>
                    <span>Documento</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAudioRecorder(true);
                      setShowFileUploadPopover(false);
                    }}
                    disabled={currentMode !== 'agente'}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Grabar audio"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Grabar Audio</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input de archivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Input de archivo de audio oculto */}
          <input
            ref={audioFileInputRef}
            type="file"
            accept=".aac,.amr,.mp3,.ogg,audio/ogg; codecs=opus,audio/mp4,audio/mpeg,audio/aac,audio/amr,audio/mp3"
            onChange={handleAudioFileSelect}
            className="hidden"
          />

          {/* Input de documento oculto */}
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/zip,application/x-rar-compressed,application/x-7z-compressed"
            onChange={handleDocumentSelect}
            className="hidden"
          />
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={currentMode === 'bot' ? 'El bot está activo...' : isLoading ? 'Enviando...' : 'Escribe un mensaje...'}
            disabled={currentMode === 'bot' || isLoading}
            className={`flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none transition-colors ${
              currentMode === 'bot' || isLoading
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'focus:ring-2 focus:ring-green-500 focus:border-transparent'
            }`}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || currentMode === 'bot' || isLoading}
            className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        )}
      </div>

      {/* Audio Recorder Modal */}
      <AudioRecorder
        isVisible={showAudioRecorder}
        onSend={handleSendAudio}
        onCancel={handleCancelAudio}
      />
    </div>
  );
};

export default ChatPanel;
