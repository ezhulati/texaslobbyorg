import { useState } from 'react';
import RejectProfileModal from './RejectProfileModal';
import { Button } from '@/components/ui/button';

interface PendingProfileActionsProps {
  profileId: string;
  profileName: string;
  profileEmail: string;
  isActive: boolean;
}

export default function PendingProfileActions({
  profileId,
  profileName,
  profileEmail,
  isActive,
}: PendingProfileActionsProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setError(null);
    setApproving(true);

    try {
      const formData = new FormData();
      formData.append('profileId', profileId);

      const response = await fetch('/api/admin/approve-profile', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to approve profile');
      }

      // Reload page to show updated list
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setApproving(false);
    }
  };

  const handleRejectSuccess = () => {
    // Reload page to show updated list
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}

      <Button
        onClick={handleApprove}
        disabled={approving}
        className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
      >
        {approving ? 'Approving...' : '✓ Approve'}
      </Button>

      <Button
        onClick={() => setShowRejectModal(true)}
        disabled={approving}
        className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
      >
        × Reject
      </Button>

      {showRejectModal && (
        <RejectProfileModal
          lobbyistId={profileId}
          lobbyistName={profileName}
          lobbyistEmail={profileEmail}
          isActive={isActive}
          onClose={() => setShowRejectModal(false)}
          onSuccess={handleRejectSuccess}
        />
      )}
    </div>
  );
}
