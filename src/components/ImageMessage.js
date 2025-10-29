import React, { useState, useEffect } from 'react';
import { getWhatsAppImage } from '../services/apiService';

const ImageMessage = ({ multimediaId, caption, sender }) => {
  const [imageData, setImageData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Cargar la imagen cuando se monta el componente
  useEffect(() => {
    if (multimediaId) {
      loadImage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multimediaId]);

  // Manejar tecla Escape para cerrar modal
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeImageModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const loadImage = async () => {
    setIsLoading(true);
    setIsImageLoaded(false);
    setError(null);

    try {
      const result = await getWhatsAppImage(multimediaId);
      
      if (result.success) {
        setImageData(result.data);
        // No terminamos el loading aquí, esperamos a que la imagen se cargue en el navegador
      } else {
        setError(result.error);
        setIsLoading(false);
      }
    } catch (err) {
      setError('Error al cargar la imagen');
      console.error('Error loading image:', err);
      setIsLoading(false);
    }
  };

  const openImageModal = () => {
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
  };

  const handleImageLoad = () => {
    console.log('Image loaded successfully');
    setIsImageLoaded(true);
    setIsLoading(false);
  };

  const handleImageError = () => {
    console.log('Image failed to load');
    setError('Error al cargar la imagen');
    setIsLoading(false);
    setIsImageLoaded(false);
  };

  const downloadImage = async () => {
    if (!imageData || !imageData.url) return;

    try {
      // Fetch the image data
      const response = await fetch(imageData.url);
      const blob = await response.blob();
      
      // Determine file extension from MIME type
      const mimeType = imageData.mimeType || blob.type;
      let extension = 'jpg'; // default extension
      
      if (mimeType) {
        const mimeToExt = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'image/bmp': 'bmp',
          'image/svg+xml': 'svg'
        };
        extension = mimeToExt[mimeType] || 'jpg';
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp and correct extension
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `whatsapp-image-${timestamp}.${extension}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      setError('Error al descargar la imagen');
    }
  };

  const getContainerStyles = () => {
    const baseStyles = "max-w-xs lg:max-w-md";
    
    if (sender === 'bot' || sender === 'human_agent') {
      return `${baseStyles} bg-blue-500 text-white`;
    } else {
      return `${baseStyles} bg-white text-gray-800 border border-gray-200`;
    }
  };

  // Si no hay multimediaId, no mostrar nada
  if (!multimediaId) {
    return null;
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
        
        {/* Contenedor de imagen con dimensiones fijas */}
        <div className="mb-2 relative w-full h-48">
          {/* Loading inicial o mientras la imagen se carga */}
          {(isLoading && !imageData) || (imageData && !isImageLoaded) ? (
            <div className="w-full h-full bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Cargando imagen...</p>
              </div>
            </div>
          ) : null}
          
          {/* Imagen oculta para cargar (solo cuando tenemos datos pero no está cargada) */}
          {imageData && !isImageLoaded && (
            <img
              src={imageData.url}
              alt=""
              className="hidden"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
          
          {/* Imagen visible (solo se muestra cuando está completamente cargada) */}
          {imageData && isImageLoaded && (
            <img
              src={imageData.url}
              alt={caption || 'Imagen de WhatsApp'}
              className="w-full h-full object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
              onClick={openImageModal}
              title="Haz clic para ver en grande"
            />
          )}
        </div>
        
        {/* Caption si existe */}
        {caption && (
          <div className="mb-2">
            <p className="text-sm leading-relaxed">
              {caption}
            </p>
          </div>
        )}
        
        {/* Información del archivo y botón de descarga */}
        <div className="flex items-center justify-between text-xs opacity-75">
          <div className="flex items-center space-x-2">
            {imageData.fileSize && (
              <span>
                {formatFileSize(imageData.fileSize)}
              </span>
            )}
            {imageData.mimeType && (
              <span>
                {imageData.mimeType.split('/')[1]?.toUpperCase() || 'IMAGE'}
              </span>
            )}
          </div>
          
          {/* Botón de descarga */}
          <button
            onClick={downloadImage}
            className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors duration-200 ${
              sender === 'bot' || sender === 'human_agent' 
                ? 'bg-blue-400 hover:bg-blue-300 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Descargar imagen"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Descargar</span>
          </button>
        </div>
      </div>
      
      {/* Modal para ver imagen en grande */}
      {isModalOpen && imageData && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={closeImageModal}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Botón de cerrar */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors"
              title="Cerrar (ESC)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Imagen ajustada a la pantalla */}
            <img
              src={imageData.url}
              alt={caption || 'Imagen de WhatsApp'}
              className="max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Caption en el modal si existe */}
            {caption && (
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
                <p className="text-sm leading-relaxed">{caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
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
