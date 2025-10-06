import React, { useState, useEffect, useRef } from 'react';
import { getWhatsAppVideo } from '../services/apiService';

const VideoMessage = ({ multimediaId, caption, sender }) => {
  const [videoData, setVideoData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  const videoRef = useRef(null);

  // Cargar el video cuando se monta el componente
  useEffect(() => {
    if (multimediaId) {
      loadVideo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multimediaId]);

  const loadVideo = async () => {
    setIsLoading(true);
    setError(null);
    // Reiniciar estados para una nueva carga de video
    setIsLoaded(false);
    setCurrentTime(0);
    setDuration(0);

    try {
      const result = await getWhatsAppVideo(multimediaId);
      
      if (result.success) {
        setVideoData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Error al cargar el video');
      console.error('Error loading video:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(err => {
        console.error('Error playing video:', err);
        setError('Error al reproducir el video');
      });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoaded(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    // Opcional: regresar el tiempo al inicio al terminar
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  const getContainerStyles = () => {
    const baseStyles = "max-w-xs lg:max-w-md";
    
    if (sender === 'bot' || sender === 'human_agent') {
      return `${baseStyles} bg-blue-500 text-white`;
    } else {
      return `${baseStyles} bg-white text-gray-800 border border-gray-200`;
    }
  };

  const getButtonStyles = () => {
    const baseStyles = "flex items-center justify-center w-8 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    if (sender === 'bot' || sender === 'human_agent') {
      return `${baseStyles} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white`;
    } else {
      return `${baseStyles} bg-gray-100 hover:bg-gray-200 focus:ring-gray-500 text-gray-700`;
    }
  };

  if (isLoading) {
    return (
      <div className={getContainerStyles()}>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm">
              {sender === 'bot' && '🤖 '}
              {sender === 'human_agent' && '👤 '}
              🎥 Video
            </span>
          </div>
          <div className="w-full h-48 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Cargando video...</p>
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
              🎥 Video
            </span>
          </div>
          <div className="w-full h-48 bg-red-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600 font-medium">Error al cargar video</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!videoData) {
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
            🎥 Video
          </span>
        </div>
        
        {/* Video container */}
        <div className="relative mb-2">
          <video
            ref={videoRef}
            src={videoData.url}
            className="w-full rounded-lg"
            preload="metadata"
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onError={() => setError('Error al cargar el video')}
            poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTJhNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNyZWFuZG8gdmlkZW8uLi48L3RleHQ+PC9zdmc+"
          />
          
          {/* Controles del video */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 rounded-b-lg">
            {/* Barra de progreso */}
            <div 
              className="w-full h-1 bg-white/30 rounded-full mb-2 cursor-pointer"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-white rounded-full transition-all duration-200"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            
            {/* Controles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Play/Pause button */}
                <button
                  onClick={togglePlayPause}
                  className={getButtonStyles()}
                  disabled={!isLoaded}
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                
                {/* Mute button */}
                <button
                  onClick={toggleMute}
                  className={getButtonStyles()}
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Tiempo */}
              <div className="text-white text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
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
        {videoData.fileSize && (
          <div className="flex items-center justify-between text-xs opacity-75">
            <span>
              {formatFileSize(videoData.fileSize)}
            </span>
            {videoData.mimeType && (
              <span>
                {videoData.mimeType.split('/')[1]?.toUpperCase() || 'VIDEO'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoMessage;
