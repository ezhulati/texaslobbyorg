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
  const [emailVerificationNeeded, setEmailVerificationNeeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Sign up via API endpoint (server-side auth with cookies)
        console.log('[AuthForm] Starting signup with email:', email, 'userType:', userType);

        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            userType
          }),
        });

        console.log('[AuthForm] Signup API response status:', response.status);

        const result = await response.json();
        console.log('[AuthForm] Signup API result:', result);

        if (!response.ok) {
          console.error('[AuthForm] Signup failed with error:', result.error);

          // Special handling for duplicate email
          if (result.code === 'EMAIL_EXISTS') {
            setError(result.error);
            setMagicLinkSent(false); // Show the form again with error
            return;
          }

          throw new Error(result.error || 'Signup failed');
        }

        console.log('[AuthForm] Signup successful');

        // Check if email verification is needed
        if (result.needsEmailVerification) {
          console.log('[AuthForm] Email verification needed, showing verification message');
          setEmailVerificationNeeded(true);
        } else {
          console.log('[AuthForm] No email verification needed, redirecting to:', result.redirectTo);
          // Redirect on successful signup (auto-login enabled)
          window.location.href = result.redirectTo;
        }
      } else {
        // Sign in via API endpoint (server-side auth with cookies)
        console.log('[AuthForm] Starting login with email:', email);
        console.log('[AuthForm] Redirect target:', redirectTo);

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        console.log('[AuthForm] Login API response status:', response.status);

        const result = await response.json();
        console.log('[AuthForm] Login API result:', result);

        if (!response.ok) {
          console.error('[AuthForm] Login failed with error:', result.error);
          throw new Error(result.error || 'Login failed');
        }

        // Use the redirect URL from API response (smart routing based on user type)
        const finalRedirect = result.redirectTo || redirectTo;
        console.log('[AuthForm] Login successful, redirecting to:', finalRedirect);
        window.location.href = finalRedirect;
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

  if (emailVerificationNeeded) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Account created! Verify your email</h3>
            <p className="text-sm text-blue-800 mb-3">
              We've sent a verification email to <strong>{email}</strong>. Please check your inbox and click the verification link to activate your account.
            </p>
            <p className="text-sm text-blue-700 mb-4">
              After verifying your email, you'll be able to sign in and {userType === 'lobbyist' ? 'create your lobbyist profile' : 'start searching for lobbyists'}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Go to Sign In →
              </a>
              <button
                onClick={() => setEmailVerificationNeeded(false)}
                className="text-sm text-blue-800 underline hover:text-blue-900"
              >
                Try a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-react-hydrated="true">
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
            data-testid="email-input"
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
            data-testid="password-input"
          />
          {mode === 'signup' && (
            <p className="mt-1 text-xs text-muted-foreground">
              Must be at least 6 characters
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800 mb-2">{error}</p>
            {error.includes('already registered') && mode === 'signup' && (
              <a
                href={`/login?email=${encodeURIComponent(email)}`}
                className="inline-block text-sm font-medium text-red-700 hover:text-red-900 underline"
              >
                Go to Login →
              </a>
            )}
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
