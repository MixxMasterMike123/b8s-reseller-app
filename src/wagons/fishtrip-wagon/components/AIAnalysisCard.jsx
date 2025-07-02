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
    const iconClass = "w-5 h-5";
    
    if (name.includes('fiskarter') || name.includes('arter')) 
      return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2C7.582 4 4 7.582 4 12s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm3.5 6a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/></svg>;
    if (name.includes('tid') || name.includes('när')) 
      return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>;
    if (name.includes('teknik') || name.includes('metod')) 
      return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>;
    if (name.includes('plats') || name.includes('område')) 
      return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
    if (name.includes('säkerhet')) 
      return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
    if (name.includes('poäng') || name.includes('bedömning')) 
      return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M3 3v18h18v-2H5V3H3zm4 12h2v4H7v-4zm4-6h2v10h-2V9zm4-2h2v12h-2V7z"/></svg>;
    
    return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/></svg>;
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
                  <div className="text-gray-600">{getSectionIcon(sectionName)}</div>
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