import { useState } from 'react';

interface ProfileVisibilityToggleProps {
  initialIsActive: boolean;
}

export default function ProfileVisibilityToggle({ initialIsActive }: ProfileVisibilityToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleToggle = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/profile/toggle-visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setIsActive(data.is_active);
        setMessage(data.message);

        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);

        // Reload page after a short delay to update all status indicators
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage('Error: ' + (data.error || 'Failed to update visibility'));
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      setMessage('Error: Failed to update visibility');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">Directory Visibility</h3>
          <p className="text-sm text-muted-foreground">
            {isActive
              ? 'Your profile appears in our directory, city pages, and homepage'
              : 'Your profile is hidden from all public listings (direct link still works)'}
          </p>
        </div>
        <div className="ml-6 flex items-center gap-3">
          <div className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${
            isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isActive ? '🟢 Listed' : '🔴 Unlisted'}
          </div>

          {/* Toggle Switch */}
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-texas-blue-500 focus:ring-offset-2 ${
              isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : isActive
                  ? 'bg-green-600'
                  : 'bg-gray-400'
            }`}
            role="switch"
            aria-checked={isActive}
            aria-label="Toggle directory visibility"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-7' : 'translate-x-1'
              }`}
            >
              {isLoading && (
                <svg className="h-6 w-6 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`mt-3 p-3 rounded-md text-sm ${
          message.startsWith('Error')
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Hiding removes you from our directory, city pages, and homepage.
          Your direct profile link still works for existing clients. This does not affect Google search results.
        </p>
      </div>
    </div>
  );
}
