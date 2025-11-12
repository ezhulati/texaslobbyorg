import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import IDUpload from '@/components/react/IDUpload';

interface ClaimProfileSearchProps {
  isAuthenticated: boolean;
  userId?: string;
  userEmail?: string;
}

export default function ClaimProfileSearch({
  isAuthenticated,
  userId,
  userEmail
}: ClaimProfileSearchProps) {
  const [searchEmail, setSearchEmail] = useState(userEmail || '');
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundProfiles, setFoundProfiles] = useState<any[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedProfileForClaim, setSelectedProfileForClaim] = useState<any | null>(null);
  const [selectedProfilePreview, setSelectedProfilePreview] = useState<any | null>(null);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [verificationDocumentUrl, setVerificationDocumentUrl] = useState<string | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profilePreviewRef = useRef<HTMLDivElement>(null);

  // Scroll to keep search bar in view when profile appears
  useEffect(() => {
    if (selectedProfilePreview && searchContainerRef.current) {
      setTimeout(() => {
        searchContainerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100); // Small delay to let the card render first
    }
  }, [selectedProfilePreview]);

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Only update state if clicking outside and autocomplete is currently shown
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowAutocomplete(prev => prev ? false : prev);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-load profile if returning from login with lobbyist ID in URL
  useEffect(() => {
    const loadProfileFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const lobbyistId = params.get('lobbyist');

      if (lobbyistId && isAuthenticated && !selectedProfileForClaim) {
        try {
          const { data, error } = await supabase
            .from('lobbyists')
            .select('*')
            .eq('id', lobbyistId)
            .eq('is_claimed', false)
            .is('claimed_by', null)
            .single();

          if (data && !error) {
            setSelectedProfileForClaim(data);
            // Clean up URL
            window.history.replaceState({}, '', '/claim-profile');
          }
        } catch (err) {
          console.error('Error loading profile from URL:', err);
        }
      }
    };

    loadProfileFromUrl();
  }, [isAuthenticated]);

  // Live autocomplete search as user types
  useEffect(() => {
    const searchQuery = searchEmail || searchName;

    // Don't search if query is too short
    if (searchQuery.length < 3) {
      setFoundProfiles([]);
      setShowAutocomplete(false);
      setError('');
      setLoading(false);
      return;
    }

    // Show loading immediately
    setLoading(true);

    // Debounce the search - wait for user to stop typing
    const timeoutId = setTimeout(async () => {
      setError('');

      try {
        let query = supabase
          .from('lobbyists')
          .select('*')
          .eq('is_active', true)
          .eq('is_claimed', false)
          .is('claimed_by', null);

        if (searchEmail) {
          query = query.ilike('email', `%${searchEmail}%`);
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

        const { data, error: searchError } = await query.limit(5);

        if (searchError) throw searchError;

        setFoundProfiles(data || []);
        setShowAutocomplete(true);

        if (!data || data.length === 0) {
          setError('No matching profiles found');
        }
      } catch (err: any) {
        console.error('Autocomplete search error:', err);
        setError(err?.message || 'Error searching');
        setFoundProfiles([]);
      } finally {
        setLoading(false);
      }
    }, 600); // 600ms debounce - longer wait for user to stop typing

    return () => clearTimeout(timeoutId);
  }, [searchEmail, searchName]);

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
    console.log('[ClaimProfileSearch] handleSelectProfile called, isAuthenticated:', isAuthenticated, 'profile:', profile);

    // If not authenticated, show inline signup form
    if (!isAuthenticated) {
      console.log('[ClaimProfileSearch] Not authenticated, showing signup form');
      setShowSignupForm(true);
      return;
    }

    // If authenticated, proceed to claim
    console.log('[ClaimProfileSearch] Authenticated, showing claim form');
    setSelectedProfileForClaim(profile);
    setVerificationDocumentUrl(null);
    setError('');
  };

  const handleSignup = async (e: React.FormEvent) => {
    console.log('[ClaimProfileSearch] handleSignup called');
    e.preventDefault();

    if (!selectedProfilePreview) {
      console.error('[ClaimProfileSearch] No profile preview selected');
      return;
    }

    console.log('[ClaimProfileSearch] Signing up for profile:', selectedProfilePreview.id);
    setError('');
    setSigningUp(true);

    try {
      const payload = {
        email: signupEmail,
        password: signupPassword,
        firstName: selectedProfilePreview.first_name,
        lastName: selectedProfilePreview.last_name,
        userType: 'lobbyist',
        lobbyistId: selectedProfilePreview.id
      };

      console.log('[ClaimProfileSearch] Calling signup API with payload:', {... payload, password: '***'});

      // Call signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('[ClaimProfileSearch] API response status:', response.status);
      const data = await response.json();
      console.log('[ClaimProfileSearch] API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Account created successfully!
      console.log('[ClaimProfileSearch] Account created, redirecting to claim-profile');
      // Reload page to get authenticated state and proceed to ID upload
      window.location.href = `/claim-profile?lobbyist=${selectedProfilePreview.id}`;
    } catch (err: any) {
      console.error('[ClaimProfileSearch] Signup error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setSigningUp(false);
    }
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


  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div className="relative" ref={searchContainerRef}>
          <label htmlFor="searchName" className="block text-sm font-semibold text-gray-900 mb-2.5">
            Start typing your name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <Input
              id="searchName"
              type="text"
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                if (e.target.value) setSearchEmail('');
              }}
              onFocus={() => {
                if (foundProfiles.length > 0) setShowAutocomplete(true);
              }}
              placeholder="Jane Smith"
              className="pl-11 pr-10 h-14 text-base"
              autoComplete="off"
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="animate-spin h-5 w-5 text-texas-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Type at least 3 characters - results appear below as you type
          </p>

          {/* Autocomplete Dropdown - clean simple list */}
          {showAutocomplete && foundProfiles.length > 0 && (
          <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-600 italic">
                Select your profile to continue
              </p>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {foundProfiles.map((profile, index) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    console.log('[ClaimProfileSearch] Autocomplete button clicked, profile:', profile);
                    setSelectedProfilePreview(profile);
                    setShowAutocomplete(false);

                    // If not authenticated, show signup form directly
                    if (!isAuthenticated) {
                      console.log('[ClaimProfileSearch] Not authenticated, showing signup form');
                      setShowSignupForm(true);
                    } else {
                      console.log('[ClaimProfileSearch] Authenticated, proceeding to claim');
                      handleSelectProfile(profile);
                    }
                  }}
                  className={`w-full px-4 py-3 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                    index === 0
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm">
                    {profile.first_name} {profile.last_name}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {[
                      profile.email,
                      profile.cities?.join(', ')
                    ].filter(Boolean).join(' • ')}
                  </div>
                </button>
              ))}
            </div>
          </div>
          )}

          {/* No Results Message */}
          {showAutocomplete && foundProfiles.length === 0 && !loading && searchName.length >= 3 && (
            <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">No profiles found matching "{searchName}"</p>
              <a
                href="/contact"
                className="text-xs text-texas-blue-600 hover:text-texas-blue-700 font-medium"
              >
                Need help? Contact support →
              </a>
            </div>
          )}
        </div>

      {/* Inline Signup Form - Professional */}
      {selectedProfilePreview && showSignupForm && !isAuthenticated && (
        <div ref={profilePreviewRef} className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-8 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center shadow-sm">
              <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">
              {selectedProfilePreview.first_name} {selectedProfilePreview.last_name}
            </p>
            <h3 className="text-xl font-bold text-gray-700 mb-1">
              Claim Your Professional Listing
            </h3>
          </div>

          <div className="bg-white rounded-xl p-6 mb-6">
            <p className="text-gray-700 mb-4 leading-relaxed">
              We've set up your listing with information from the Texas Ethics Commission. Once approved, you'll be able to edit any of this, add a profile photo, showcase clients, and even track bills you're working on.
            </p>

            {/* Profile Details Preview */}
            {(selectedProfilePreview.cities?.length > 0 || selectedProfilePreview.subject_areas?.length > 0) && (
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Current Listing Information</p>

                {selectedProfilePreview.cities && selectedProfilePreview.cities.length > 0 && (
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Cities</p>
                      <p className="text-sm text-gray-900">{selectedProfilePreview.cities.join(', ')}</p>
                    </div>
                  </div>
                )}

                {selectedProfilePreview.subject_areas && selectedProfilePreview.subject_areas.length > 0 && (
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Subject Areas</p>
                      <p className="text-sm text-gray-900">{selectedProfilePreview.subject_areas.join(', ')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-gray-600 leading-relaxed mt-4 pt-4 border-t border-gray-200">
              We verify your identity within 24-48 hours and notify you by email.
            </p>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900">
              Create your account to claim this listing
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <Input
                id="signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="h-12"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-900 mb-2">
                Create Password
              </label>
              <Input
                id="signup-password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="h-12"
              />
              <p className="mt-1 text-xs text-gray-500">At least 8 characters</p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={signingUp}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-4 text-base font-semibold text-white hover:bg-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingUp ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating your account...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Create Account & Continue
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-600">
            Already have an account? <a href="/login" className="text-texas-blue-600 hover:text-texas-blue-700 font-semibold">Sign in here</a>
          </p>
        </div>
      )}

      {/* Profile Preview Card */}
      {selectedProfilePreview && !showSignupForm && !selectedProfileForClaim && (
          <div ref={profilePreviewRef} className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-8 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-texas-blue-600 to-indigo-600 mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {selectedProfilePreview.first_name?.[0]}{selectedProfilePreview.last_name?.[0]}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {selectedProfilePreview.first_name} {selectedProfilePreview.last_name}
              </h3>
              {selectedProfilePreview.email && (
                <p className="text-sm text-gray-600 mb-2">
                  {selectedProfilePreview.email}
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg p-5 mb-6 space-y-3">
              {selectedProfilePreview.cities && selectedProfilePreview.cities.length > 0 && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-texas-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cities</p>
                    <p className="text-sm text-gray-900">{selectedProfilePreview.cities.join(', ')}</p>
                  </div>
                </div>
              )}

              {selectedProfilePreview.subject_areas && selectedProfilePreview.subject_areas.length > 0 && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-texas-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject Areas</p>
                    <p className="text-sm text-gray-900">{selectedProfilePreview.subject_areas.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                handleSelectProfile(selectedProfilePreview);
                setSelectedProfilePreview(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-4 text-base font-semibold text-white hover:bg-red-700 transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Get Started – Claim Profile
            </button>

            <p className="mt-4 text-center text-xs text-gray-600">
              Is this you? Click "Get Started" to claim and customize your profile
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
