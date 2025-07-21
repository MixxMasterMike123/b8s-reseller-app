import React, { useState, useCallback } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { 
  validateFile, 
  formatFileSize, 
  getFileTypeInfo, 
  MAX_FILE_SIZE, 
  ALLOWED_FILE_TYPES 
} from '../../utils/fileUpload';

const FileUpload = ({ onFileSelect, onFileRemove, selectedFiles = [], disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrors([]);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, []);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    setErrors([]);
    processFiles(files);
  }, []);

  const processFiles = (files) => {
    const newErrors = [];
    const validFiles = [];

    files.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(`${file.name}: ${fileErrors.join(', ')}`);
      } else {
        validFiles.push(file);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    }

    if (validFiles.length > 0) {
      onFileSelect(validFiles);
    }
  };

  const removeFile = (index) => {
    onFileRemove(index);
  };

  const getAcceptedTypes = () => {
    return Object.keys(ALLOWED_FILE_TYPES).join(',');
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={getAcceptedTypes()}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-blue-600 hover:text-blue-500">
              Klicka för att ladda upp
            </span>{' '}
            eller dra och släpp
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP (max {formatFileSize(MAX_FILE_SIZE)})
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Filer kunde inte laddas upp
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Valda filer ({selectedFiles.length})
          </h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const fileTypeInfo = getFileTypeInfo(file.type);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className={`h-5 w-5 ${fileTypeInfo.color}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {fileTypeInfo.label}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    disabled={disabled}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 