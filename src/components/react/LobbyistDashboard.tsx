import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LobbyistProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  bio: string | null;
  profile_image_url: string | null;
  years_experience: number | null;
  cities: string[];
  subject_areas: string[];
  subscription_tier: string;
  view_count: number;
  slug: string;
}

interface Props {
  profile: LobbyistProfile;
  clientCount: number;
}

export default function LobbyistDashboard({ profile, clientCount }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState(profile);
  const [saving, setSaving] = useState(false);

  const handleSave = async (field: string, value: any) => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Failed to update');
        return;
      }

      setValues(prev => ({ ...prev, [field]: value }));
      setEditing(null);
    } catch (error) {
      alert('Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const EditableField = ({
    label,
    field,
    type = 'text',
    placeholder = ''
  }: {
    label: string;
    field: keyof LobbyistProfile;
    type?: string;
    placeholder?: string;
  }) => {
    const value = values[field];
    const isEditing = editing === field;

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        {isEditing ? (
          <div className="flex gap-2">
            <Input
              type={type}
              value={String(value || '')}
              onChange={(e) => setValues(prev => ({ ...prev, [field]: e.target.value }))}
              placeholder={placeholder}
              className="flex-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => handleSave(field, values[field])}
              disabled={saving}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setValues(prev => ({ ...prev, [field]: profile[field] }));
                setEditing(null);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div
            className="flex items-center justify-between p-2 rounded border border-transparent hover:border-border hover:bg-accent/50 cursor-pointer transition-colors group"
            onClick={() => setEditing(field)}
          >
            <span className="text-sm">{value || <span className="text-muted-foreground italic">Not set</span>}</span>
            <svg className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        )}
      </div>
    );
  };

  const tierBadgeClass = values.subscription_tier === 'featured'
    ? 'bg-texas-blue-500 text-white'
    : values.subscription_tier === 'premium'
    ? 'bg-amber-500 text-white'
    : 'bg-gray-200 text-gray-700';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg border p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {values.first_name} {values.last_name}
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              {values.cities.join(', ') || 'No cities listed'}
            </p>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${tierBadgeClass}`}>
                {values.subscription_tier.charAt(0).toUpperCase() + values.subscription_tier.slice(1)}
              </span>
              <span className="text-sm text-muted-foreground">
                {values.view_count} profile views
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={`/lobbyists/${values.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              View Public Profile →
            </a>
            {values.subscription_tier === 'free' && (
              <a
                href="/upgrade"
                className="inline-flex items-center justify-center rounded-md bg-texas-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-texas-blue-600 transition-colors"
              >
                Upgrade Plan
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Analytics */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Profile Stats</h2>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold">{values.view_count}</div>
                <div className="text-sm text-muted-foreground">Total Views</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{values.subject_areas.length}</div>
                <div className="text-sm text-muted-foreground">Expertise Areas</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{clientCount}</div>
                <div className="text-sm text-muted-foreground">Clients Listed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border p-8 shadow-sm space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-texas-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Basic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <EditableField label="First Name" field="first_name" />
                <EditableField label="Last Name" field="last_name" />
              </div>
            </div>

            <hr className="border-border" />

            {/* Contact Information */}
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-texas-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <EditableField label="Email" field="email" type="email" placeholder="you@example.com" />
                <EditableField label="Phone" field="phone" type="tel" placeholder="(512) 555-0100" />
                <EditableField label="Website" field="website" type="url" placeholder="https://example.com" />
                <EditableField label="LinkedIn URL" field="linkedin_url" type="url" placeholder="https://linkedin.com/in/username" />
              </div>
            </div>

            <hr className="border-border" />

            {/* Professional Details */}
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-texas-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Professional Details
              </h2>
              <div className="space-y-6">
                <EditableField label="Years of Experience" field="years_experience" type="number" />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Bio</label>
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-md p-4">
                    {values.bio || <span className="italic">No bio added yet</span>}
                  </div>
                  <a
                    href="/onboarding/bio"
                    className="inline-flex items-center text-sm text-texas-blue-500 hover:text-texas-blue-600"
                  >
                    Edit in full editor →
                  </a>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* Clients */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-texas-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Clients
              </h2>
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <div>
                  <p className="font-medium">{clientCount} {clientCount === 1 ? 'client' : 'clients'} listed</p>
                  <p className="text-sm text-muted-foreground">Manage your client portfolio</p>
                </div>
                <a
                  href="/dashboard/clients"
                  className="inline-flex items-center justify-center rounded-md bg-texas-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-texas-blue-600 transition-colors"
                >
                  Manage Clients
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
