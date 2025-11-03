import React, { useState, useRef, useEffect } from 'react';
import MediaRecorder from 'opus-media-recorder';

const AudioRecorder = ({ onSend, onCancel, isVisible }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // NUEVA FUNCIÓN: Centraliza la lógica de limpieza de estado
  const resetState = () => {
    console.log('DADU: Reseteando el estado del audio');
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    audioChunksRef.current = [];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const workerOptions = {
        encoderWorkerFactory: function () {
          return new Worker(process.env.PUBLIC_URL + '/opus-media-recorder/encoderWorker.umd.js')
        },
        OggOpusEncoderWasmPath: process.env.PUBLIC_URL + '/opus-media-recorder/OggOpusEncoder.wasm',
        WebMOpusEncoderWasmPath: process.env.PUBLIC_URL + '/opus-media-recorder/WebMOpusEncoder.wasm',
      };
      
      const options = {
        mimeType: 'audio/ogg; codecs=opus',
        audioBitsPerSecond: 128000
      };

      mediaRecorderRef.current = new MediaRecorder(stream, options, workerOptions);
      mediaRecorderRef.current.shouldSendAfterStop = false;
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const currentStream = streamRef.current;
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.shouldSendAfterStop) {
            const newAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
            console.log(`✅ Audio grabado en formato OGG: ${newAudioBlob.type}, tamaño: ${newAudioBlob.size} bytes`);
            onSend(newAudioBlob);
            resetState(); // Usando la nueva función
        }
        
        mediaRecorderRef.current = null;
      };

      mediaRecorderRef.current.addEventListener('error', (event) => {
        console.error('Error en OpusMediaRecorder:', event.error);
        alert('Error al grabar audio. Inténtalo de nuevo.');
        resetState(); // Limpiar en caso de error
      });

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopRecording = (send = false) => {
    console.log('DADU: Stopping recording');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.shouldSendAfterStop = send;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleCancel = () => {
    console.log('DADU: Cancelling recording');
    if (mediaRecorderRef.current && isRecording) {
        stopRecording(false);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    resetState(); // Usando la nueva función
    onCancel();
  };

  const handleSend = () => {
    console.log('DADU: Sending audio');
    if (isRecording) {
      stopRecording(true);
    } else if (audioBlob) {
      console.log(`📤 Enviando audio OGG: ${audioBlob.type}, tamaño: ${audioBlob.size} bytes`);
      onSend(audioBlob);
      resetState(); // Usando la nueva función
    }
  };

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!isVisible) {
      console.log('DADU: Cleaning up on hide');
      if(isRecording) {
        stopRecording(false);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
      resetState(); // Usando la nueva función
    }
  // eslint-disable-next-line 
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && !isRecording && !audioBlob && !audioUrl && !mediaRecorderRef.current) {
      console.log('DADU: Starting recording on show');
      startRecording();
    }
  // eslint-disable-next-line
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    // ... El JSX se mantiene exactamente igual ...
    <div className="absolute bottom-16 left-0 right-0 z-50 pointer-events-none">
      <div className="flex justify-center">
        <div className="bg-gray-50 rounded-lg p-4 w-96 shadow-lg border border-gray-200 pointer-events-auto">
        <div className="text-center">
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            {isRecording ? 'Grabando audio...' : 'Procesando grabación...'}
          </h3>
          
          <div className="mb-4">
            {isRecording ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xl font-mono text-red-500">
                  {formatTime(recordingTime)}
                </span>
              </div>
            ) : (
              <div className="text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="text-xs">Procesando grabación...</p>
              </div>
            )}
          </div>

          <div className="flex space-x-2 justify-center">
            {isRecording ? (
              <>
                <button
                  onClick={handleSend}
                  className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Enviar</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-4 py-2 rounded-full hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancelar</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AudioRecorder;