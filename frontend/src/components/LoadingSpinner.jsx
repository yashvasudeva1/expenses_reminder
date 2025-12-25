/**
 * Loading Spinner Component
 */

import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ fullScreen = false, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={`${sizeClasses.lg} text-primary-500 animate-spin`} />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className={`${sizeClasses[size]} text-primary-500 animate-spin`} />
    </div>
  )
}
