// src/lib/schemas/index.ts
// Zod schemas for all API endpoints - single source of truth for validation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-unused-vars

import { z } from 'zod';

// ============================================
// Reusable primitives
// ============================================

const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

const rentSchema = z.number().int().min(1000).max(500000); // ₹1k - ₹5L
const depositSchema = z.number().int().min(0).max(24);

const localitySchema = z.string().min(2).max(100)
  .refine(val => /^[a-zA-Z0-9\s-]+$/.test(val), { message: 'Locality must only contain letters, numbers, spaces, and hyphens' })
  .transform(val => val.toLowerCase().trim().replace(/[\s_-]+/g, '-'))
  .pipe(z.string().min(2).max(50).regex(/^[a-z0-9-]+$/));
const bhkSchema = z.enum(['1BHK', '2BHK', '3BHK', '4+BHK', 'room', 'any']);
const furnishingSchema = z.enum(['unfurnished', 'semi_furnished', 'fully_furnished']);
const listingTypeSchema = z.enum(['whole_flat', 'room_flatmate']);

const phoneSchema = z.string().regex(/^(\+91|91)?[6-9]\d{9}$/, 'Invalid Indian phone number');
const emailSchema = z.string().email().toLowerCase().max(254);

// Coordinates with precision bounds
const latSchema = z.number().min(17.2).max(17.6); // Hyderabad bounds
const lonSchema = z.number().min(78.2).max(78.6);
const pointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([lonSchema, latSchema]),
});

// ============================================
// Map API
// ============================================

export const mapQuerySchema = z.object({
  // Bounding box: minLon,minLat,maxLon,maxLat
  bbox: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/),
  zoom: z.number().int().min(1).max(20),
  // Optional filters
  type: z.enum(['pins', 'listings', 'all']).default('all'),
  minRent: rentSchema.optional(),
  maxRent: rentSchema.optional(),
  bhk: bhkSchema.optional(),
  furnishing: furnishingSchema.optional(),
});

export type MapQuery = z.infer<typeof mapQuerySchema>;

export const mapPinSchema = z.discriminatedUnion('type', [
  z.object({
    id: uuidSchema,
    type: z.literal('rent_pin'),
    geom: pointSchema,
    rentMin: rentSchema,
    rentMax: rentSchema,
    bhk: bhkSchema,
    furnishing: furnishingSchema,
    locality: localitySchema,
    pinCount: z.number().int().optional(),
  }),
  z.object({
    id: uuidSchema,
    type: z.literal('listing'),
    geom: pointSchema,
    rent: rentSchema,
    bhk: bhkSchema,
    furnishing: furnishingSchema,
    listingType: listingTypeSchema,
    locality: localitySchema,
  }),
  z.object({
    id: uuidSchema,
    type: z.literal('tolet_board'),
    geom: pointSchema,
    locality: localitySchema,
  }),
]);

export type MapPin = z.infer<typeof mapPinSchema>;

export const toLetBoardSubmitSchema = z.object({
  lon: lonSchema,
  lat: latSchema,
  phone: phoneSchema,
  locality: localitySchema,
  imageMetadata: z.object({
    name: z.string().min(1),
    size: z.number().int().max(5 * 1024 * 1024), // 5MB
    type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  }),
  turnstileToken: z.string().min(1, 'Turnstile token required'),
  consent: z.boolean().refine(v => v === true, {
    message: 'You must confirm visibility consent',
  }),
});

export type ToLetBoardSubmit = z.infer<typeof toLetBoardSubmitSchema>;

export const toLetBoardResponseSchema = z.object({
  id: uuidSchema,
  status: z.enum(['pending', 'approved', 'quarantined', 'deleted']),
  message: z.string(),
});

export type ToLetBoardResponse = z.infer<typeof toLetBoardResponseSchema>;

export const mapResponseSchema = z.object({
  items: z.array(mapPinSchema),
  total: z.number().int(),
  viewport: z.object({
    bbox: z.array(z.number()).length(4),
    zoom: z.number().int(),
  }),
});

export type MapResponse = z.infer<typeof mapResponseSchema>;

// ============================================
// Rent Pins API
// ============================================

