import React from 'react';
import {
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

const FileIcon = ({ iconName, className = "w-6 h-6" }) => {
  const iconComponents = {
    'photo': PhotoIcon,
    'video-camera': VideoCameraIcon,
    'document-text': DocumentTextIcon,
    'archive-box': ArchiveBoxIcon,
    'paper-clip': PaperClipIcon
  };

  const IconComponent = iconComponents[iconName] || PaperClipIcon;
  
  return <IconComponent className={className} />;
};

export default FileIcon;