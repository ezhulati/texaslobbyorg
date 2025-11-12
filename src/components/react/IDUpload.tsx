import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface IDUploadProps {
  userId: string;
  onUploadComplete: (url: string) => void;
  onError: (error: string) => void;
}

export default function IDUpload({ userId, onUploadComplete, onError }: IDUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a JPG, PNG, or PDF file';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      onError(error);
      return;
    }

    setFile(selectedFile);

    // Generate preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type === 'application/pdf') {
      setPreview('pdf'); // Special indicator for PDF
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
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

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      onError('Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload via API endpoint (server-side with auth)
      const response = await fetch('/api/upload/id-verification', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload file');
      }

      console.log('[IDUpload] Upload successful:', result.url);
      onUploadComplete(result.url);
    } catch (err: any) {
      console.error('[IDUpload] Upload error:', err);
      onError(err?.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  if (file && preview) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border p-4 bg-muted/30">
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="flex-shrink-0">
              {preview === 'pdf' ? (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-red-50 border border-red-200">
                  <svg
                    className="h-12 w-12 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              ) : (
                <img
                  src={preview}
                  alt="ID preview"
                  className="h-24 w-auto max-w-[200px] rounded-lg border border-border object-contain"
                />
              )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  size="sm"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    'Upload Document'
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleRemove}
                  disabled={uploading}
                  variant="outline"
                  size="sm"
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            <strong>Before uploading:</strong> Make sure your ID clearly shows your name and photo.
            You may blur any sensitive information (ID number, address, etc.) except your name.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? 'border-texas-blue-500 bg-texas-blue-50'
            : 'border-border bg-muted/30 hover:border-texas-blue-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleInputChange}
          accept="image/jpeg,image/jpg,image/png,application/pdf"
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          {/* Upload icon */}
          <div className="rounded-full bg-texas-blue-100 p-3">
            <svg
              className="h-8 w-8 text-texas-blue-600"
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
          </div>

          <div>
            <p className="text-base font-medium mb-1">
              Upload ID Verification Document
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Drag and drop or click to browse
            </p>
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              variant="outline"
            >
              Choose File
            </Button>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h4 className="font-medium mb-2 text-sm">Accepted Documents:</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Front of driver's license</li>
          <li>Passport photo page</li>
          <li>Valid government-issued ID</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-border">
          <h4 className="font-medium mb-2 text-sm">Requirements:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>File format: JPG, PNG, or PDF</li>
            <li>Maximum file size: 10MB</li>
            <li>Document must clearly show your name and photo</li>
            <li>You may blur sensitive information (address, ID number)</li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <svg
            className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 mb-1">
              Privacy & Security
            </p>
            <p className="text-sm text-amber-800">
              Your ID document will be securely stored and only visible to administrators for verification purposes.
              It will be permanently deleted after your claim is approved or rejected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
