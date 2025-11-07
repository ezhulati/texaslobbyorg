import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface AuthFormProps {
  mode: 'login' | 'signup';
  redirectTo?: string;
}

export default function AuthForm({ mode, redirectTo = '/dashboard' }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userType, setUserType] = useState<'searcher' | 'lobbyist'>('searcher');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              user_type: userType,
            },
            emailRedirectTo: `${window.location.origin}/auth/verify`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Immediately create user record (since trigger might not work due to permissions)
          // TODO: Re-enable first_name/last_name once schema cache refreshes
          const { error: upsertError } = await supabase.from('users').upsert({
            id: data.user.id,
            email: data.user.email!,
            role: userType,
            // first_name: firstName || null,  // Commented until schema cache refreshes
            // last_name: lastName || null,      // Commented until schema cache refreshes
            full_name: `${firstName} ${lastName}`.trim() || null,
          });

          if (upsertError) {
            console.error('Error creating user record:', upsertError);
            // Don't throw error - user was created in auth, we'll retry on verification
          }

          // Redirect based on user type
          if (userType === 'lobbyist') {
            window.location.href = '/create-profile';
          } else {
            window.location.href = '/lobbyists';
          }
        }
      } else {
        // Sign in via API endpoint (server-side auth with cookies)
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Login failed');
        }

        // Redirect on successful login
        window.location.href = redirectTo;
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
        },
      });

      if (magicLinkError) throw magicLinkError;

      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Check your email</h3>
        <p className="text-sm text-green-700">
          We've sent you a magic link to <strong>{email}</strong>. Click the link in the email to sign in.
        </p>
        <button
          onClick={() => setMagicLinkSent(false)}
          className="mt-4 text-sm text-green-800 underline hover:text-green-900"
        >
          Send another link
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                First Name
              </label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                Last Name
              </label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                disabled={loading}
              />
            </div>
          </>
        )}

        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              I am:
            </label>
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="userType"
                  value="searcher"
                  checked={userType === 'searcher'}
                  onChange={(e) => setUserType(e.target.value as 'searcher' | 'lobbyist')}
                  className="w-4 h-4 text-texas-blue-600 border-gray-300 focus:ring-texas-blue-500"
                  disabled={loading}
                />
                <span className="ml-3 text-sm text-foreground">
                  Searching for a lobbyist
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="userType"
                  value="lobbyist"
                  checked={userType === 'lobbyist'}
                  onChange={(e) => setUserType(e.target.value as 'searcher' | 'lobbyist')}
                  className="w-4 h-4 text-texas-blue-600 border-gray-300 focus:ring-texas-blue-500"
                  disabled={loading}
                />
                <span className="ml-3 text-sm text-foreground">
                  A registered Texas lobbyist
                </span>
              </label>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            disabled={loading}
          />
          {mode === 'signup' && (
            <p className="mt-1 text-xs text-muted-foreground">
              Must be at least 6 characters
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
        </Button>
      </form>

      {mode === 'login' && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <form onSubmit={handleMagicLink}>
            <Button type="submit" variant="outline" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Magic Link'}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              We'll email you a link to sign in without a password
            </p>
          </form>
        </>
      )}

      {mode === 'login' && (
        <div className="text-center">
          <a
            href="/auth/forgot-password"
            className="text-sm text-texas-blue-500 hover:underline"
          >
            Forgot your password?
          </a>
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <a href="/signup" className="text-texas-blue-500 hover:underline">
              Sign up
            </a>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <a href="/login" className="text-texas-blue-500 hover:underline">
              Sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