export const rentPinSubmitSchema = z.object({
  // Exact coordinates (will be jittered server-side)
  lon: lonSchema,
  lat: latSchema,
  // Rent range
  rentMin: rentSchema,
  rentMax: rentSchema,
  // Property details
  bhk: bhkSchema,
  furnishing: furnishingSchema,
  locality: localitySchema,
  // Turnstile token
  turnstileToken: z.string().min(1, 'Turnstile token required'),
  // Optional metadata
  notes: z.string().max(500).optional(),
}).refine(d => d.rentMin <= d.rentMax, {
  message: 'rentMin must be <= rentMax',
  path: ['rentMax'],
});

export type RentPinSubmit = z.infer<typeof rentPinSubmitSchema>;

export const rentPinResponseSchema = z.object({
  id: uuidSchema,
  status: z.enum(['pending', 'approved']),
  message: z.string(),
});

export type RentPinResponse = z.infer<typeof rentPinResponseSchema>;

// ============================================
// Listings API
// ============================================

const amenitiesSchema = z.array(z.string().max(50)).max(20);

const lifestylePrefsSchema = z.object({
  food: z.enum(['veg', 'non_veg', 'no_preference']).default('no_preference'),
  smoking: z.enum(['yes', 'no', 'occasionally', 'no_preference']).default('no_preference'),
  drinking: z.enum(['yes', 'no', 'occasionally', 'no_preference']).default('no_preference'),
  workFromHome: z.boolean().default(false),
  pets: z.enum(['allowed', 'not_allowed', 'no_preference']).default('no_preference'),
  gender: z.enum(['male', 'female', 'any', 'no_preference']).default('no_preference'),
  ageRange: z.object({
    min: z.number().int().min(18).max(60).optional(),
    max: z.number().int().min(18).max(60).optional(),
  }).optional(),
}).passthrough(); // Allow extra fields for future extensibility

export const listingSubmitSchema = z.object({
  // Type
  listingType: listingTypeSchema,
  // Basic details
  title: z.string().min(10).max(100),
  description: z.string().min(50).max(5000).optional(),
  bhk: bhkSchema,
  furnishing: furnishingSchema,
  rent: rentSchema,
  depositMonths: depositSchema.default(2),
  maintenanceIncluded: z.boolean().default(false),
  // Location (approximate)
  locality: localitySchema,
  lon: lonSchema,
  lat: latSchema,
  // Availability
  availableFrom: z.string().date(),
  availableUntil: z.string().date().optional(),
  // Amenities & lifestyle
  amenities: amenitiesSchema.default([]),
  lifestylePrefs: lifestylePrefsSchema.default({
    food: 'no_preference',
    smoking: 'no_preference',
    drinking: 'no_preference',
    workFromHome: false,
    pets: 'no_preference',
    gender: 'no_preference',
  }),
  // Contact preferences (stored privately)
  contactPhone: phoneSchema.optional(),
  contactEmail: emailSchema.optional(),
  contactMethod: z.enum(['email', 'phone', 'both']).default('email'),
  contactWindowStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  contactWindowEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  // Turnstile
  turnstileToken: z.string().min(1),
}).refine(d => {
  if (d.contactWindowStart && d.contactWindowEnd) {
    return d.contactWindowStart < d.contactWindowEnd;
  }
  return true;
}, {
  message: 'contactWindowStart must be before contactWindowEnd',
  path: ['contactWindowEnd'],
}).refine(d => {
  if (d.availableFrom && d.availableUntil) {
    return new Date(d.availableFrom) <= new Date(d.availableUntil);
  }
  return true;
}, {
  message: 'availableFrom must be before availableUntil',
  path: ['availableUntil'],
});

export type ListingSubmit = z.infer<typeof listingSubmitSchema>;

export const listingResponseSchema = z.object({
  id: uuidSchema,
  status: z.enum(['pending', 'approved']),
  message: z.string(),
});

export type ListingResponse = z.infer<typeof listingResponseSchema>;

