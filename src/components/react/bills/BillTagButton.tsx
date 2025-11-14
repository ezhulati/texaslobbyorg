/**
 * BillTagButton Component
 *
 * Allows lobbyists to tag bills they're working on with their position
 * (supporting, monitoring, opposing) and add optional notes.
 * Only renders if user is authenticated as a lobbyist.
 */

import { useState, useEffect } from 'react';

type TagType = 'supporting' | 'monitoring' | 'opposing';

interface BillTagButtonProps {
  billId: string;
  billNumber: string;
  isAuthenticated: boolean;
  isLobbyist: boolean;
  lobbyistId?: string | null;
}

export default function BillTagButton({ billId, billNumber, isAuthenticated, isLobbyist, lobbyistId: initialLobbyistId }: BillTagButtonProps) {
  const [isTagged, setIsTagged] = useState(false);
  const [existingTag, setExistingTag] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lobbyistId, setLobbyistId] = useState<string | null>(null);

  // Form state
  const [tagType, setTagType] = useState<TagType>('monitoring');
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [showOnProfile, setShowOnProfile] = useState(true);

  useEffect(() => {
    if (isAuthenticated && isLobbyist) {
      const fromProp = initialLobbyistId || null;
      if (fromProp) {
        setLobbyistId(fromProp);
        checkTagStatus(fromProp);
        return;
      }
      // Fallback: resolve via API
      (async () => {
        try {
          const resp = await fetch('/api/lobbyist/me');
          if (resp.ok) {
            const json = await resp.json();
            const resolved = json.lobbyistId || null;
            setLobbyistId(resolved);
            if (resolved) checkTagStatus(resolved);
          }
        } catch {}
      })();
    }
    // Auto-open after login if intent=tag
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('intent') === 'tag' && url.searchParams.get('billId') === billId) {
        setShowModal(true);
        // Clean intent param to avoid re-triggering on subsequent navigations
        url.searchParams.delete('intent');
        history.replaceState(null, '', url.pathname + url.search);
      }
    } catch {}
  }, [isAuthenticated, isLobbyist, billId, initialLobbyistId]);

  const checkTagStatus = async (lid: string) => {
    try {
      const response = await fetch(`/api/bills/${billId}/tags?lobbyist_id=${lid}`);

      if (response.ok) {
        const { tags } = await response.json();
        const myTag = tags.find((t: any) => t.lobbyist_id === lid);

        if (myTag) {
          setIsTagged(true);
          setExistingTag(myTag);
          setTagType(myTag.tag_type || 'monitoring');
          setNotes(myTag.notes || myTag.context_notes || '');
          setIsPublic(myTag.is_public ?? true);
          setShowOnProfile(myTag.show_on_profile ?? true);
        }
      }
    } catch (err) {
      console.error('Failed to check tag status:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lobbyistId) {
      setError('We could not find your linked lobbyist profile. Please claim or link your profile to tag bills.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isTagged && existingTag) {
        // Update existing tag
        const response = await fetch(`/api/bills/${billId}/tags/${existingTag.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag_type: tagType,
            notes,
            is_public: isPublic,
            show_on_profile: showOnProfile,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update tag');
        }
      } else {
        // Create new tag
        const response = await fetch(`/api/bills/${billId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lobbyist_id: lobbyistId,
            tag_type: tagType,
            notes,
            is_public: isPublic,
            show_on_profile: showOnProfile,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create tag');
        }

        setIsTagged(true);
      }

      setShowModal(false);
      if (lobbyistId) {
        await checkTagStatus(lobbyistId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTag = async () => {
    if (!existingTag || !confirm('Remove your tag from this bill?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/bills/${billId}/tags/${existingTag.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove tag');
      }

      setIsTagged(false);
      setExistingTag(null);
      setShowModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove tag';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const tagTypeConfig = {
    supporting: { label: 'Supporting', color: 'green', icon: '👍' },
    monitoring: { label: 'Monitoring', color: 'blue', icon: '👁️' },
    opposing: { label: 'Opposing', color: 'red', icon: '👎' },
  };

  return (
    <>
      <button
        onClick={() => {
          if (!isAuthenticated || !isLobbyist) {
            const url = new URL(window.location.href);
            url.searchParams.set('intent', 'tag');
            url.searchParams.set('billId', billId);
            window.location.href = `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`;
            return;
          }
          setShowModal(true);
        }}
        className={`inline-flex items-center gap-2 px-6 py-3 font-medium rounded-md transition-colors ${
          isTagged
            ? 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        {isTagged ? (
          <>
            <span>{tagTypeConfig[existingTag?.tag_type || 'monitoring'].icon}</span>
            <span>Tagged: {tagTypeConfig[existingTag?.tag_type || 'monitoring'].label}</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>Tag This Bill</span>
          </>
        )}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {isTagged ? 'Update Tag' : 'Tag Bill'}: {billNumber}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tag Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Position
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(tagTypeConfig) as TagType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTagType(type)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        tagType === type
                          ? `border-${tagTypeConfig[type].color}-500 bg-${tagTypeConfig[type].color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{tagTypeConfig[type].icon}</div>
                      <div className="text-sm font-medium">{tagTypeConfig[type].label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add your insights about this bill..."
                />
              </div>

              {/* Visibility Settings */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="text-sm text-gray-700">
                    Show publicly on bill page
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showOnProfile"
                    checked={showOnProfile}
                    onChange={(e) => setShowOnProfile(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="showOnProfile" className="text-sm text-gray-700">
                    Show on my profile (bill and position)
                  </label>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {isLoading ? 'Saving...' : isTagged ? 'Update Tag' : 'Tag Bill'}
                </button>
                {isTagged && (
                  <button
                    type="button"
                    onClick={handleRemoveTag}
                    disabled={isLoading}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 font-medium"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
