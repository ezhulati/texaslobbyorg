import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface ClaimProfileFormProps {
  userId?: string;
  userEmail?: string;
}

export default function ClaimProfileForm({ userId, userEmail }: ClaimProfileFormProps) {
  const [searchEmail, setSearchEmail] = useState(userEmail || '');
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundProfiles, setFoundProfiles] = useState<any[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleClaim = async (lobbyistId: string, lobbyistEmail: string | null) => {
    if (!userId) {
      setError('You must be logged in to claim a profile');
      return;
    }

    // Verify email matches if lobbyist has an email on file
    if (lobbyistEmail && userEmail && lobbyistEmail.toLowerCase() !== userEmail.toLowerCase()) {
      setError('The email on this profile does not match your account email. Please contact support if you believe this is an error.');
      return;
    }

    setClaiming(true);
    setError('');

    try {
      // Update lobbyist profile
      const { error: updateError } = await supabase
        .from('lobbyists')
        .update({
          user_id: userId,
          is_claimed: true,
          email: userEmail, // Update email if not set
        })
        .eq('id', lobbyistId);

      if (updateError) throw updateError;

      // Update user role to lobbyist
      const { error: userError } = await supabase
        .from('users')
        .update({ role: 'lobbyist' })
        .eq('id', userId);

      if (userError) throw userError;

      setSuccess(true);

      // Redirect to onboarding after 2 seconds
      setTimeout(() => {
        window.location.href = '/onboarding';
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Error claiming profile');
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
        <h3 className="text-2xl font-bold text-green-900 mb-2">Profile Claimed Successfully!</h3>
        <p className="text-green-700 mb-4">
          Your profile has been claimed! Let's set it up to attract clients...
        </p>
        <div className="flex items-center justify-center gap-2 text-green-600">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Starting profile setup...</span>
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
                onClick={() => handleClaim(profile.id, profile.email)}
                disabled={claiming}
                className="flex-1"
              >
                {claiming ? 'Claiming...' : 'Claim This Profile'}
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
