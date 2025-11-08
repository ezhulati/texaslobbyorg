import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface InlineEditFieldProps {
  label: string;
  value: string | number | null;
  fieldName: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'number';
  placeholder?: string;
  onSave: (fieldName: string, value: string | number | null) => Promise<void>;
  maxLength?: number;
  min?: number;
  max?: number;
  required?: boolean;
}

export default function InlineEditField({
  label,
  value,
  fieldName,
  type = 'text',
  placeholder,
  onSave,
  maxLength,
  min,
  max,
  required = false,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');

    // Validation
    if (required && !editValue) {
      setError('This field is required');
      return;
    }

    if (type === 'number' && editValue !== '') {
      const num = Number(editValue);
      if (isNaN(num)) {
        setError('Please enter a valid number');
        return;
      }
      if (min !== undefined && num < min) {
        setError(`Value must be at least ${min}`);
        return;
      }
      if (max !== undefined && num > max) {
        setError(`Value must be at most ${max}`);
        return;
      }
    }

    setSaving(true);
    try {
      const finalValue = type === 'number' && editValue !== ''
        ? Number(editValue)
        : editValue || null;

      await onSave(fieldName, finalValue);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
    setError('');
  };

  if (!isEditing) {
    return (
      <div className="group">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="text-sm font-medium">
              {value || <span className="text-muted-foreground italic">Not set</span>}
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-accent rounded-md"
            aria-label={`Edit ${label}`}
          >
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={fieldName} className="block text-xs text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={fieldName}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        disabled={saving}
        autoFocus
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="h-8"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          onClick={handleCancel}
          disabled={saving}
          variant="outline"
          size="sm"
          className="h-8"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
