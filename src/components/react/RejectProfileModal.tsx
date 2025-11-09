import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface RejectProfileModalProps {
  lobbyistId: string;
  lobbyistName: string;
  lobbyistEmail: string;
  isActive: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type RejectionCategory =
  | 'invalid_id'
  | 'incomplete_info'
  | 'duplicate_profile'
  | 'not_registered_lobbyist'
  | 'fake_profile'
  | 'other';

const REJECTION_CATEGORIES: { value: RejectionCategory; label: string }[] = [
  { value: 'invalid_id', label: 'Invalid or Unclear ID Document' },
  { value: 'incomplete_info', label: 'Incomplete Profile Information' },
  { value: 'duplicate_profile', label: 'Duplicate Profile' },
  { value: 'not_registered_lobbyist', label: 'Not a Registered Lobbyist' },
  { value: 'fake_profile', label: 'Fraudulent or Fake Profile' },
  { value: 'other', label: 'Other (Custom Reason)' },
];

const DEFAULT_MESSAGES: Record<RejectionCategory, string> = {
  invalid_id: `We were unable to verify your identity from the submitted document. Please upload a clear, high-quality photo of your government-issued ID (driver's license, passport, or state ID) where your name is clearly visible.`,

  incomplete_info: `Your profile is missing required information. Please complete all fields including your professional bio, cities served, expertise areas, and contact information. A complete profile helps businesses find and connect with you.`,

  duplicate_profile: `We found an existing profile in our system that appears to match your information. Please search for your profile and use the "Claim Profile" feature instead. If you believe this is an error, please contact support at support@texaslobby.org.`,

  not_registered_lobbyist: `We could not verify your registration with the Texas Ethics Commission. Please ensure you are currently registered as a lobbyist at ethics.state.tx.us and provide your registration number in your profile. If you need assistance, contact support at support@texaslobby.org.`,

  fake_profile: `This profile appears to be fraudulent or impersonates another individual. If you believe this is an error, please contact support at support@texaslobby.org with documentation to verify your identity.`,

  other: `Your profile requires revisions before we can approve it. Please review the feedback below and make the necessary corrections.`,
};

export default function RejectProfileModal({
  lobbyistId,
  lobbyistName,
  lobbyistEmail,
  isActive,
  onClose,
  onSuccess,
}: RejectProfileModalProps) {
  const [category, setCategory] = useState<RejectionCategory>('other');
  const [userMessage, setUserMessage] = useState(DEFAULT_MESSAGES.other);
  const [adminNotes, setAdminNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryChange = (newCategory: RejectionCategory) => {
    setCategory(newCategory);
    setUserMessage(DEFAULT_MESSAGES[newCategory]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Confirmation check for active profiles
    if (isActive && !confirmed) {
      setError('This profile is currently active. Please confirm you want to reject it.');
      return;
    }

    if (!userMessage.trim()) {
      setError('Please provide a reason for rejection that will be sent to the user.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/reject-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lobbyistId,
          category,
          userMessage: userMessage.trim(),
          adminNotes: adminNotes.trim() || undefined,
          sendEmail,
          confirmed: isActive ? confirmed : true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle confirmation requirement
        if (data.requireConfirmation) {
          setError(data.error);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to reject profile');
      }

      // Success
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Reject Profile</h2>
            <p className="text-sm text-gray-600 mt-1">
              {lobbyistName} ({lobbyistEmail})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Active Profile Warning */}
          {isActive && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    This profile is currently active and visible to the public
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Rejecting will immediately deactivate it and notify the user
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Rejection Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-900 mb-2">
              Rejection Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as RejectionCategory)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-texas-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {REJECTION_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Selecting a category will auto-fill a template message below
            </p>
          </div>

          {/* User Message */}
          <div>
            <label htmlFor="userMessage" className="block text-sm font-medium text-gray-900 mb-2">
              Message to User
              <span className="text-red-600 ml-1">*</span>
            </label>
            <textarea
              id="userMessage"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-texas-blue-500 focus:border-transparent resize-none"
              placeholder="Explain what needs to be corrected..."
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will be sent to the user via email. Be constructive and specific.
            </p>
          </div>

          {/* Admin Notes (Private) */}
          <div>
            <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-900 mb-2">
              Admin Notes (Private)
            </label>
            <textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-texas-blue-500 focus:border-transparent resize-none"
              placeholder="Internal notes (not visible to user)..."
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional internal notes for admin reference only
            </p>
          </div>

          {/* Send Email Checkbox */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-texas-blue-600 focus:ring-texas-blue-500"
              disabled={loading}
            />
            <label htmlFor="sendEmail" className="text-sm">
              <span className="font-medium text-gray-900">Send rejection email to user</span>
              <p className="text-gray-600 mt-0.5">
                Recommended: Notifies the user with actionable steps to resubmit
              </p>
            </label>
          </div>

          {/* Confirmation Checkbox for Active Profiles */}
          {isActive && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <input
                type="checkbox"
                id="confirmed"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                disabled={loading}
              />
              <label htmlFor="confirmed" className="text-sm">
                <span className="font-medium text-yellow-900">
                  I confirm I want to reject this active profile
                </span>
                <p className="text-yellow-700 mt-0.5">
                  This will immediately deactivate the profile and notify {lobbyistName}
                </p>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading || (isActive && !confirmed)}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Rejecting...
                </span>
              ) : (
                'Reject Profile'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