// Public listing view (for map/content)
export const publicListingSchema = z.object({
  id: uuidSchema,
  listingType: listingTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  bhk: bhkSchema,
  furnishing: furnishingSchema,
  rent: rentSchema,
  depositMonths: depositSchema,
  maintenanceIncluded: z.boolean(),
  locality: localitySchema,
  geom: pointSchema,
  availableFrom: z.string().date(),
  availableUntil: z.string().date().nullable(),
  amenities: amenitiesSchema,
  lifestylePrefs: lifestylePrefsSchema,
  createdAt: z.string().datetime(),
  viewCount: z.number().int(),
});

export type PublicListing = z.infer<typeof publicListingSchema>;

// ============================================
// Seekers API
// ============================================

export const seekerSubmitSchema = z.object({
  // The seeker's email is required to look up / create their identity. It is
  // not surfaced in public listings. It is validated by Zod here so the
  // route handler doesn't need an unsafe cast on `data as Record<...>`.
  email: emailSchema,
  maxBudget: rentSchema,
  minBudget: rentSchema.optional(),
  bhk: bhkSchema,
  listingType: listingTypeSchema,
  furnishing: furnishingSchema.optional(),
  moveInEarliest: z.string().date(),
  moveInLatest: z.string().date(),
  preferredLocalities: z.array(localitySchema).max(10).default([]),
  excludedLocalities: z.array(localitySchema).max(10).default([]),
  lifestylePrefs: lifestylePrefsSchema.default({
    food: 'no_preference',
    smoking: 'no_preference',
    drinking: 'no_preference',
    workFromHome: false,
    pets: 'no_preference',
    gender: 'no_preference',
  }),
  turnstileToken: z.string().min(1),
}).refine(d => d.minBudget === undefined || d.minBudget <= d.maxBudget, {
  message: 'minBudget must be <= maxBudget',
  path: ['maxBudget'],
}).refine(d => new Date(d.moveInEarliest) <= new Date(d.moveInLatest), {
  message: 'moveInEarliest must be <= moveInLatest',
  path: ['moveInLatest'],
});

export type SeekerSubmit = z.infer<typeof seekerSubmitSchema>;

export const seekerResponseSchema = z.object({
  id: uuidSchema,
  status: z.enum(['pending', 'approved']),
  message: z.string(),
});

export type SeekerResponse = z.infer<typeof seekerResponseSchema>;

// ============================================
// Email Verification & Action Tokens
// ============================================

export const verifyTokenSchema = z.object({
  token: z.string().min(32).max(128),
});

export type VerifyToken = z.infer<typeof verifyTokenSchema>;

export const verifyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  // For listings/seekers: include the resource ID
  resourceId: uuidSchema.optional(),
  resourceType: z.enum(['listing', 'seeker', 'identity']).optional(),
});

export type VerifyResponse = z.infer<typeof verifyResponseSchema>;

// ============================================
// Matches API
// ============================================

export const matchRespondSchema = z.object({
  token: z.string().min(32).max(128),
  action: z.enum(['accept', 'decline']),
});

export type MatchRespond = z.infer<typeof matchRespondSchema>;

export const matchResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  matchStatus: z.enum(['pending', 'accepted', 'declined', 'introduced']),
  introductionId: uuidSchema.optional(),
});

export type MatchResponse = z.infer<typeof matchResponseSchema>;

export const matchDigestItemSchema = z.object({
  matchId: uuidSchema,
  listing: publicListingSchema,
  score: z.number().int().min(0).max(100),
  scoreBreakdown: z.object({
    geography: z.number().int().min(0).max(100),
    budget: z.number().int().min(0).max(100),
    bhk: z.number().int().min(0).max(100),
    timing: z.number().int().min(0).max(100),
    lifestyle: z.number().int().min(0).max(100),
  }),
  // Anonymized seeker info
  seekerProfile: z.object({
    budgetRange: z.string(), // e.g., "₹20k-30k"
    bhk: bhkSchema,
    moveInWindow: z.string(), // e.g., "Sep 1-15"
    lifestyleTags: z.array(z.string()),
  }),
});

export type MatchDigestItem = z.infer<typeof matchDigestItemSchema>;

// ============================================
// Reports API
// ============================================

