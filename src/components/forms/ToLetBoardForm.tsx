// src/components/forms/ToLetBoardForm.tsx
// To-Let Board submission form with photo upload and phone input

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MapLocation } from '../Map';
import { cn } from '@/lib/utils';

type ToLetBoardFormProps = {
  location: MapLocation;
  onSuccess: () => void;
  onCancel: () => void;
};

type FormData = {
  locality: string;
  phone: string;
  lat: number;
  lon: number;
  consent: boolean;
};

export function ToLetBoardForm({ location, onSuccess, onCancel }: ToLetBoardFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      locality: location.locality || 'gachibowli',
      phone: '',
      lat: location.lat,
      lon: location.lon,
      consent: false,
    },
  });

  useEffect(() => {
    setValue('lat', location.lat);
    setValue('lon', location.lon);
    if (location.locality) {
      setValue('locality', location.locality);
    }
  }, [location, setValue]);

  // Clean up object URL when component unmounts or photo changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Image file size must be less than 5 MB.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleTurnstileCallback = (token: string) => {
    setTurnstileToken(token);
  };

  useEffect(() => {
    (window as any).onToLetTurnstile = handleTurnstileCallback;
    return () => {
      delete (window as any).onToLetTurnstile;
    };
  }, []);

  const onFormSubmit = async (data: FormData) => {
    setErrorMsg(null);
    setFileError(null);

    if (!photoFile) {
      setFileError('Photo of the To-Let board is required.');
      return;
    }

    if (!data.consent) {
      setErrorMsg('You must confirm consent for public visibility after approval.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('phone', data.phone);
      formData.append('locality', data.locality);
      formData.append('lat', String(data.lat));
      formData.append('lon', String(data.lon));
      formData.append('consent', String(data.consent));
      formData.append('turnstileToken', turnstileToken || 'mock-turnstile-token');

      const response = await fetch('/api/tolet-boards', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.id) {
        throw new Error(result.error || result.message || 'Failed to submit To-Let board');
      }

      onSuccess();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="space-y-5"
      noValidate
      data-testid="tolet-board-form"
    >
      {errorMsg && (
        <div
          className="p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error"
          data-testid="tolet-error"
        >
          {errorMsg}
        </div>
      )}

      {/* Hidden coordinates */}
      <input type="hidden" {...register('lat')} />
      <input type="hidden" {...register('lon')} />

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          Photo of To-Let Board <span className="text-error">*</span>
        </label>
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border hover:border-accent/50 rounded-xl bg-background transition-colors cursor-pointer text-center relative">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            data-testid="tolet-photo-input"
          />
          {previewUrl ? (
            <div className="relative w-full max-h-48 flex justify-center">
              <img
                src={previewUrl}
                alt="To-Let Board Preview"
                className="max-h-48 object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center gap-2">
              <span className="text-3xl">📷</span>
              <span className="text-sm font-medium text-textPrimary">
                Snap photo or upload file
              </span>
              <span className="text-xs text-textMuted">
                JPEG, PNG or WebP up to 5 MB
              </span>
            </div>
          )}
        </div>
        {fileError && <p className="mt-1 text-xs text-error">{fileError}</p>}
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-1">
          Phone Number on Board <span className="text-error">*</span>
        </label>
        <input
          {...register('phone', {
            required: 'Phone number is required',
            pattern: {
              value: /^(\+91|91)?[6-9]\d{9}$/,
              message: 'Enter a valid Indian phone number (10 digits)',
            },
          })}
          type="tel"
          placeholder="e.g. 9876543210"
          className={cn(
            'w-full p-2.5 bg-background border rounded-lg text-textPrimary text-sm focus:outline-none focus:border-accent',
            errors.phone ? 'border-error' : 'border-border'
          )}
          data-testid="tolet-phone-input"
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-error">{errors.phone.message}</p>
        )}
      </div>

      {/* Locality */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-1">
          Locality / Area
        </label>
        <input
          {...register('locality', { required: 'Locality is required' })}
          type="text"
          className={cn(
            'w-full p-2.5 bg-background border rounded-lg text-textPrimary text-sm focus:outline-none focus:border-accent',
            errors.locality ? 'border-error' : 'border-border'
          )}
          data-testid="tolet-locality-input"
        />
        {errors.locality && (
          <p className="mt-1 text-xs text-error">{errors.locality.message}</p>
        )}
      </div>

      {/* Consent Checkbox */}
      <div className="flex items-start gap-2 pt-1">
        <input
          {...register('consent', { required: true })}
          type="checkbox"
          id="tolet-consent"
          className="mt-1 w-4 h-4 accent-accent rounded"
          data-testid="tolet-consent-checkbox"
        />
        <label htmlFor="tolet-consent" className="text-xs text-textSecondary leading-normal cursor-pointer">
          I confirm that this photo and phone number were found on a public To-Let board and agree that they will become publicly visible on the map after moderation approval.
        </label>
      </div>

      {/* Turnstile */}
      <div className="pt-2">
        <div
          className="cf-turnstile"
          data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || ''}
          data-callback="onToLetTurnstile"
          data-theme="dark"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-3 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-border text-textSecondary rounded-lg font-medium text-sm hover:text-textPrimary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2.5 bg-accent text-background rounded-lg font-medium text-sm hover:bg-accentHover transition-colors disabled:opacity-50"
          data-testid="tolet-submit-button"
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Moderation'}
        </button>
      </div>
    </form>
  );
}
