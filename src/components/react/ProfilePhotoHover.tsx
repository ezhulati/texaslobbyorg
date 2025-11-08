import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface ProfilePhotoHoverProps {
  userId: string;
  currentPhotoUrl?: string | null;
  fullName?: string;
  onUploadComplete?: (photoUrl: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-40 w-40',
};

export default function ProfilePhotoHover({
  userId,
  currentPhotoUrl,
  fullName = 'User',
  onUploadComplete,
  size = 'xl',
}: ProfilePhotoHoverProps) {
  const [photo, setPhoto] = useState(currentPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U';
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Please upload a JPG, PNG, or WebP image';
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    setError('');

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

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
      const { error: uploadError } = await supabase.storage
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

      // Update lobbyist profile (FIX: use profile_image_url, not photo_url)
      const { error: updateError } = await supabase
        .from('lobbyists')
        .update({ profile_image_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setPhoto(publicUrl);
      onUploadComplete?.(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative group ${sizeClasses[size]} rounded-full overflow-hidden cursor-pointer`}
        onClick={() => fileInputRef.current?.click()}
      >
        {photo ? (
          <img
            src={photo}
            alt={fullName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-texas-blue-100 flex items-center justify-center text-texas-blue-600 font-bold text-2xl">
            {getInitials()}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="text-center text-white">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-medium">
                  {photo ? 'Change Photo' : 'Upload Photo'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = ''; // Reset input
        }}
        className="hidden"
        disabled={uploading}
      />

      {error && (
        <p className="text-xs text-red-600 max-w-xs text-center">{error}</p>
      )}
    </div>
  );
}
