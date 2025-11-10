/**
 * Mock Authentication Helper
 *
 * Temporary auth solution using localStorage to simulate logged-in users.
 * This will be replaced with Supabase Auth in Week 3.
 *
 * Usage:
 *   const user = getMockUser();
 *   if (!user) {
 *     // Redirect to login or show auth modal
 *   }
 */

export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'searcher' | 'lobbyist' | 'admin';
}

const STORAGE_KEY = 'mock_user';

/**
 * Get the current mock user from localStorage
 */
export function getMockUser(): MockUser | null {
  if (typeof window === 'undefined') {
    return null; // Server-side
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as MockUser;
  } catch {
    return null;
  }
}

/**
 * Set the current mock user in localStorage
 */
export function setMockUser(user: MockUser): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

/**
 * Clear the current mock user (logout)
 */
export function clearMockUser(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getMockUser() !== null;
}

/**
 * Create a default mock user for testing
 * Call this once to simulate logging in
 */
export function createDefaultMockUser(): MockUser {
  const mockUser: MockUser = {
    id: 'mock-user-' + Date.now(),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'searcher',
  };

  setMockUser(mockUser);
  return mockUser;
}

/**
 * Get or create a mock user
 * Useful for development - automatically creates a user if none exists
 */
export function getOrCreateMockUser(): MockUser {
  const existing = getMockUser();
  if (existing) {
    return existing;
  }

  return createDefaultMockUser();
}
