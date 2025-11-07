import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface BioEditorProps {
  userId: string;
  currentBio?: string | null;
  onSave?: (bio: string) => void;
}

export default function BioEditor({ userId, currentBio, onSave }: BioEditorProps) {
  const [bio, setBio] = useState(currentBio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const minLength = 100;
  const maxLength = 1000;
  const wordCount = bio.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = bio.length;
  const isValid = charCount >= minLength && charCount <= maxLength;

  const handleSave = async () => {
    setError('');
    setSaved(false);

    if (!isValid) {
      setError(`Bio must be between ${minLength} and ${maxLength} characters`);
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('lobbyists')
        .update({ bio: bio.trim() })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setSaved(true);
      onSave?.(bio.trim());

      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err?.message || 'Failed to save bio');
    } finally {
      setSaving(false);
    }
  };

  const suggestions = [
    "Share your years of experience in lobbying",
    "Highlight specific legislative successes",
    "Mention your industry expertise and specializations",
    "Describe your approach to client advocacy",
    "Include relevant educational background or certifications",
    "Note any professional associations or memberships",
  ];

  return (
    <div className="space-y-4">
      {/* Editor */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium mb-2">
          Professional Bio <span className="text-red-500">*</span>
        </label>
        <textarea
          id="bio"
          rows={8}
          className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none ${
            error ? 'border-red-500' : 'border-input'
          }`}
          placeholder="Tell potential clients about your lobbying experience, expertise, and what makes you stand out..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={saving}
          maxLength={maxLength}
        />

        {/* Character/Word Count */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className={charCount < minLength ? 'text-red-600' : 'text-muted-foreground'}>
            {charCount} / {maxLength} characters • {wordCount} words
            {charCount < minLength && (
              <span className="ml-2 text-red-600 font-medium">
                ({minLength - charCount} more characters needed)
              </span>
            )}
          </span>
          {isValid && (
            <span className="text-green-600 font-medium flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Good length
            </span>
          )}
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving || !isValid}
        className="w-full"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Bio'}
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
            Bio saved successfully!
          </p>
        </div>
      )}

      {/* Suggestions */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h4 className="font-medium text-sm mb-3">What to include:</h4>
        <ul className="space-y-2">
          {suggestions.map((suggestion, idx) => (
            <li key={idx} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-texas-blue-500 font-bold">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Example */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h4 className="font-medium text-sm mb-2">Example bio:</h4>
        <p className="text-sm text-muted-foreground italic">
          "With over 15 years of legislative advocacy experience in Texas, I specialize in healthcare policy and regulatory affairs. I've successfully represented major hospital systems, medical device companies, and healthcare associations before the Texas Legislature and state agencies. My approach combines deep policy expertise with strong relationships across the aisle, ensuring clients achieve their legislative goals while maintaining their reputation and values."
        </p>
      </div>
    </div>
  );
}
