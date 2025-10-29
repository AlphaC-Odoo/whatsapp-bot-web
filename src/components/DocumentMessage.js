import React, { useEffect, useState } from 'react';
import { getWhatsAppDocument } from '../services/apiService';

const DocumentMessage = ({ multimediaId, caption, sender }) => {
  const [docData, setDocData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (multimediaId) {
      loadDocument();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multimediaId]);

  const loadDocument = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getWhatsAppDocument(multimediaId);
      if (result.success) {
        setDocData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Error al cargar el documento');
    } finally {
      setIsLoading(false);
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

  const getButtonStyles = () => {
    const baseStyles = "inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
    if (sender === 'bot' || sender === 'human_agent') {
      return `${baseStyles} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white`;
    } else {
      return `${baseStyles} bg-gray-100 hover:bg-gray-200 focus:ring-gray-500 text-gray-700`;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(docData.url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documento.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar:', error);
      // Fallback: abrir en nueva pestaña
      window.open(docData.url, '_blank');
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
              📄 Documento
            </span>
          </div>
          <div className="w-full h-20 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Cargando documento...</p>
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
              📄 Documento
            </span>
          </div>
          <div className="w-full bg-red-100 rounded-lg p-3">
            <div className="text-sm text-red-600 font-medium">Error al cargar documento</div>
            <div className="text-xs text-red-500 mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!docData) return null;

  // Función para obtener la extensión correcta basada en el tipo MIME
  const getFileExtension = (mimeType) => {
    if (!mimeType) return 'bin';
    
    // Mapear tipos MIME específicos a extensiones
    const mimeToExtension = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'application/zip': 'zip',
      'application/x-rar-compressed': 'rar',
      'application/x-7z-compressed': '7z'
    };
    
    return mimeToExtension[mimeType] || mimeType.split('/')[1]?.toLowerCase() || 'bin';
  };

  const extension = getFileExtension(docData.mimeType);

  return (
    <div className={getContainerStyles()}>
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm">
            {sender === 'bot' && '🤖 '}
            {sender === 'human_agent' && '👤 '}
            📄 Documento
          </span>
        </div>

        <div className="mb-2 flex items-center space-x-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {docData.fileName || `documento.${extension}`}
            </div>
            <div className="text-xs opacity-75">
              {docData.fileSize ? formatFileSize(docData.fileSize) : ''}
              {docData.mimeType ? docData.mimeType === 'application/pdf' ? ` · PDF` : docData.mimeType === 'application/msword' ? ` · WORD` : docData.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? ` · WORD` : docData.mimeType === 'application/vnd.ms-excel' ? ` · XLS` : docData.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? ` · XLSX` : docData.mimeType === 'application/vnd.ms-powerpoint' ? ` · PPT` : docData.mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ? ` · PPTX` : docData.mimeType.startsWith('text/plain') ? ` · TXT` : docData.mimeType === 'text/csv' ? ` · CSV` : docData.mimeType === 'application/zip' ? ` · ZIP` : docData.mimeType === 'application/x-rar-compressed' ? ` · RAR` : docData.mimeType === 'application/x-7z-compressed' ? ` · 7Z` : ` · ${docData.mimeType}` : ''}
            </div>
          </div>

          <button
            onClick={handleDownload}
            className={getButtonStyles()}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            <span>Descargar</span>
          </button>
        </div>

        {caption && (
          <div className="mt-2">
            <p className="text-sm leading-relaxed">{caption}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentMessage;


