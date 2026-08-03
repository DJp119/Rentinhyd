// src/components/forms/SeekerForm.tsx
// Seeker request form

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { seekerSubmitSchema, type SeekerSubmit } from '@/lib/schemas';
import { cn } from '@/lib/utils';

const BHk_OPTIONS = ['1BHK', '2BHK', '3BHK', '4+BHK', 'room', 'any'] as const;
const FURNISHING_OPTIONS = ['unfurnished', 'semi_furnished', 'fully_furnished'] as const;
const LISTING_TYPES = ['whole_flat', 'room_flatmate'] as const;

const LOCALITY_OPTIONS = [
  { value: 'gachibowli', label: 'Gachibowli' },
  { value: 'madhapur', label: 'Madhapur' },
  { value: 'kondapur', label: 'Kondapur' },
  { value: 'hitec-city', label: 'HITEC City' },
  { value: 'financial-district', label: 'Financial District' },
  { value: 'manikonda', label: 'Manikonda' },
  { value: 'narsingi', label: 'Narsingi' },
  { value: 'hafeezpet', label: 'Hafeezpet' },
] as const;

export function SeekerForm({ onSubmit, onCancel, initialLocality }: {
  onSubmit: (data: SeekerSubmit) => Promise<void>;
  onCancel: () => void;
  initialLocality?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SeekerSubmit>({
    defaultValues: {
      listingType: 'whole_flat',
      furnishing: undefined,
      preferredLocalities: initialLocality ? [initialLocality] : [],
      excludedLocalities: [],
      lifestylePrefs: {},
    },
  });

  const handleTurnstileCallback = (token: string) => {
    setTurnstileToken(token);
  };

  const onFormSubmit = async (data: SeekerSubmit) => {
    setIsSubmitting(true);
    try {
      // Manual validation with Zod v4 schema
      const result = seekerSubmitSchema.safeParse(data);
      if (!result.success) {
        console.warn('Seeker validation failed:', result.error.flatten().fieldErrors);
        return;
      }
      await onSubmit({ ...data, turnstileToken });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" noValidate>
      {/* Requirements */}
      <fieldset>
        <legend className="block text-sm font-medium text-textSecondary mb-3">What are you looking for?</legend>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="maxBudget" className="block text-sm font-medium text-textSecondary mb-1">
              Max Budget (₹/month) <span className="text-error">*</span>
            </label>
            <input
              {...register('maxBudget', { valueAsNumber: true })}
              id="maxBudget"
              type="number"
              min="1000"
              max="500000"
              placeholder="e.g., 30000"
              className={cn('w-full input-field', errors.maxBudget && 'border-error')}
            />
            {errors.maxBudget && <p className="mt-1 text-sm text-error">{errors.maxBudget.message}</p>}
          </div>

          <div>
            <label htmlFor="minBudget" className="block text-sm font-medium text-textSecondary mb-1">
              Min Budget (optional)
            </label>
            <input
              {...register('minBudget', { valueAsNumber: true })}
              id="minBudget"
              type="number"
              min="1000"
              max="500000"
              placeholder="e.g., 15000"
              className="w-full input-field"
            />
          </div>

          <div>
            <label htmlFor="bhk" className="block text-sm font-medium text-textSecondary mb-1">
              BHK / Room Type <span className="text-error">*</span>
            </label>
            <select
              {...register('bhk')}
              id="bhk"
              className={cn('w-full input-field', errors.bhk && 'border-error')}
            >
              <option value="">Select type</option>
              {BHk_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.bhk && <p className="mt-1 text-sm text-error">{errors.bhk.message}</p>}
          </div>

          <div>
            <label htmlFor="listingType" className="block text-sm font-medium text-textSecondary mb-1">
              Type <span className="text-error">*</span>
            </label>
            <select
              {...register('listingType')}
              id="listingType"
              className={cn('w-full input-field', errors.listingType && 'border-error')}
            >
              <option value="">Select type</option>
              {LISTING_TYPES.map(opt => (
                <option key={opt} value={opt}>{opt === 'whole_flat' ? 'Whole Flat' : 'Room/Flatmate'}</option>
              ))}
            </select>
            {errors.listingType && <p className="mt-1 text-sm text-error">{errors.listingType.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="furnishing" className="block text-sm font-medium text-textSecondary mb-1">
            Furnishing
          </label>
          <select
            {...register('furnishing')}
            id="furnishing"
            className="w-full input-field"
          >
            <option value="">Any</option>
            {FURNISHING_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Move-in Timing */}
      <fieldset>
        <legend className="block text-sm font-medium text-textSecondary mb-3">When do you want to move in?</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="moveInEarliest" className="block text-sm font-medium text-textSecondary mb-1">
              Earliest <span className="text-error">*</span>
            </label>
            <input
              {...register('moveInEarliest')}
              id="moveInEarliest"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              className={cn('w-full input-field', errors.moveInEarliest && 'border-error')}
            />
            {errors.moveInEarliest && <p className="mt-1 text-sm text-error">{errors.moveInEarliest.message}</p>}
          </div>

          <div>
            <label htmlFor="moveInLatest" className="block text-sm font-medium text-textSecondary mb-1">
              Latest <span className="text-error">*</span>
            </label>
            <input
              {...register('moveInLatest')}
              id="moveInLatest"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              className={cn('w-full input-field', errors.moveInLatest && 'border-error')}
            />
            {errors.moveInLatest && <p className="mt-1 text-sm text-error">{errors.moveInLatest.message}</p>}
          </div>
        </div>
      </fieldset>

      {/* Location Preferences */}
      <fieldset>
        <legend className="block text-sm font-medium text-textSecondary mb-3">Preferred Areas</legend>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-textSecondary">
                Preferred localities
              </label>
              {initialLocality && (
                <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full font-medium">
                  Starting area selected from the map
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {LOCALITY_OPTIONS.map(loc => (
                <label key={loc.value} className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all',
                  watch('preferredLocalities')?.includes(loc.value)
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                )}>
                  <input
                    type="checkbox"
                    value={loc.value}
                    {...register('preferredLocalities')}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm text-textSecondary">{loc.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Exclude localities (optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {LOCALITY_OPTIONS.map(loc => (
                <label key={loc.value} className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all',
                  watch('excludedLocalities')?.includes(loc.value)
                    ? 'border-warning/50 bg-warning/10'
                    : 'border-border hover:border-warning/50'
                )}>
                  <input
                    type="checkbox"
                    value={loc.value}
                    {...register('excludedLocalities')}
                    className="w-4 h-4 accent-warning"
                  />
                  <span className="text-sm text-textSecondary">{loc.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {/* Lifestyle Preferences */}
      <fieldset>
        <legend className="block text-sm font-medium text-textSecondary mb-3">Lifestyle Preferences</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'food', label: 'Food', options: ['veg', 'non_veg', 'no_preference'] },
            { key: 'smoking', label: 'Smoking', options: ['yes', 'no', 'occasionally', 'no_preference'] },
            { key: 'drinking', label: 'Drinking', options: ['yes', 'no', 'occasionally', 'no_preference'] },
            { key: 'pets', label: 'Pets', options: ['allowed', 'not_allowed', 'no_preference'] },
            { key: 'gender', label: 'Gender', options: ['male', 'female', 'any', 'no_preference'] },
            { key: 'workFromHome', label: 'Work from Home', type: 'boolean' as const },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-textSecondary mb-1">{field.label}</label>
              {field.type === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register(`lifestylePrefs.${field.key}`)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm text-textSecondary">Yes</span>
                </label>
              ) : (
                <select
                  {...register(`lifestylePrefs.${field.key}`)}
                  className="w-full input-field"
                >
                  <option value="no_preference">No preference</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      {/* Turnstile */}
      <div className="pt-4">
        <div
          className="cf-turnstile"
          data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || ''}
          data-callback={handleTurnstileCallback}
          data-theme="dark"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !turnstileToken}
          className="flex-1 btn-primary"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Search'}
        </button>
      </div>
    </form>
  );
}