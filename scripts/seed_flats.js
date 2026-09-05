// scripts/seed_flats.js
// Seeds realistic flats across key Hyderabad localities into rent_pins
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LOCALITY_DATA = [
  {
    locality: 'gachibowli',
    center: [78.3483, 17.4399],
    flats: [
      { bhk: '1BHK', rentMin: 14000, rentMax: 18000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 22000, rentMax: 26000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 24000, rentMax: 28000, furnishing: 'fully_furnished' },
      { bhk: '3BHK', rentMin: 32000, rentMax: 38000, furnishing: 'semi_furnished' },
      { bhk: '3BHK', rentMin: 38000, rentMax: 44000, furnishing: 'fully_furnished' },
      { bhk: '2BHK', rentMin: 20000, rentMax: 24000, furnishing: 'unfurnished' },
      { bhk: '1BHK', rentMin: 12000, rentMax: 15000, furnishing: 'semi_furnished' },
      { bhk: '4+BHK', rentMin: 55000, rentMax: 65000, furnishing: 'fully_furnished' },
    ],
  },
  {
    locality: 'madhapur',
    center: [78.3808, 17.4499],
    flats: [
      { bhk: '1BHK', rentMin: 16000, rentMax: 20000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 28000, rentMax: 34000, furnishing: 'fully_furnished' },
      { bhk: '2BHK', rentMin: 25000, rentMax: 30000, furnishing: 'semi_furnished' },
      { bhk: '3BHK', rentMin: 42000, rentMax: 48000, furnishing: 'fully_furnished' },
      { bhk: '3BHK', rentMin: 36000, rentMax: 42000, furnishing: 'semi_furnished' },
      { bhk: '1BHK', rentMin: 15000, rentMax: 18000, furnishing: 'fully_furnished' },
      { bhk: '2BHK', rentMin: 27000, rentMax: 32000, furnishing: 'semi_furnished' },
      { bhk: '4+BHK', rentMin: 65000, rentMax: 78000, furnishing: 'fully_furnished' },
      { bhk: '2BHK', rentMin: 30000, rentMax: 35000, furnishing: 'fully_furnished' },
    ],
  },
  {
    locality: 'kondapur',
    center: [78.3536, 17.4617],
    flats: [
      { bhk: '1BHK', rentMin: 13000, rentMax: 16000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 21000, rentMax: 25000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 23000, rentMax: 27000, furnishing: 'fully_furnished' },
      { bhk: '3BHK', rentMin: 30000, rentMax: 36000, furnishing: 'semi_furnished' },
      { bhk: '3BHK', rentMin: 35000, rentMax: 40000, furnishing: 'fully_furnished' },
      { bhk: '1BHK', rentMin: 11000, rentMax: 14000, furnishing: 'unfurnished' },
      { bhk: '2BHK', rentMin: 22000, rentMax: 26000, furnishing: 'semi_furnished' },
    ],
  },
  {
    locality: 'hitec-city',
    center: [78.3783, 17.4435],
    flats: [
      { bhk: '1BHK', rentMin: 18000, rentMax: 22000, furnishing: 'fully_furnished' },
      { bhk: '2BHK', rentMin: 32000, rentMax: 38000, furnishing: 'fully_furnished' },
      { bhk: '2BHK', rentMin: 28000, rentMax: 33000, furnishing: 'semi_furnished' },
      { bhk: '3BHK', rentMin: 45000, rentMax: 55000, furnishing: 'fully_furnished' },
      { bhk: '3BHK', rentMin: 40000, rentMax: 48000, furnishing: 'semi_furnished' },
      { bhk: '4+BHK', rentMin: 70000, rentMax: 85000, furnishing: 'fully_furnished' },
      { bhk: '2BHK', rentMin: 30000, rentMax: 35000, furnishing: 'fully_furnished' },
    ],
  },
  {
    locality: 'financial-district',
    center: [78.3387, 17.4250],
    flats: [
      { bhk: '2BHK', rentMin: 30000, rentMax: 36000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 34000, rentMax: 40000, furnishing: 'fully_furnished' },
      { bhk: '3BHK', rentMin: 48000, rentMax: 56000, furnishing: 'fully_furnished' },
      { bhk: '3BHK', rentMin: 42000, rentMax: 50000, furnishing: 'semi_furnished' },
      { bhk: '4+BHK', rentMin: 75000, rentMax: 90000, furnishing: 'fully_furnished' },
    ],
  },
  {
    locality: 'kukatpally',
    center: [78.4400, 17.4900],
    flats: [
      { bhk: '1BHK', rentMin: 9000, rentMax: 12000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 16000, rentMax: 20000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 18000, rentMax: 22000, furnishing: 'fully_furnished' },
      { bhk: '3BHK', rentMin: 24000, rentMax: 30000, furnishing: 'semi_furnished' },
      { bhk: '3BHK', rentMin: 28000, rentMax: 35000, furnishing: 'fully_furnished' },
    ],
  },
  {
    locality: 'banjara-hills',
    center: [78.4200, 17.4180],
    flats: [
      { bhk: '2BHK', rentMin: 35000, rentMax: 45000, furnishing: 'semi_furnished' },
      { bhk: '3BHK', rentMin: 55000, rentMax: 70000, furnishing: 'fully_furnished' },
      { bhk: '3BHK', rentMin: 48000, rentMax: 60000, furnishing: 'semi_furnished' },
      { bhk: '4+BHK', rentMin: 80000, rentMax: 110000, furnishing: 'fully_furnished' },
    ],
  },
  {
    locality: 'manikonda',
    center: [78.3650, 17.4050],
    flats: [
      { bhk: '1BHK', rentMin: 11000, rentMax: 14000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 18000, rentMax: 22000, furnishing: 'semi_furnished' },
      { bhk: '2BHK', rentMin: 20000, rentMax: 24000, furnishing: 'fully_furnished' },
      { bhk: '3BHK', rentMin: 26000, rentMax: 32000, furnishing: 'semi_furnished' },
      { bhk: '3BHK', rentMin: 30000, rentMax: 36000, furnishing: 'fully_furnished' },
    ],
  },
];

async function seed() {
  console.log('Seeding realistic flats across Hyderabad localities...');
  let totalInserted = 0;

  for (const group of LOCALITY_DATA) {
    const [centerLon, centerLat] = group.center;
    const inserts = group.flats.map((flat, index) => {
      // Offset points by ~100m - 500m around locality center
      const angle = (index / group.flats.length) * 2 * Math.PI;
      const radiusDeg = 0.003 + (index * 0.001); // roughly 300m - 800m
      const lon = +(centerLon + radiusDeg * Math.cos(angle)).toFixed(6);
      const lat = +(centerLat + radiusDeg * Math.sin(angle)).toFixed(6);
      const pointWkt = `POINT(${lon} ${lat})`;

      return {
        geom: pointWkt,
        exact_geom: pointWkt,
        rent_min: flat.rentMin,
        rent_max: flat.rentMax,
        bhk: flat.bhk,
        furnishing: flat.furnishing,
        locality: group.locality,
        status: 'approved',
      };
    });

    const { data, error } = await supabase.from('rent_pins').insert(inserts).select();
    if (error) {
      console.error(`Error inserting for ${group.locality}:`, error.message);
    } else {
      console.log(`Inserted ${data?.length || 0} flats for ${group.locality}`);
      totalInserted += data?.length || 0;
    }
  }

  console.log(`Finished seeding. Total inserted: ${totalInserted}`);
}

seed().catch(console.error);
