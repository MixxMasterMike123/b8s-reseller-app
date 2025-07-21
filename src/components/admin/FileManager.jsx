import React, { useState } from 'react';
import { 
  DocumentIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ArrowDownTrayIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { formatFileSize, getFileTypeInfo } from '../../utils/fileUpload';

const FileManager = ({ 
  files = [], 
  onDeleteFile, 
  onToggleVisibility, 
  onUpdateDisplayName,
  disabled = false 
}) => {
  const [editingFile, setEditingFile] = useState(null);
  const [editName, setEditName] = useState('');

  const handleEditStart = (file) => {
    setEditingFile(file.id);
    setEditName(file.displayName || file.name);
  };

  const handleEditSave = () => {
    if (editName.trim() && editingFile) {
      onUpdateDisplayName(editingFile, editName.trim());
      setEditingFile(null);
      setEditName('');
    }
  };

  const handleEditCancel = () => {
    setEditingFile(null);
    setEditName('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const formatDate = (date) => {
    try {
      // Handle different date formats
      let dateObj;
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date && typeof date === 'object' && date.seconds) {
        // Firebase Timestamp object
        dateObj = new Date(date.seconds * 1000);
      } else if (date && typeof date === 'object' && date.toDate) {
        // Firebase Timestamp with toDate method
        dateObj = date.toDate();
      } else {
        // Fallback to current date
        dateObj = new Date();
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Okänd datum';
      }

      return dateObj.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error, date);
      return 'Okänd datum';
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Inga bilagor</h3>
        <p className="mt-1 text-sm text-gray-500">
          Ladda upp filer för att visa dem här.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          Bilagor ({files.length})
        </h4>
        <div className="text-xs text-gray-500">
          Klicka på ikonerna för att hantera filer
        </div>
      </div>

      <div className="space-y-2">
        {files.map((file) => {
          const fileTypeInfo = getFileTypeInfo(file.type);
          const isEditing = editingFile === file.id;

          return (
            <div
              key={file.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                file.isPublic 
                  ? 'bg-white border-gray-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* File Info */}
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <DocumentIcon className={`h-5 w-5 flex-shrink-0 ${fileTypeInfo.color}`} />
                
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      onBlur={handleEditSave}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <div>
                      <p className={`text-sm font-medium truncate ${
                        file.isPublic ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {file.displayName || file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {fileTypeInfo.label} • {formatDate(file.uploadedAt)}
                        {file.downloads > 0 && ` • ${file.downloads} nedladdningar`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 ml-3">
                {/* Download */}
                <a
                  href={file.url}
                  download={file.name}
                  className={`p-1 rounded transition-colors ${
                    file.isPublic 
                      ? 'text-blue-600 hover:bg-blue-50' 
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  title="Ladda ner"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </a>

                {/* Edit Name */}
                <button
                  onClick={() => handleEditStart(file)}
                  disabled={disabled}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  title="Redigera namn"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>

                {/* Toggle Visibility */}
                <button
                  onClick={() => onToggleVisibility(file.id)}
                  disabled={disabled}
                  className={`p-1 rounded transition-colors disabled:opacity-50 ${
                    file.isPublic 
                      ? 'text-green-600 hover:bg-green-50' 
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={file.isPublic ? 'Göm från besökare' : 'Visa för besökare'}
                >
                  {file.isPublic ? (
                    <EyeIcon className="h-4 w-4" />
                  ) : (
                    <EyeSlashIcon className="h-4 w-4" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDeleteFile(file.id)}
                  disabled={disabled}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Ta bort fil"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h5 className="text-xs font-medium text-gray-700 mb-2">Färgkodning:</h5>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <DocumentIcon className="h-3 w-3 text-red-500" />
            <span>PDF</span>
          </div>
          <div className="flex items-center space-x-2">
            <DocumentIcon className="h-3 w-3 text-blue-500" />
            <span>DOC/DOCX</span>
          </div>
          <div className="flex items-center space-x-2">
            <DocumentIcon className="h-3 w-3 text-green-500" />
            <span>XLS/XLSX</span>
          </div>
          <div className="flex items-center space-x-2">
            <DocumentIcon className="h-3 w-3 text-purple-500" />
            <span>ZIP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileManager; 