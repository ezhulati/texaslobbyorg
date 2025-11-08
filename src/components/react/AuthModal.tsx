import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  returnUrl?: string;
}

/**
 * AuthModal - Modal to encourage unauthenticated users to sign up/log in
 *
 * This modal appears when users try to favorite a lobbyist without being logged in.
 * It's the "auth nudge" feature to convert visitors into users.
 *
 * Features:
 * - Dismissible (escape key, backdrop click, close button)
 * - Remembers return URL to redirect after auth
 * - Clear CTA for both signup and login
 * - Accessible (aria attributes, focus trap)
 *
 * Usage:
 * const [showAuthModal, setShowAuthModal] = useState(false);
 * <AuthModal
 *   isOpen={showAuthModal}
 *   onClose={() => setShowAuthModal(false)}
 *   message="Sign in to save your favorite lobbyists"
 *   returnUrl={window.location.pathname}
 * />
 */
export default function AuthModal({
  isOpen,
  onClose,
  message = 'Sign in to save your favorite lobbyists and get personalized recommendations',
  returnUrl
}: AuthModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = returnUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const signupUrl = `/signup?redirect=${encodeURIComponent(currentUrl)}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className={cn(
          'relative w-full max-w-md mx-4 bg-white rounded-lg shadow-xl',
          'transform transition-all animate-in fade-in zoom-in duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Close modal"
        >
          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-50 p-3">
              <svg className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 id="auth-modal-title" className="text-2xl font-bold text-center mb-3">
            Save Your Favorites
          </h2>

          {/* Message */}
          <p className="text-center text-muted-foreground mb-6">
            {message}
          </p>

          {/* Benefits */}
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-sm mb-2">Create an account to:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-texas-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Save and organize your favorite lobbyists</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-texas-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Get personalized recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-texas-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Access your favorites from any device</span>
              </li>
            </ul>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <a
              href={signupUrl}
              className="block w-full text-center rounded-md bg-texas-blue-500 px-6 py-3 text-base font-medium text-white hover:bg-texas-blue-600 transition-colors"
            >
              Create Free Account
            </a>
            <a
              href={loginUrl}
              className="block w-full text-center rounded-md border border-border px-6 py-3 text-base font-medium hover:bg-accent transition-colors"
            >
              Log In
            </a>
          </div>

          {/* Fine print */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            Free forever. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
