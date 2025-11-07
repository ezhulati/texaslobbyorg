import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface CreateProfileFormProps {
  userId: string;
  userEmail?: string;
}

export default function CreateProfileForm({ userId, userEmail }: CreateProfileFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: userEmail || '',
    phone: '',
    website: '',
    linkedinUrl: '',
    bio: '',
    cities: '',
    subjectAreas: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email) {
        throw new Error('Please fill in all required fields');
      }

      // Generate slug from name
      const slug = `${formData.firstName}-${formData.lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Parse cities and subject areas
      const cities = formData.cities
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const subjectAreas = formData.subjectAreas
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Create lobbyist profile with pending status
      const { error: insertError } = await supabase
        .from('lobbyists')
        .insert({
          user_id: userId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          slug,
          email: formData.email,
          phone: formData.phone || null,
          website: formData.website || null,
          linkedin_url: formData.linkedinUrl || null,
          bio: formData.bio || null,
          cities: cities.length > 0 ? cities : [],
          subject_areas: subjectAreas.length > 0 ? subjectAreas : [],
          is_claimed: true,
          is_active: false, // Not active until approved
          is_pending: true,
          pending_reason: 'New lobbyist registration',
          subscription_tier: 'free',
        });

      if (insertError) throw insertError;

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
      setError(err?.message || 'Error creating profile');
    } finally {
      setLoading(false);
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
        <h3 className="text-2xl font-bold text-green-900 mb-2">Profile Created!</h3>
        <p className="text-green-700 mb-4">
          Great start! Let's complete your profile to attract more clients...
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            disabled={loading}
          />
        </div>
      </div>

      {/* Contact Info */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email <span className="text-red-500">*</span>
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Phone
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="512-555-0100"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium mb-2">
            Website
          </label>
          <Input
            id="website"
            type="url"
            placeholder="https://example.com"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="linkedinUrl" className="block text-sm font-medium mb-2">
          LinkedIn Profile
        </label>
        <Input
          id="linkedinUrl"
          type="url"
          placeholder="https://linkedin.com/in/yourprofile"
          value={formData.linkedinUrl}
          onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
          disabled={loading}
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium mb-2">
          Professional Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Tell potential clients about your experience and expertise..."
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          disabled={loading}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Describe your experience, areas of expertise, and what makes you stand out
        </p>
      </div>

      {/* Cities */}
      <div>
        <label htmlFor="cities" className="block text-sm font-medium mb-2">
          Cities You Serve
        </label>
        <Input
          id="cities"
          type="text"
          placeholder="Austin, Houston, Dallas"
          value={formData.cities}
          onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
          disabled={loading}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Enter cities separated by commas
        </p>
      </div>

      {/* Subject Areas */}
      <div>
        <label htmlFor="subjectAreas" className="block text-sm font-medium mb-2">
          Areas of Expertise
        </label>
        <Input
          id="subjectAreas"
          type="text"
          placeholder="Healthcare, Energy, Education"
          value={formData.subjectAreas}
          onChange={(e) => setFormData({ ...formData, subjectAreas: e.target.value })}
          disabled={loading}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Enter expertise areas separated by commas
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating Profile...' : 'Submit for Review'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By submitting, you confirm that you are or will be a registered lobbyist in Texas
      </p>
    </form>
  );
}
