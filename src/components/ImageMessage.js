import React, { useState, useEffect } from 'react';
import { getWhatsAppImage } from '../services/apiService';

const ImageMessage = ({ multimediaId, caption, sender }) => {
  const [imageData, setImageData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Cargar la imagen cuando se monta el componente
  useEffect(() => {
    if (multimediaId) {
      loadImage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multimediaId]);

  const loadImage = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getWhatsAppImage(multimediaId);
      
      if (result.success) {
        setImageData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Error al cargar la imagen');
      console.error('Error loading image:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getContainerStyles = () => {
    const baseStyles = "max-w-xs lg:max-w-md";
    
    if (sender === 'bot' || sender === 'human_agent') {
      return `${baseStyles} bg-blue-500 text-white`;
    } else {
      return `${baseStyles} bg-white text-gray-800 border border-gray-200`;
    }
  };

  const getImageStyles = () => {
    const baseStyles = "w-full rounded-lg cursor-pointer transition-transform";
    
    if (isExpanded) {
      return `${baseStyles} transform scale-105`;
    }
    
    return baseStyles;
  };

  if (isLoading) {
    return (
      <div className={getContainerStyles()}>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm">
              {sender === 'bot' && '🤖 '}
              {sender === 'human_agent' && '👤 '}
              📷 Imagen
            </span>
          </div>
          <div className="w-full h-48 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Cargando imagen...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={getContainerStyles()}>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm">
              {sender === 'bot' && '🤖 '}
              {sender === 'human_agent' && '👤 '}
              📷 Imagen
            </span>
          </div>
          <div className="w-full h-48 bg-red-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600 font-medium">Error al cargar imagen</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!imageData) {
    return null;
  }

  return (
    <div className={getContainerStyles()}>
      <div className="p-4">
        {/* Header con emoji */}
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm">
            {sender === 'bot' && '🤖 '}
            {sender === 'human_agent' && '👤 '}
            📷 Imagen
          </span>
        </div>
        
        {/* Imagen */}
        <div className="mb-2">
          <img
            src={imageData.url}
            alt={caption || 'Imagen de WhatsApp'}
            className={getImageStyles()}
            onClick={toggleExpanded}
            onError={() => setError('Error al cargar la imagen')}
            title="Haz clic para expandir"
          />
        </div>
        
        {/* Caption si existe */}
        {caption && (
          <div className="mb-2">
            <p className="text-sm leading-relaxed">
              {caption}
            </p>
          </div>
        )}
        
        {/* Información del archivo */}
        {imageData.fileSize && (
          <div className="flex items-center justify-between text-xs opacity-75">
            <span>
              {formatFileSize(imageData.fileSize)}
            </span>
            {imageData.mimeType && (
              <span>
                {imageData.mimeType.split('/')[1]?.toUpperCase() || 'IMAGE'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Formatea el tamaño del archivo en formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default ImageMessage;
