import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProfileEditFormProps {
  lobbyistId: string;
  initialData: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    bio: string | null;
    cities: string[];
    subjectAreas: string[];
  };
  availableCities: Array<{ slug: string; name: string }>;
  availableSubjects: Array<{ slug: string; name: string }>;
}

export default function ProfileEditForm({
  lobbyistId,
  initialData,
  availableCities,
  availableSubjects,
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    firstName: initialData.firstName,
    lastName: initialData.lastName,
    email: initialData.email || '',
    phone: initialData.phone || '',
    website: initialData.website || '',
    bio: initialData.bio || '',
  });

  const [selectedCities, setSelectedCities] = useState<string[]>(initialData.cities);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialData.subjectAreas);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleCity = (citySlug: string) => {
    setSelectedCities((prev) =>
      prev.includes(citySlug) ? prev.filter((c) => c !== citySlug) : [...prev, citySlug]
    );
  };

  const toggleSubject = (subjectSlug: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectSlug) ? prev.filter((s) => s !== subjectSlug) : [...prev, subjectSlug]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Validation
    if (selectedCities.length === 0) {
      setError('Please select at least one city');
      setLoading(false);
      return;
    }

    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject area');
      setLoading(false);
      return;
    }

    try {
      // Use API endpoint instead of direct Supabase client
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email || null,
          phone: formData.phone || null,
          website: formData.website || null,
          bio: formData.bio || null,
          cities: selectedCities,
          subject_areas: selectedSubjects,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess(true);

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">
            Profile updated successfully! Changes are now visible on your public profile.
          </p>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleInputChange}
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
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contact Information</h3>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your@email.com"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            This will be displayed on your public profile
          </p>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Phone Number
          </label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="(512) 555-0100"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium mb-2">
            Website
          </label>
          <Input
            id="website"
            name="website"
            type="url"
            value={formData.website}
            onChange={handleInputChange}
            placeholder="https://yourwebsite.com"
            disabled={loading}
          />
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Professional Bio</h3>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            rows={6}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Tell potential clients about your experience, expertise, and what makes you unique..."
            disabled={loading}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {formData.bio.length} characters (recommended: 150-300)
          </p>
        </div>
      </div>

      {/* Cities */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Cities Served <span className="text-red-500">*</span>
        </h3>
        <p className="text-sm text-muted-foreground">
          Select the cities where you actively lobby or serve clients
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableCities.map((city) => (
            <label
              key={city.slug}
              className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                selectedCities.includes(city.slug)
                  ? 'border-texas-blue bg-texas-blue-500/5'
                  : 'border-border hover:border-texas-blue/50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedCities.includes(city.slug)}
                onChange={() => toggleCity(city.slug)}
                disabled={loading}
                className="rounded border-gray-300 text-texas-blue-500 focus:ring-texas-blue"
              />
              <span className="text-sm font-medium">{city.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Subject Areas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Areas of Expertise <span className="text-red-500">*</span>
        </h3>
        <p className="text-sm text-muted-foreground">
          Select your primary areas of expertise and practice
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableSubjects.map((subject) => (
            <label
              key={subject.slug}
              className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                selectedSubjects.includes(subject.slug)
                  ? 'border-texas-blue bg-texas-blue-500/5'
                  : 'border-border hover:border-texas-blue/50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSubjects.includes(subject.slug)}
                onChange={() => toggleSubject(subject.slug)}
                disabled={loading}
                className="rounded border-gray-300 text-texas-blue-500 focus:ring-texas-blue"
              />
              <span className="text-sm font-medium">{subject.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4 border-t">
        <Button type="submit" disabled={loading} className="flex-1 md:flex-none md:px-8">
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
