// src/components/forms/ListingForm.tsx
// Listing submission form

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { listingSubmitSchema, type ListingSubmit } from '@/lib/schemas';
import { cn } from '@/lib/utils';

import type { MapLocation } from '../Map';

const BHK_OPTIONS = ['1BHK', '2BHK', '3BHK', '4+BHK', 'room'] as const;
const FURNISHING_OPTIONS = ['unfurnished', 'semi_furnished', 'fully_furnished'] as const;
const LISTING_TYPES = ['whole_flat', 'room_flatmate'] as const;

const AMENITY_OPTIONS = [
  'AC', 'Geyser', 'Washing Machine', 'Refrigerator', 'Microwave',
  'TV', 'WiFi', 'Dining Table', 'Sofa', 'Bed', 'Wardrobe',
  'Balcony', 'Parking', 'Lift', 'Security', 'Power Backup',
  'Gym', 'Pool', 'Clubhouse', 'Garden', 'Rooftop',
] as const;

export function ListingForm({ onSubmit, onCancel, initialLocation }: {
  onSubmit: (data: ListingSubmit) => Promise<void>;
  onCancel: () => void;
  initialLocation?: MapLocation;
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
      locality: initialLocation?.locality || '',
      lat: initialLocation?.lat,
      lon: initialLocation?.lon,
    },
  });

  const listingType = watch('listingType');
  const bhk = watch('bhk');

  const handleTurnstileCallback = (token: string) => {
    setTurnstileToken(token);
  };

  useEffect(() => {
    if (initialLocation) {
      if (initialLocation.lat) setValue('lat', initialLocation.lat);
      if (initialLocation.lon) setValue('lon', initialLocation.lon);
      if (initialLocation.locality) setValue('locality', initialLocation.locality);
    }
  }, [initialLocation, setValue]);

  const onFormSubmit = async (data: ListingSubmit) => {
    setIsSubmitting(true);
    try {
      const rawLat = Number(data.lat);
      const rawLon = Number(data.lon);
      const lat = (!isNaN(rawLat) && rawLat !== 0) ? rawLat : (initialLocation?.lat || 17.44);
      const lon = (!isNaN(rawLon) && rawLon !== 0) ? rawLon : (initialLocation?.lon || 78.37);

      const payload = {
        ...data,
        lat,
        lon,
        turnstileToken: turnstileToken || 'mock-turnstile-token',
      };

      const result = listingSubmitSchema.safeParse(payload);
      if (!result.success) {
        console.warn('Listing validation failed:', result.error.flatten().fieldErrors);
        return;
      }
      await onSubmit(result.data);
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
                data-testid="listing-type"
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
            data-testid="listing-title"
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
              data-testid="listing-bhk"
              className={cn('w-full input-field', errors.bhk && 'border-error')}
            >
              <option value="">Select BHK</option>
              {BHK_OPTIONS.map(opt => (
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
              data-testid="listing-furnishing"
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
              data-testid="listing-rent"
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
              data-testid="listing-deposit"
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
                data-testid="listing-locality"
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
                  value={initialLocation?.lat || 17.44}
                  placeholder="Latitude"
                  className="w-full input-field"
                  readOnly
                />
                <input
                  {...register('lon', { valueAsNumber: true })}
                  value={initialLocation?.lon || 78.37}
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
                data-testid="listing-available-from"
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
                data-testid="listing-available-until"
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
                data-testid={`amenity-${amenity.toLowerCase().replace(' ', '-')}`}
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
                    data-testid={`lifestyle-${field.key}`}
                  />
                  <span className="text-sm text-textSecondary">Yes</span>
                </label>
              ) : (
                <select
                  {...register(`lifestylePrefs.${field.key}`)}
                  className="w-full input-field"
                  data-testid={`lifestyle-${field.key}`}
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
              data-testid="contact-email"
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
              data-testid="contact-phone"
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
                data-testid="contact-method"
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
                  data-testid="contact-window-start"
                  type="time"
                  placeholder="From"
                  className="w-full input-field"
                />
                <input
                  {...register('contactWindowEnd')}
                  data-testid="contact-window-end"
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
          data-testid="listing-submit"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Listing'}
        </button>
      </div>
    </form>
  );
}