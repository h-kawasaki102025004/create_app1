import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  message?: string;
}

/**
 * Render a configurable loading spinner with optional caption text.
 *
 * @param size - Visual size of the spinner; one of `'small'`, `'medium'`, or `'large'` (default: `'medium'`)
 * @param className - Additional CSS classes applied to the outer container
 * @param message - Optional caption text displayed below the spinner
 * @returns A React element containing the spinner and optional message
 */
export function LoadingSpinner({ size = 'medium', className = '', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-b-2 border-green-600 ${sizeClasses[size]}`}
      ></div>
      {message && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Renders a full-screen loading overlay that centers a large spinner with an optional message.
 *
 * @param message - Text to display beneath the spinner (defaults to '読み込み中...').
 * @returns The full-screen loading overlay element.
 */
export function FullPageLoader({ message = '読み込み中...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <LoadingSpinner size="large" message={message} />
    </div>
  );
}