import React, { useState, useRef, useEffect } from 'react';

import { getWhatsAppAudio } from '../services/apiService';

const AudioPlayer = ({ multimediaId, sender }) => {
  const [audioData, setAudioData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const audioRef = useRef(null);

  // Cargar el archivo de audio cuando se monta el componente
  useEffect(() => {
    if (multimediaId) {
      loadAudio();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multimediaId]);

  const loadAudio = async () => {
    setIsLoading(true);
    setError(null);
    // Reiniciar estados para una nueva carga de audio
    setIsLoaded(false);
    setCurrentTime(0);

    try {
      const result = await getWhatsAppAudio(multimediaId);
      
      if (result.success) {
        setAudioData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Error al cargar el archivo de audio');
      console.error('Error loading audio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Error al reproducir el audio');
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    setIsLoaded(true);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    // Opcional: regresar el tiempo al inicio al terminar
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
    }
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

  const getPlayerStyles = () => {
    const baseStyles = "flex items-center space-x-3 p-3 rounded-lg max-w-sm";
    
    if (sender === 'bot' || sender === 'human_agent') {
      return `${baseStyles} bg-blue-500 text-white`;
    } else {
      return `${baseStyles} bg-white text-gray-800 border border-gray-200`;
    }
  };

  const getButtonStyles = () => {
    const baseStyles = "flex items-center justify-center w-10 h-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    if (sender === 'bot' || sender === 'human_agent') {
      return `${baseStyles} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white`;
    } else {
      return `${baseStyles} bg-gray-100 hover:bg-gray-200 focus:ring-gray-500 text-gray-700`;
    }
  };

  if (isLoading) {
    return (
      <div className={getPlayerStyles()}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="text-xs text-gray-500">Cargando audio...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={getPlayerStyles()}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Error al cargar audio</div>
            <div className="text-xs opacity-75">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!audioData) {
    return null;
  }

  return (
    <div className={getPlayerStyles()}>
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={audioData.url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      {/* Play/Pause button */}
      <button
        onClick={togglePlayPause}
        className={getButtonStyles()}
        disabled={!isLoaded} // Deshabilitado hasta que los metadatos carguen
        title={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Audio info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs opacity-75">
            {Math.floor(currentTime)}s
          </span>
          {audioData.fileSize && (
            <span className="text-xs opacity-75">
              {formatFileSize(audioData.fileSize)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;