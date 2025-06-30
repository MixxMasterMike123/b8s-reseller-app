// FishingScoreCard component - Display overall fishing score
// Mobile-optimized with color-coded scoring

import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const FishingScoreCard = ({ score, size = 'normal' }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return CheckCircleIcon;
    if (score >= 60) return InformationCircleIcon;
    if (score >= 40) return ExclamationTriangleIcon;
    return XCircleIcon;
  };

  const getScoreText = (score) => {
    if (score >= 80) return 'Utmärkt';
    if (score >= 60) return 'Bra';
    if (score >= 40) return 'Okej';
    return 'Dåligt';
  };

  const color = getScoreColor(score);
  const Icon = getScoreIcon(score);
  const text = getScoreText(score);

  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600',
      score: 'text-green-900'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600',
      score: 'text-blue-900'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
      score: 'text-yellow-900'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
      score: 'text-red-900'
    }
  };

  const classes = colorClasses[color];
  const isCompact = size === 'compact';

  return (
    <div className={`
      ${classes.bg} ${classes.border} border rounded-lg p-4 
      ${isCompact ? 'text-center' : 'flex items-center space-x-4'}
    `}>
      <div className={`
        ${isCompact ? 'mx-auto mb-2' : ''} 
        flex items-center justify-center w-12 h-12 rounded-full bg-white
      `}>
        <Icon className={`h-6 w-6 ${classes.icon}`} />
      </div>
      
      <div className={isCompact ? 'text-center' : 'flex-1'}>
        <div className={`text-3xl font-bold ${classes.score} ${isCompact ? 'mb-1' : ''}`}>
          {score}
        </div>
        <div className={`text-sm font-medium ${classes.text}`}>
          {text} fiskeförhållanden
        </div>
        {!isCompact && (
          <div className="text-xs text-gray-600 mt-1">
            Baserat på väder, vatten och säsong
          </div>
        )}
      </div>
    </div>
  );
};

export default FishingScoreCard; 