export const reportSubmitSchema = z.object({
  targetType: z.enum(['rent_pin', 'listing', 'seeker', 'match', 'tolet_board']),
  targetId: uuidSchema,
  reason: z.enum(['fake', 'broker', 'scam', 'inappropriate', 'other']),
  description: z.string().min(10).max(2000).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  turnstileToken: z.string().min(1),
});

export type ReportSubmit = z.infer<typeof reportSubmitSchema>;

export const reportResponseSchema = z.object({
  id: uuidSchema,
  status: z.literal('pending'),
  message: z.string(),
});

export type ReportResponse = z.infer<typeof reportResponseSchema>;

// ============================================
// Resend Webhook API
// ============================================

export const resendWebhookSchema = z.object({
  // Resend webhook payload
  type: z.enum(['email.received']),
  data: z.object({
    email_id: z.string(),
    from: z.string().email(),
    to: z.array(z.string().email()),
    subject: z.string(),
    text: z.string().optional(),
    html: z.string().optional(),
    headers: z.record(z.string(), z.string()),
    attachments: z.array(z.object({
      filename: z.string(),
      content_type: z.string(),
      size: z.number().int(),
    })).optional(),
    received_at: z.string().datetime(),
  }),
  // For idempotency
  created_at: z.string().datetime(),
});

export type ResendWebhook = z.infer<typeof resendWebhookSchema>;

// ============================================
// Stats API
// ============================================

export const statsQuerySchema = z.object({
  locality: localitySchema.optional(),
  type: z.enum(['locality', 'city', 'viewport']).default('city'),
  bbox: z.string().optional(),
  zoom: z.number().int().optional(),
});

export const localityStatsSchema = z.object({
  locality: localitySchema,
  totalListings: z.number().int(),
  wholeFlatCount: z.number().int(),
  roomCount: z.number().int(),
  medianRent: z.number().int(),
  minRent: z.number().int(),
  maxRent: z.number().int(),
  avgRent: z.number().int(),
  bhkVariety: z.number().int(),
  sampleSize: z.number().int(),
  lastUpdated: z.string().datetime(),
  commonAmenities: z.array(z.object({
    name: z.string(),
    count: z.number().int(),
  })).max(10),
  metroProximity: z.object({
    nearestStation: z.string(),
    distanceMeters: z.number().int(),
    line: z.string(),
  }).optional(),
});

export type LocalityStats = z.infer<typeof localityStatsSchema>;

export const cityStatsSchema = z.object({
  totalRentPins: z.number().int(),
  totalListings: z.number().int(),
  totalSeekers: z.number().int(),
  totalMatches: z.number().int(),
});

export type CityStats = z.infer<typeof cityStatsSchema>;

export const viewportStatsSchema = z.object({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pinsByBhk: z.record(bhkSchema, z.number().int()) as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pinsByRentBand: z.record(z.string(), z.number().int()) as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listingsByType: z.record(listingTypeSchema, z.number().int()) as any,
  totalInViewport: z.number().int(),
});

export type ViewportStats = z.infer<typeof viewportStatsSchema>;

// ============================================
// Health Check
// ============================================

export const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string(),
  checks: z.array(z.object({
    name: z.string(),
    status: z.enum(['pass', 'warn', 'fail']),
    latencyMs: z.number().int().optional(),
    message: z.string().optional(),
  })),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// ============================================
// Schema registry for runtime validation
// ============================================

export const schemas = {
  mapQuery: mapQuerySchema,
  rentPinSubmit: rentPinSubmitSchema,
  listingSubmit: listingSubmitSchema,
  seekerSubmit: seekerSubmitSchema,
  verifyToken: verifyTokenSchema,
  matchRespond: matchRespondSchema,
  reportSubmit: reportSubmitSchema,
  resendWebhook: resendWebhookSchema,
  statsQuery: statsQuerySchema,
  toLetBoardSubmit: toLetBoardSubmitSchema,
} as const;

export type SchemaKey = keyof typeof schemas;

// Validation helper
export function validateSchema<T extends SchemaKey>(
  key: T,
  data: unknown
): z.infer<typeof schemas[T]> {
  return schemas[key].parse(data) as z.infer<typeof schemas[T]>;
}