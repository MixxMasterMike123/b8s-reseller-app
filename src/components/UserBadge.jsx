import React from 'react';

/**
 * UserBadge Component - Centralized user identification badges
 * 
 * Features:
 * - Consistent color assignment based on username hash
 * - Beautiful Tailwind badges with 8 color variants
 * - Dark mode support
 * - Hover tooltips with timestamps
 * - Reusable across entire application
 */

// User color assignment function with better distribution
const getUserBadgeColor = (userName) => {
  // Create a more distributed hash from the username
  let hash = 0;
  for (let i = 0; i < userName.length; i++) {
    const char = userName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Add additional entropy based on username length and first/last characters
  const entropy = userName.length * 31 + 
                  (userName.charCodeAt(0) || 0) * 17 + 
                  (userName.charCodeAt(userName.length - 1) || 0) * 13;
  
  hash = Math.abs(hash + entropy);
  
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-800', dark: 'dark:bg-blue-900 dark:text-blue-300' },
    { bg: 'bg-green-100', text: 'text-green-800', dark: 'dark:bg-green-900 dark:text-green-300' },
    { bg: 'bg-purple-100', text: 'text-purple-800', dark: 'dark:bg-purple-900 dark:text-purple-300' },
    { bg: 'bg-pink-100', text: 'text-pink-800', dark: 'dark:bg-pink-900 dark:text-pink-300' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', dark: 'dark:bg-indigo-900 dark:text-indigo-300' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800', dark: 'dark:bg-yellow-900 dark:text-yellow-300' },
    { bg: 'bg-red-100', text: 'text-red-800', dark: 'dark:bg-red-900 dark:text-red-300' },
    { bg: 'bg-gray-100', text: 'text-gray-800', dark: 'dark:bg-gray-700 dark:text-gray-300' }
  ];
  
  return colors[hash % colors.length];
};

/**
 * UserBadge Component
 * 
 * @param {string} userName - The display name of the user
 * @param {string} tooltip - Optional tooltip text (e.g., timestamp)
 * @param {string} size - Badge size: 'xs', 'sm', 'md', 'lg' (default: 'sm')
 * @param {string} className - Additional CSS classes
 * @param {React.ReactNode} children - Optional children to override userName display
 */
const UserBadge = ({ 
  userName, 
  tooltip = null, 
  size = 'sm', 
  className = '', 
  children = null 
}) => {
  if (!userName) return null;
  
  const color = getUserBadgeColor(userName);
  
  // Size variants
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.sm;
  
  return (
    <span 
      title={tooltip}
      className={`inline-flex items-center rounded-full font-medium me-2 ${sizeClass} ${color.bg} ${color.text} ${color.dark} ${className}`}
    >
      {children || userName}
    </span>
  );
};

/**
 * UserBadgeGroup Component - For displaying multiple users (e.g., creator → resolver)
 * 
 * @param {Array} users - Array of user objects with { name, tooltip, separator }
 * @param {string} size - Badge size for all badges
 * @param {string} className - Additional CSS classes
 */
const UserBadgeGroup = ({ users = [], size = 'sm', className = '' }) => {
  if (!users.length) return null;
  
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {users.map((user, index) => (
        <React.Fragment key={index}>
          <UserBadge 
            userName={user.name}
            tooltip={user.tooltip}
            size={size}
          />
          {user.separator && index < users.length - 1 && (
            <span className="text-xs text-gray-400">{user.separator}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default UserBadge;
export { UserBadgeGroup, getUserBadgeColor }; 