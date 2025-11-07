import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ContactFormProps {
  userId: string;
  currentData?: {
    phone?: string | null;
    website?: string | null;
    linkedin_url?: string | null;
  };
  onSave?: () => void;
}

export default function ContactForm({ userId, currentData, onSave }: ContactFormProps) {
  const [formData, setFormData] = useState({
    phone: currentData?.phone || '',
    website: currentData?.website || '',
    linkedinUrl: currentData?.linkedin_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const validateUrl = (url: string, type: 'website' | 'linkedin'): boolean => {
    if (!url) return true; // Optional fields

    try {
      const urlObj = new URL(url);

      if (type === 'linkedin') {
        return urlObj.hostname.includes('linkedin.com');
      }

      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);

    // Validate URLs
    if (formData.website && !validateUrl(formData.website, 'website')) {
      setError('Please enter a valid website URL (e.g., https://example.com)');
      return;
    }

    if (formData.linkedinUrl && !validateUrl(formData.linkedinUrl, 'linkedin')) {
      setError('Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/yourname)');
      return;
    }

    // Validate phone (optional, but if provided must be 10 digits)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (formData.phone && phoneDigits.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('lobbyists')
        .update({
          phone: formData.phone || null,
          website: formData.website || null,
          linkedin_url: formData.linkedinUrl || null,
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setSaved(true);
      onSave?.();

      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err?.message || 'Failed to save contact information');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-2">
          Phone Number
        </label>
        <Input
          id="phone"
          type="tel"
          placeholder="(512) 555-0100"
          value={formData.phone}
          onChange={handlePhoneChange}
          disabled={saving}
          maxLength={14}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Your phone number will be visible to potential clients
        </p>
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className="block text-sm font-medium mb-2">
          Website
        </label>
        <Input
          id="website"
          type="url"
          placeholder="https://yourwebsite.com"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          disabled={saving}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Your professional website or firm website
        </p>
      </div>

      {/* LinkedIn */}
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
          disabled={saving}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Add credibility with your LinkedIn profile
        </p>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Contact Info'}
      </Button>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800 flex items-center gap-2">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Contact information saved!
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h4 className="font-medium text-sm mb-2">Why add contact information?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Makes it easy for clients to reach you</li>
          <li>• Builds trust and credibility</li>
          <li>• Increases your profile's professionalism</li>
          <li>• All fields are optional but recommended</li>
        </ul>
      </div>
    </div>
  );
}
