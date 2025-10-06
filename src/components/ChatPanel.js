import React, { useState, useEffect, useRef } from 'react';
import { useMessages } from '../contexts/MessagesContext';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { sendAgentMessage, uploadImageToFacebook, uploadAudioToFacebook } from '../services/apiService';
import AudioPlayer from './AudioPlayer';
import ImageMessage from './ImageMessage';
import VideoMessage from './VideoMessage';
import AudioRecorder from './AudioRecorder';

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
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioFileInputRef = useRef(null);
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
  const messages = selectedConversation 
    ? conversationMessages[selectedConversation.id] || []
    : [];
  
  const isLoadingCurrentConversation = selectedConversation 
    ? loadingMessages[selectedConversation.id] || false
    : false;

  // Obtener el modo actual de la conversación
  const currentMode = selectedConversation ? getConversationMode(selectedConversation.id) : 'bot';
  
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
  
  // Este useEffect ya no es necesario porque la inicialización se hace en setActiveConversation

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

  const handleToggleMode = async () => {
    if (!selectedConversation || isLoading) return;
    
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
    <div className="h-full bg-white flex flex-col">
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
          messages.map((message) => (
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
                ) : (
                  /* Mostrar texto normal si no hay multimedia */
                  <p className="text-sm">
                    {message.sender === 'bot' && '🤖 '}
                    {message.sender === 'human_agent' && '👤 '}
                    {message.text}
                  </p>
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
          ))
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

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
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
            title={`Cambiar a modo ${currentMode === 'agente' ? 'bot' : 'humano'}`}
          >
            <span className="text-base">
              {currentMode === 'agente' ? '🤖' : '👤'}
            </span>
            <span className="hidden sm:inline">
              {currentMode === 'agente' ? 'Bot' : 'Humano'}
            </span>
          </button>

          {/* Botón de subir imagen - solo visible en modo agente */}
          {currentMode === 'agente' && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploadingImage}
              className="bg-purple-500 text-white p-2 rounded-full hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Subir imagen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          )}

          {/* Botón de grabar audio - solo visible en modo agente */}
          {currentMode === 'agente' && (
            <button
              type="button"
              onClick={() => setShowAudioRecorder(true)}
              disabled={true}
              className="bg-gray-400 text-white p-2 rounded-full cursor-not-allowed opacity-50 transition-colors"
              title="Grabar audio (deshabilitado)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          {/* Botón de subir archivo de audio - solo visible en modo agente */}
          {currentMode === 'agente' && (
            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              disabled={isLoading || isUploadingAudio}
              className="bg-blue-500 text-white px-3 py-2 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              title="Subir archivo de audio"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-medium">Audio</span>
            </button>
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
