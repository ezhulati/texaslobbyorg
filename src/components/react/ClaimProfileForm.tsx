import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import IDUpload from '@/components/react/IDUpload';

interface ClaimProfileFormProps {
  userId?: string;
  userEmail?: string;
  autoDetect?: boolean;
  prefilledEmail?: string | null;
}

export default function ClaimProfileForm({
  userId,
  userEmail,
  autoDetect = false,
  prefilledEmail = null
}: ClaimProfileFormProps) {
  const [searchEmail, setSearchEmail] = useState(prefilledEmail || userEmail || '');
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundProfiles, setFoundProfiles] = useState<any[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedProfileForClaim, setSelectedProfileForClaim] = useState<any | null>(null);
  const [verificationDocumentUrl, setVerificationDocumentUrl] = useState<string | null>(null);

  // Auto-detect: trigger search on mount if coming from signup flow
  useEffect(() => {
    if (autoDetect && prefilledEmail) {
      console.log('[ClaimProfileForm] Auto-detecting profile for:', prefilledEmail);
      // Trigger search automatically
      handleSearchInternal();
    }
  }, [autoDetect, prefilledEmail]);

  const handleSearchInternal = async () => {
    setError('');
    setFoundProfiles([]);
    setLoading(true);

    try {
      let query = supabase
        .from('lobbyists')
        .select('*')
        .eq('is_active', true)
        .eq('is_claimed', false);

      if (searchEmail) {
        query = query.eq('email', searchEmail);
      } else if (searchName) {
        const nameParts = searchName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          const [firstName, ...lastNameParts] = nameParts;
          const lastName = lastNameParts.join(' ');
          query = query
            .ilike('first_name', `%${firstName}%`)
            .ilike('last_name', `%${lastName}%`);
        } else {
          query = query.or(`first_name.ilike.%${searchName}%,last_name.ilike.%${searchName}%`);
        }
      }

      const { data, error: searchError } = await query.limit(10);

      if (searchError) throw searchError;

      if (!data || data.length === 0) {
        setError('No unclaimed profiles found matching your search. Try a different email or name.');
      } else {
        setFoundProfiles(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Error searching for profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSearchInternal();
  };

  const handleSelectProfile = (profile: any) => {
    setSelectedProfileForClaim(profile);
    setVerificationDocumentUrl(null);
    setError('');
  };

  const handleCancelClaim = () => {
    setSelectedProfileForClaim(null);
    setVerificationDocumentUrl(null);
    setError('');
  };

  const handleClaim = async () => {
    if (!userId) {
      setError('You must be logged in to claim a profile');
      return;
    }

    if (!selectedProfileForClaim) {
      setError('No profile selected');
      return;
    }

    if (!verificationDocumentUrl) {
      setError('Please upload your ID verification document first');
      return;
    }

    setClaiming(true);
    setError('');

    try {
      console.log('[ClaimProfileForm] Submitting claim request for:', selectedProfileForClaim.id);

      // Call the secure API endpoint instead of direct Supabase calls
      const response = await fetch('/api/profile/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lobbyistId: selectedProfileForClaim.id,
          verificationDocumentUrl
        }),
      });

      console.log('[ClaimProfileForm] Claim API response status:', response.status);

      const result = await response.json();
      console.log('[ClaimProfileForm] Claim API result:', result);

      if (!response.ok) {
        console.error('[ClaimProfileForm] Claim failed with error:', result.error);
        throw new Error(result.error || 'Failed to submit claim request');
      }

      console.log('[ClaimProfileForm] Claim request submitted successfully');
      setSuccess(true);

      // Redirect to dashboard with pending status message
      setTimeout(() => {
        window.location.href = result.redirectTo || '/dashboard';
      }, 3000);
    } catch (err: any) {
      setError(err?.message || 'Error submitting claim request');
    } finally {
      setClaiming(false);
    }
  };

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
        <h3 className="text-2xl font-bold text-green-900 mb-2">Claim Request Submitted!</h3>
        <p className="text-green-700 mb-4">
          Your claim request has been submitted for verification. We'll review your ID document and approve your claim within 48 hours.
        </p>
        <p className="text-sm text-green-600 mb-4">
          You'll receive an email notification at <strong>{userEmail}</strong> once your claim is approved.
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

  // Show ID upload step if profile is selected
  if (selectedProfileForClaim && userId) {
    return (
      <div className="space-y-6">
        {/* Selected profile header */}
        <div className="rounded-lg border border-border p-4 bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-lg font-bold mb-1">
                Claiming Profile: {selectedProfileForClaim.first_name} {selectedProfileForClaim.last_name}
              </h4>
              {selectedProfileForClaim.email && (
                <p className="text-sm text-muted-foreground">
                  Email: {selectedProfileForClaim.email}
                </p>
              )}
              {selectedProfileForClaim.cities && selectedProfileForClaim.cities.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Cities: {selectedProfileForClaim.cities.join(', ')}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelClaim}
            >
              Change Profile
            </Button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-texas-blue-600 text-white text-sm font-bold">
            1
          </div>
          <span className="text-sm font-medium">Upload ID Verification</span>
        </div>

        {/* ID Upload component */}
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

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Submit claim button */}
        <div className="flex gap-3">
          <Button
            onClick={handleClaim}
            disabled={!verificationDocumentUrl || claiming}
            className="flex-1"
          >
            {claiming ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting Claim...
              </span>
            ) : (
              'Submit Claim Request'
            )}
          </Button>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">
                What happens next?
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Your claim will be reviewed within 48 hours</li>
                <li>You'll receive an email notification once approved</li>
                <li>After approval, you can edit your profile and subscribe to premium tiers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (foundProfiles.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Found {foundProfiles.length} {foundProfiles.length === 1 ? 'profile' : 'profiles'}
          </h3>
          <button
            onClick={() => setFoundProfiles([])}
            className="text-sm text-texas-blue-500 hover:underline"
          >
            Search again
          </button>
        </div>

        {foundProfiles.map((profile) => (
          <div
            key={profile.id}
            className="rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-xl font-bold mb-1">
                  {profile.first_name} {profile.last_name}
                </h4>
                {profile.cities && profile.cities.length > 0 && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {profile.cities.join(', ')}
                  </p>
                )}
                {profile.subject_areas && profile.subject_areas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {profile.subject_areas.slice(0, 3).map((area: string) => (
                      <span
                        key={area}
                        className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                )}
                {profile.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {profile.bio}
                  </p>
                )}
                {profile.email && (
                  <p className="text-sm text-muted-foreground">
                    Email: {profile.email}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <Button
                onClick={() => handleSelectProfile(profile)}
                className="flex-1"
              >
                Select This Profile →
              </Button>
              <a
                href={`/lobbyists/${profile.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                View Profile
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSearch} className="space-y-6">
      <div>
        <label htmlFor="searchEmail" className="block text-sm font-medium text-foreground mb-2">
          Search by Email
        </label>
        <Input
          id="searchEmail"
          type="email"
          value={searchEmail}
          onChange={(e) => {
            setSearchEmail(e.target.value);
            if (e.target.value) setSearchName('');
          }}
          placeholder="your@email.com"
          disabled={loading}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Use the email address associated with your lobbying registration
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <div>
        <label htmlFor="searchName" className="block text-sm font-medium text-foreground mb-2">
          Search by Name
        </label>
        <Input
          id="searchName"
          type="text"
          value={searchName}
          onChange={(e) => {
            setSearchName(e.target.value);
            if (e.target.value) setSearchEmail('');
          }}
          placeholder="John Doe"
          disabled={loading}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your full name as it appears in public records
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading || (!searchEmail && !searchName)}>
        {loading ? 'Searching...' : 'Search for My Profile'}
      </Button>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h4 className="font-medium mb-2">Don't see your profile?</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Our directory is based on Texas Ethics Commission data. If you're a registered lobbyist but can't find your profile, please contact us.
        </p>
        <a
          href="mailto:support@texaslobby.org"
          className="text-sm text-texas-blue-500 hover:underline"
        >
          Contact Support →
        </a>
      </div>
    </form>
  );
}
