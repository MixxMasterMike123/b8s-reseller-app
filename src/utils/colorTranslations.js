/**
 * Color Translation Utilities for B2C Shop
 * Maps database color values to translatable keys
 */

/**
 * Translates a database color value to the appropriate language
 * @param {string} colorValue - Raw color value from database (e.g., "Röd", "Transparent")
 * @param {function} t - Translation function from useTranslation
 * @returns {string} - Translated color name
 */
export const translateColor = (colorValue, t) => {
  if (!colorValue || !t) return colorValue || 'Standard';

  // Map database color values to translation keys
  const colorKeyMap = {
    'Transparent': 'color_transparent',
    'Röd': 'color_röd', 
    'Fluorescerande': 'color_fluorescerande',
    'Glitter': 'color_glitter'
  };

  const translationKey = colorKeyMap[colorValue];
  
  if (translationKey) {
    // Use translation with fallback to original value
    return t(translationKey, colorValue);
  }
  
  // Return original value if no translation key found
  return colorValue;
};

/**
 * Gets a color key for translation from a color value
 * @param {string} colorValue - Raw color value from database
 * @returns {string} - Translation key (e.g., "color_röd")
 */
export const getColorTranslationKey = (colorValue) => {
  const colorKeyMap = {
    'Transparent': 'color_transparent',
    'Röd': 'color_röd', 
    'Fluorescerande': 'color_fluorescerande',
    'Glitter': 'color_glitter'
  };

  return colorKeyMap[colorValue] || null;
};

/**
 * Gets all available colors with their translation keys
 * @returns {Array} - Array of {value, key} objects
 */
export const getAllColors = () => {
  return [
    { value: 'Transparent', key: 'color_transparent' },
    { value: 'Röd', key: 'color_röd' },
    { value: 'Fluorescerande', key: 'color_fluorescerande' },
    { value: 'Glitter', key: 'color_glitter' }
  ];
}; 