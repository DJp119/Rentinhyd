// src/components/forms/RentPinForm.tsx
// Anonymous rent pin contribution form

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { rentPinSubmitSchema, type RentPinSubmit } from '@/lib/schemas';
import { MapLocation } from '../Map';
import { cn } from '@/lib/utils';

const BHK_OPTIONS = ['1BHK', '2BHK', '3BHK', '4+BHK', 'room'] as const;
const FURNISHING_OPTIONS = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'fully_furnished', label: 'Fully Furnished' },
] as const;

type RentPinFormProps = {
  location: MapLocation;
  onSubmit: (data: RentPinSubmit) => Promise<void>;
  onCancel: () => void;
};

export function RentPinForm({ location, onSubmit, onCancel }: RentPinFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RentPinSubmit>({
    defaultValues: {
      lat: location.lat,
      lon: location.lon,
      locality: location.locality || 'gachibowli',
      rentMin: 15000,
      rentMax: 25000,
      bhk: '2BHK',
      furnishing: 'semi_furnished',
    },
  });

  const selectedBhk = watch('bhk');
  const selectedFurnishing = watch('furnishing');

  useEffect(() => {
    setValue('lat', location.lat);
    setValue('lon', location.lon);
    if (location.locality) {
      setValue('locality', location.locality);
    }
  }, [location, setValue]);

  const handleTurnstileCallback = (token: string) => {
    setTurnstileToken(token);
  };

  useEffect(() => {
    (window as any).onRentPinTurnstile = handleTurnstileCallback;
    return () => {
      delete (window as any).onRentPinTurnstile;
    };
  }, []);

  const onFormSubmit = async (data: RentPinSubmit) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const rawLat = Number(data.lat);
    const rawLon = Number(data.lon);
    const lat = (!isNaN(rawLat) && rawLat !== 0) ? rawLat : (location?.lat ?? 17.4435);
    const lon = (!isNaN(rawLon) && rawLon !== 0) ? rawLon : (location?.lon ?? 78.3772);

    const payload = {
      ...data,
      bhk: data.bhk || watch('bhk') || '2BHK',
      furnishing: data.furnishing || watch('furnishing') || 'semi_furnished',
      rentMin: Number(data.rentMin),
      rentMax: Number(data.rentMax),
      lat,
      lon,
      turnstileToken: turnstileToken || 'mock-turnstile-token',
    };

    const parseResult = rentPinSubmitSchema.safeParse(payload);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      setErrorMsg(issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation failed');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(parseResult.data);
      setSuccessMsg('Rent pin submitted successfully!');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to submit rent pin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFormInvalid = (errors: any) => {
    const firstErr = Object.values(errors)[0] as { message?: string } | undefined;
    if (firstErr?.message) {
      setErrorMsg(firstErr.message);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(onFormSubmit, onFormInvalid)(e);
      }}
      className="space-y-5"
      noValidate
      data-testid="rent-pin-form"
    >
      {errorMsg && (
        <div
          className="p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error"
          data-testid="pin-error"
        >
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          className="p-3 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent"
          data-testid="pin-success"
        >
          {successMsg}
        </div>
      )}

      {/* Hidden coordinates */}
      <input type="hidden" value={location.lat} {...register('lat')} data-testid="pin-lat" />
      <input type="hidden" value={location.lon} {...register('lon')} data-testid="pin-lon" />

      {/* Locality */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-1">
          Locality / Area
        </label>
        <input
          {...register('locality', { required: 'Locality is required' })}
          type="text"
          placeholder="e.g. gachibowli, madhapur, kondapur"
          className={cn(
            'w-full p-2.5 bg-background border rounded-lg text-textPrimary text-sm focus:outline-none focus:border-accent',
            errors.locality ? 'border-error' : 'border-border'
          )}
          data-testid="pin-locality"
        />
        {errors.locality && (
          <p className="mt-1 text-xs text-error">{errors.locality.message}</p>
        )}
      </div>

      {/* Rent Min & Max */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">
            Minimum Rent (₹/mo)
          </label>
          <input
            {...register('rentMin', { valueAsNumber: true })}
            type="number"
            step="1000"
            className="w-full p-2.5 bg-background border border-border rounded-lg text-textPrimary text-sm focus:outline-none focus:border-accent"
            data-testid="pin-rent-min"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">
            Maximum Rent (₹/mo)
          </label>
          <input
            {...register('rentMax', { valueAsNumber: true })}
            type="number"
            step="1000"
            className="w-full p-2.5 bg-background border border-border rounded-lg text-textPrimary text-sm focus:outline-none focus:border-accent"
            data-testid="pin-rent-max"
          />
        </div>
      </div>

      {/* BHK Selection */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          BHK / Layout
        </label>
        <div className="flex flex-wrap gap-2">
          {BHK_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setValue('bhk', opt)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                selectedBhk === opt
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'bg-background border-border text-textSecondary hover:border-accent/50'
              )}
              data-testid="pin-bhk"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Furnishing Selection */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-2">
          Furnishing
        </label>
        <div className="flex flex-wrap gap-2">
          {FURNISHING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue('furnishing', opt.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                selectedFurnishing === opt.value
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'bg-background border-border text-textSecondary hover:border-accent/50'
              )}
              data-testid="pin-furnishing"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Notes */}
      <div>
        <label className="block text-sm font-medium text-textSecondary mb-1">
          Optional Notes
        </label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="e.g. Includes maintenance, 2 months deposit"
          className="w-full p-2.5 bg-background border border-border rounded-lg text-textPrimary text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {/* Turnstile */}
      <div className="pt-2">
        <div
          className="cf-turnstile"
          data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || ''}
          data-callback="onRentPinTurnstile"
          data-theme="dark"
        />
      </div>

      {/* Form actions */}
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
          data-testid="pin-submit"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Rent Pin'}
        </button>
      </div>
    </form>
  );
}
