import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import IDUpload from '@/components/react/IDUpload';

interface MergeRequestFormProps {
  userId: string;
  userEmail: string;
}

interface LobbyistProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  slug: string;
  cities: string[] | null;
  subject_areas: string[] | null;
  bio: string | null;
  subscription_tier: string;
  view_count: number;
  is_claimed: boolean;
  claimed_by: string | null;
}

export default function MergeRequestForm({ userId, userEmail }: MergeRequestFormProps) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<LobbyistProfile[]>([]);
  const [primaryProfileId, setPrimaryProfileId] = useState<string | null>(null);
  const [duplicateProfileId, setDuplicateProfileId] = useState<string | null>(null);
  const [verificationDocumentUrl, setVerificationDocumentUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      // Get profiles that user has claimed or that match their email
      const { data, error: fetchError } = await supabase
        .from('lobbyists')
        .select('*')
        .or(`claimed_by.eq.${userId},email.eq.${userEmail}`)
        .order('last_name');

      if (fetchError) throw fetchError;

      setProfiles(data || []);

      // Auto-select user's claimed profile as primary if exists
      const claimedProfile = data?.find((p: LobbyistProfile) => p.claimed_by === userId);
      if (claimedProfile) {
        setPrimaryProfileId(claimedProfile.id);
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!primaryProfileId || !duplicateProfileId) {
      setError('Please select both profiles to merge');
      return;
    }

    if (primaryProfileId === duplicateProfileId) {
      setError('Cannot merge a profile with itself. Please select two different profiles.');
      return;
    }

    if (!verificationDocumentUrl) {
      setError('Please upload your ID verification document');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/account/request-merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryProfileId,
          duplicateProfileId,
          verificationDocumentUrl
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit merge request');
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);
    } catch (err: any) {
      setError(err?.message || 'Error submitting merge request');
    } finally {
      setSubmitting(false);
    }
  };

  const getPrimaryProfile = () => profiles.find(p => p.id === primaryProfileId);
  const getDuplicateProfile = () => profiles.find(p => p.id === duplicateProfileId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="animate-spin h-8 w-8 text-texas-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-green-900 mb-2">Merge Request Submitted!</h3>
        <p className="text-green-700 mb-4">
          Your merge request has been submitted for review. We'll notify you within 48 hours.
        </p>
        <div className="flex items-center justify-center gap-2 text-green-600">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Redirecting to dashboard...</span>
        </div>
      </div>
    );
  }

  if (profiles.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-semibold mb-2">No Duplicate Profiles Found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          We couldn't find any duplicate profiles associated with your account.
        </p>
        <p className="text-sm text-muted-foreground">
          If you believe you have duplicate profiles, please <a href="mailto:support@texaslobby.org" className="text-texas-blue-500 hover:underline">contact support</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select Primary Profile */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-texas-blue-600 text-white text-xs font-bold">
            1
          </span>
          Select Primary Profile (Keep This One)
        </h4>
        <div className="space-y-3">
          {profiles.map((profile) => (
            <label
              key={profile.id}
              className={`block rounded-lg border-2 p-4 cursor-pointer transition-all ${
                primaryProfileId === profile.id
                  ? 'border-texas-blue-600 bg-texas-blue-50'
                  : 'border-border hover:border-texas-blue-300'
              }`}
            >
              <input
                type="radio"
                name="primary"
                value={profile.id}
                checked={primaryProfileId === profile.id}
                onChange={(e) => setPrimaryProfileId(e.target.value)}
                className="sr-only"
              />
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {profile.first_name} {profile.last_name}
                    {profile.is_claimed && profile.claimed_by === userId && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        Your Profile
                      </span>
                    )}
                    {profile.subscription_tier !== 'free' && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full uppercase">
                        {profile.subscription_tier}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile.email || 'No email'} • {profile.view_count} views
                  </p>
                  {profile.cities && profile.cities.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.cities.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>
                <a
                  href={`/lobbyists/${profile.slug}`}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-texas-blue-500 hover:underline"
                >
                  View →
                </a>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This profile will be kept and all data from the duplicate will be merged into it.
        </p>
      </div>

      {/* Step 2: Select Duplicate Profile */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-texas-blue-600 text-white text-xs font-bold">
            2
          </span>
          Select Duplicate Profile (Will Be Merged)
        </h4>
        <div className="space-y-3">
          {profiles
            .filter(p => p.id !== primaryProfileId)
            .map((profile) => (
            <label
              key={profile.id}
              className={`block rounded-lg border-2 p-4 cursor-pointer transition-all ${
                duplicateProfileId === profile.id
                  ? 'border-red-600 bg-red-50'
                  : 'border-border hover:border-red-300'
              }`}
            >
              <input
                type="radio"
                name="duplicate"
                value={profile.id}
                checked={duplicateProfileId === profile.id}
                onChange={(e) => setDuplicateProfileId(e.target.value)}
                className="sr-only"
              />
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {profile.first_name} {profile.last_name}
                    {profile.is_claimed && profile.claimed_by === userId && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        Your Profile
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile.email || 'No email'} • {profile.view_count} views
                  </p>
                  {profile.cities && profile.cities.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.cities.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>
                <a
                  href={`/lobbyists/${profile.slug}`}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-texas-blue-500 hover:underline"
                >
                  View →
                </a>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This profile will be hidden from public view and its data merged into the primary profile.
        </p>
      </div>

      {/* Step 3: Upload ID Verification */}
      {primaryProfileId && duplicateProfileId && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-texas-blue-600 text-white text-xs font-bold">
              3
            </span>
            Upload ID Verification
          </h4>
          <IDUpload
            userId={userId}
            onUploadComplete={(url) => {
              setVerificationDocumentUrl(url);
              setError('');
            }}
            onError={(errorMsg) => {
              setError(errorMsg);
              setVerificationDocumentUrl(null);
            }}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!primaryProfileId || !duplicateProfileId || !verificationDocumentUrl || submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting Request...
            </span>
          ) : (
            'Submit Merge Request'
          )}
        </Button>
      </div>

      {/* Preview Summary */}
      {primaryProfileId && duplicateProfileId && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="font-medium mb-2 text-sm">Merge Summary:</h4>
          <div className="text-sm space-y-1">
            <p>
              <strong>Keep:</strong> {getPrimaryProfile()?.first_name} {getPrimaryProfile()?.last_name}
            </p>
            <p>
              <strong>Merge:</strong> {getDuplicateProfile()?.first_name} {getDuplicateProfile()?.last_name}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              After approval, the duplicate profile will be hidden and all its data transferred to the primary profile.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
