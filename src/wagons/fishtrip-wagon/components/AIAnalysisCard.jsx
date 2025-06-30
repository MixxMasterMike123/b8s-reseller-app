// AIAnalysisCard component - Display Claude AI fishing analysis
// Mobile-optimized AI insights and recommendations

import React, { useState } from 'react';
import { 
  SparklesIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

const AIAnalysisCard = ({ analysis, className = '' }) => {
  const [expanded, setExpanded] = useState(false);

  if (!analysis) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI-analys</h3>
        </div>
        <div className="text-center py-4">
          <SparklesIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">AI-analys ej tillgänglig</p>
        </div>
      </div>
    );
  }

  // Parse the AI analysis to extract structured information
  const parseAnalysis = (text) => {
    const sections = {};
    const lines = text.split('\n');
    let currentSection = 'general';
    let currentContent = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for section headers (numbered or titled)
      if (trimmed.match(/^\d+\./)) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join(' ');
        }
        currentSection = trimmed.toLowerCase();
        currentContent = [];
      } else if (trimmed.match(/^(fiskarter|fisketider|tekniker|platser|säkerhet|poäng)/i)) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join(' ');
        }
        currentSection = trimmed.toLowerCase();
        currentContent = [];
      } else {
        currentContent.push(trimmed);
      }
    }

    // Add the last section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join(' ');
    }

    return sections;
  };

  const sections = parseAnalysis(analysis);
  const hasStructuredData = Object.keys(sections).length > 1;

  // Extract key insights for preview
  const getPreview = () => {
    if (hasStructuredData) {
      const firstSection = Object.values(sections)[0];
      return firstSection?.substring(0, 200) + (firstSection?.length > 200 ? '...' : '');
    }
    return analysis.substring(0, 200) + (analysis.length > 200 ? '...' : '');
  };

  const getSectionIcon = (sectionName) => {
    const name = sectionName.toLowerCase();
    if (name.includes('fiskarter') || name.includes('arter')) return '🐟';
    if (name.includes('tid') || name.includes('när')) return '⏰';
    if (name.includes('teknik') || name.includes('metod')) return '🎣';
    if (name.includes('plats') || name.includes('område')) return '📍';
    if (name.includes('säkerhet')) return '⚠️';
    if (name.includes('poäng') || name.includes('bedömning')) return '📊';
    return '💡';
  };

  const formatSectionName = (sectionName) => {
    // Clean up section names
    return sectionName
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/[:.]/g, '') // Remove colons and periods
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <SparklesIcon className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI-analys</h3>
        <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
          Claude 3.5 Sonnet
        </span>
      </div>

      <div className="space-y-4">
        {/* Preview */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <LightBulbIcon className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-purple-800 text-sm leading-relaxed">
                {getPreview()}
              </p>
            </div>
          </div>
        </div>

        {/* Structured sections (if available) */}
        {hasStructuredData && expanded && (
          <div className="space-y-4">
            {Object.entries(sections).slice(1).map(([sectionName, content], index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-lg">{getSectionIcon(sectionName)}</span>
                  <h4 className="font-medium text-gray-900">
                    {formatSectionName(sectionName)}
                  </h4>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Full text (if no structured data) */}
        {!hasStructuredData && expanded && (
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {analysis}
            </p>
          </div>
        )}

        {/* Expand/Collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
        >
          <span className="text-sm font-medium">
            {expanded ? 'Visa mindre' : 'Visa fullständig analys'}
          </span>
          {expanded ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>

        {/* AI disclaimer */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            AI-analys genererad av Claude 3.5 Sonnet • Använd som vägledning tillsammans med egen bedömning
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisCard; 