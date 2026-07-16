// src/components/forms/ListingForm.tsx
// Listing submission form

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { listingSubmitSchema, type ListingSubmit } from '@/lib/schemas';
import { cn } from '@/lib/utils';

const BHk_OPTIONS = ['1BHK', '2BHK', '3BHK', '4+BHK', 'room'] as const;
const FURNISHING_OPTIONS = ['unfurnished', 'semi_furnished', 'fully_furnished'] as const;
const LISTING_TYPES = ['whole_flat', 'room_flatmate'] as const;

const AMENITY_OPTIONS = [
  'AC', 'Geyser', 'Washing Machine', 'Refrigerator', 'Microwave',
  'TV', 'WiFi', 'Dining Table', 'Sofa', 'Bed', 'Wardrobe',
  'Balcony', 'Parking', 'Lift', 'Security', 'Power Backup',
  'Gym', 'Pool', 'Clubhouse', 'Garden', 'Rooftop',
] as const;

export function ListingForm({ onSubmit, onCancel }: {
  onSubmit: (data: ListingSubmit) => Promise<void>;
  onCancel: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingSubmit>({
    defaultValues: {
      listingType: 'whole_flat',
      furnishing: 'semi_furnished',
      depositMonths: 2,
      maintenanceIncluded: false,
      amenities: [],
      lifestylePrefs: {},
      contactMethod: 'email',
    },
  });

  const listingType = watch('listingType');
  const bhk = watch('bhk');

  const handleTurnstileCallback = (token: string) => {
    setTurnstileToken(token);
  };

  const onFormSubmit = async (data: ListingSubmit) => {
    setIsSubmitting(true);
    try {
      // Manual validation with Zod v4 schema
      const result = listingSubmitSchema.safeParse(data);
      if (!result.success) {
        // Set form errors from Zod validation
        const fieldErrors = result.error.flatten().fieldErrors;
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            // We can't easily set errors without resolver, so just log
            console.warn(`Validation error for ${field}:`, messages[0]);
          }
        });
        return;
      }
      await onSubmit({ ...data, turnstileToken });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" noValidate>
      {/* Type Selection */}
      <fieldset>
        <legend className="block text-sm font-medium text-textSecondary mb-3">What are you listing?</legend>
        <div className="grid grid-cols-2 gap-3">
          {LISTING_TYPES.map(type => (
            <label
              key={type}
              className={cn(
                'relative p-4 border-2 rounded-lg cursor-pointer transition-all',
                listingType === type
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50'
              )}
            >
              <input
                {...register('listingType', { value: type })}
                type="radio"
                className="sr-only"
              />
              <div className="flex flex-col items-center gap-2">
                <span className="text-lg font-medium text-textPrimary">
                  {type === 'whole_flat' ? 'Whole Flat' : 'Room/Flatmate'}
                </span>
                <span className="text-sm text-textMuted">
                  {type === 'whole_flat' ? 'Entire apartment' : 'Single room in shared flat'}
                </span>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Basic Details */}
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-textSecondary mb-1">
            Title <span className="text-error">*</span>
          </label>
          <input
            {...register('title')}
            id="title"
            placeholder="e.g., Spacious 2BHK in Gachibowli near Metro"
            className={cn('w-full input-field', errors.title && 'border-error')}
          />
          {errors.title && <p className="mt-1 text-sm text-error">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-textSecondary mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            id="description"
            rows={3}
            placeholder="Describe the property, nearby landmarks, special features..."
            className={cn('w-full input-field', errors.description && 'border-error')}
          />
          {errors.description && <p className="mt-1 text-sm text-error">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="bhk" className="block text-sm font-medium text-textSecondary mb-1">
              BHK <span className="text-error">*</span>
            </label>
            <select
              {...register('bhk')}
              id="bhk"
              className={cn('w-full input-field', errors.bhk && 'border-error')}
            >
              <option value="">Select BHK</option>
              {BHk_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.bhk && <p className="mt-1 text-sm text-error">{errors.bhk.message}</p>}
          </div>

          <div>
            <label htmlFor="furnishing" className="block text-sm font-medium text-textSecondary mb-1">
              Furnishing <span className="text-error">*</span>
            </label>
            <select
              {...register('furnishing')}
              id="furnishing"
              className={cn('w-full input-field', errors.furnishing && 'border-error')}
            >
              <option value="">Select furnishing</option>
              {FURNISHING_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
              ))}
            </select>
            {errors.furnishing && <p className="mt-1 text-sm text-error">{errors.furnishing.message}</p>}
          </div>

          <div>
            <label htmlFor="rent" className="block text-sm font-medium text-textSecondary mb-1">
              Monthly Rent (₹) <span className="text-error">*</span>
            </label>
            <input
              {...register('rent', { valueAsNumber: true })}
              id="rent"
              type="number"
              min="1000"
              max="500000"
              placeholder="e.g., 25000"
              className={cn('w-full input-field', errors.rent && 'border-error')}
            />
            {errors.rent && <p className="mt-1 text-sm text-error">{errors.rent.message}</p>}
          </div>

          <div>
            <label htmlFor="depositMonths" className="block text-sm font-medium text-textSecondary mb-1">
              Deposit (months)
            </label>
            <input
              {...register('depositMonths', { valueAsNumber: true })}
              id="depositMonths"
              type="number"
              min="0"
              max="24"
              className="w-full input-field"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              {...register('maintenanceIncluded', { value: true })}
              type="checkbox"
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-textSecondary">Maintenance included in rent</span>
          </label>
        </div>
      </div>

      {/* Location */}
      <fieldset>
        <legend className="block text-sm font-medium text-textSecondary mb-3">Location</legend>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="locality" className="block text-sm font-medium text-textSecondary mb-1">
                Locality <span className="text-error">*</span>
              </label>
              <input
                {...register('locality')}
                id="locality"
                placeholder="e.g., gachibowli"
                className={cn('w-full input-field', errors.locality && 'border-error')}
              />
              {errors.locality && <p className="mt-1 text-sm text-error">{errors.locality.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Coordinates (auto-filled from map)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  {...register('lat', { valueAsNumber: true })}
                  placeholder="Latitude"
                  className="w-full input-field"
                  readOnly
                />
                <input
                  {...register('lon', { valueAsNumber: true })}
                  placeholder="Longitude"
                  className="w-full input-field"
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="availableFrom" className="block text-sm font-medium text-textSecondary mb-1">
                Available From <span className="text-error">*</span>
              </label>
              <input
                {...register('availableFrom')}
                id="availableFrom"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className={cn('w-full input-field', errors.availableFrom && 'border-error')}
              />
              {errors.availableFrom && <p className="mt-1 text-sm text-error">{errors.availableFrom.message}</p>}
            </div>

            <div>
              <label htmlFor="availableUntil" className="block text-sm font-medium text-textSecondary mb-1">
                Available Until
              </label>
              <input
                {...register('availableUntil')}
                id="availableUntil"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="w-full input-field"
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Amenities */}
      <fieldset>
        <legend className="block text-sm font-medium text-textSecondary mb-3">Amenities</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {AMENITY_OPTIONS.map(amenity => (
            <label key={amenity} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={amenity}
                {...register('amenities')}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-sm text-textSecondary">{amenity}</span>
            </label>
          ))}
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

      {/* Contact Preferences (Private) */}
      <fieldset>
        <legend className="block text-sm font-medium text-textSecondary mb-3">Contact Preferences <span className="text-textMuted text-normal font-normal">(kept private)</span></legend>
        <div className="space-y-4">
          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-textSecondary mb-1">
              Email for verification <span className="text-error">*</span>
            </label>
            <input
              {...register('contactEmail')}
              id="contactEmail"
              type="email"
              placeholder="your@email.com"
              className={cn('w-full input-field', errors.contactEmail && 'border-error')}
            />
            {errors.contactEmail && <p className="mt-1 text-sm text-error">{errors.contactEmail.message}</p>}
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-textSecondary mb-1">
              Phone (optional)
            </label>
            <input
              {...register('contactPhone')}
              id="contactPhone"
              type="tel"
              placeholder="+91 98765 43210"
              className={cn('w-full input-field', errors.contactPhone && 'border-error')}
            />
            {errors.contactPhone && <p className="mt-1 text-sm text-error">{errors.contactPhone.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contactMethod" className="block text-sm font-medium text-textSecondary mb-1">
                Preferred contact method
              </label>
              <select
                {...register('contactMethod')}
                id="contactMethod"
                className="w-full input-field"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">
                Contact window (optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  {...register('contactWindowStart')}
                  type="time"
                  placeholder="From"
                  className="w-full input-field"
                />
                <input
                  {...register('contactWindowEnd')}
                  type="time"
                  placeholder="To"
                  className="w-full input-field"
                />
              </div>
            </div>
          </div>
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
          {isSubmitting ? 'Submitting...' : 'Submit Listing'}
        </button>
      </div>
    </form>
  );
}