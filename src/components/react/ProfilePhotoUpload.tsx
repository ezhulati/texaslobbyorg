import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface ProfilePhotoUploadProps {
  userId: string;
  currentPhotoUrl?: string | null;
  onUploadComplete?: (photoUrl: string) => void;
}

export default function ProfilePhotoUpload({
  userId,
  currentPhotoUrl,
  onUploadComplete
}: ProfilePhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Please upload a JPG, PNG, or WebP image';
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const handleFileChange = async (file: File) => {
    setError('');

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/profile.${fileExt}`;

      // Delete old photo if exists
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split('/').slice(-2).join('/');
        await supabase.storage
          .from('profile-photos')
          .remove([oldPath]);
      }

      // Upload new photo
      const { error: uploadError, data } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      // Update lobbyist profile
      const { error: updateError } = await supabase
        .from('lobbyists')
        .update({ photo_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Call success callback
      onUploadComplete?.(publicUrl);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err?.message || 'Failed to upload photo');
      // Revert preview on error
      setPreview(currentPhotoUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentPhotoUrl) return;

    setUploading(true);
    setError('');

    try {
      // Delete from storage
      const oldPath = currentPhotoUrl.split('/').slice(-2).join('/');
      const { error: deleteError } = await supabase.storage
        .from('profile-photos')
        .remove([oldPath]);

      if (deleteError) throw deleteError;

      // Update database
      const { error: updateError } = await supabase
        .from('lobbyists')
        .update({ photo_url: null })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setPreview(null);
      onUploadComplete?.(null as any);

    } catch (err: any) {
      console.error('Remove error:', err);
      setError(err?.message || 'Failed to remove photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex justify-center">
        <div className="relative">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Profile preview"
                className="h-40 w-40 rounded-full object-cover border-4 border-border"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <div className="h-40 w-40 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-border">
              <svg
                className="h-12 w-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragActive
            ? 'border-texas-blue-500 bg-texas-blue-500/5'
            : 'border-border bg-muted/30'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleInputChange}
          className="sr-only"
          disabled={uploading}
        />

        <div className="space-y-3">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : preview ? 'Change Photo' : 'Choose Photo'}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              or drag and drop here
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP up to 5MB
          </p>
        </div>
      </div>

      {/* Remove Button */}
      {preview && !uploading && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="text-sm text-red-600 hover:text-red-700 hover:underline"
          >
            Remove photo
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Helper Text */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h4 className="font-medium text-sm mb-2">Photo Tips</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Use a professional headshot for best results</li>
          <li>• Make sure your face is clearly visible</li>
          <li>• Avoid group photos or busy backgrounds</li>
          <li>• Good lighting makes a big difference</li>
        </ul>
      </div>
    </div>
  );
}
