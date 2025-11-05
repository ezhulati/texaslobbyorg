import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types';

// Environment variables
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://tavwfbqflredtowjelbx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

const sampleLobbyists = [
  {
    first_name: 'Michael',
    last_name: 'Smith',
    slug: 'michael-smith',
    email: 'msmith@texaslobby.com',
    phone: '512-555-0101',
    bio: 'Experienced healthcare policy advocate with 15+ years representing major hospital systems and insurance providers. Deep expertise in Texas legislative process and strong relationships with key committee members.',
    cities: ['austin', 'dallas'],
    subject_areas: ['Healthcare'],
    subscription_tier: 'featured' as const,
    is_active: true,
    is_claimed: true,
  },
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    slug: 'sarah-johnson',
    email: 'sjohnson@advocacy.com',
    phone: '713-555-0202',
    bio: 'Energy sector specialist focusing on renewable energy policy and grid modernization. Former ERCOT analyst with technical expertise in power systems and environmental regulations.',
    cities: ['houston'],
    subject_areas: ['Energy', 'Environmental'],
    subscription_tier: 'premium' as const,
    is_active: true,
    is_claimed: true,
  },
  {
    first_name: 'Robert',
    last_name: 'Williams',
    slug: 'robert-williams',
    email: 'rwilliams@txaffairs.com',
    phone: '214-555-0303',
    bio: 'Real estate and transportation infrastructure expert. Represents major developers and transit authorities on zoning, land use, and infrastructure funding issues.',
    cities: ['dallas', 'fort-worth'],
    subject_areas: ['Real Estate', 'Transportation'],
    subscription_tier: 'premium' as const,
    is_active: true,
    is_claimed: true,
  },
  {
    first_name: 'Jennifer',
    last_name: 'Brown',
    slug: 'jennifer-brown',
    email: 'jbrown@capitolgroup.com',
    phone: '512-555-0404',
    bio: 'Education and technology policy specialist. Works with K-12 districts, universities, and ed-tech companies on funding, accountability, and innovation initiatives.',
    cities: ['austin'],
    subject_areas: ['Education', 'Technology'],
    subscription_tier: 'featured' as const,
    is_active: true,
    is_claimed: true,
  },
  {
    first_name: 'David',
    last_name: 'Jones',
    slug: 'david-jones',
    email: 'djones@txreps.com',
    phone: '210-555-0505',
    bio: 'Healthcare and labor law advocate representing medical professionals and healthcare workers. Extensive experience with workforce issues and professional licensing.',
    cities: ['san-antonio'],
    subject_areas: ['Healthcare', 'Labor & Employment'],
    subscription_tier: 'free' as const,
    is_active: true,
    is_claimed: true,
  },
  {
    first_name: 'Maria',
    last_name: 'Garcia',
    slug: 'maria-garcia',
    email: 'mgarcia@lobbypartners.com',
    phone: '713-555-0606',
    bio: 'Energy and municipal government specialist based in Houston. Advises cities and counties on energy policy, infrastructure projects, and intergovernmental relations.',
    cities: ['houston', 'corpus-christi'],
    subject_areas: ['Energy', 'Municipal/County'],
    subscription_tier: 'premium' as const,
    is_active: true,
    is_claimed: true,
  },
  {
    first_name: 'James',
    last_name: 'Martinez',
    slug: 'james-martinez',
    email: 'jmartinez@texaspolicy.com',
    phone: '512-555-0707',
    bio: 'Financial services and technology regulation expert. Former banking regulator with deep knowledge of fintech, cybersecurity, and data privacy policy.',
    cities: ['austin'],
    subject_areas: ['Financial Services', 'Technology'],
    subscription_tier: 'featured' as const,
    is_active: true,
    is_claimed: true,
  },
  {
    first_name: 'Lisa',
    last_name: 'Rodriguez',
    slug: 'lisa-rodriguez',
    email: 'lrodriguez@statehouse.com',
    phone: '214-555-0808',
    bio: 'Criminal justice reform and education advocate. Works with nonprofits, school districts, and law enforcement on policy modernization and community safety initiatives.',
    cities: ['dallas'],
    subject_areas: ['Criminal Justice', 'Education'],
    subscription_tier: 'free' as const,
    is_active: true,
    is_claimed: true,
  },
  {
    first_name: 'Thomas',
    last_name: 'Anderson',
    slug: 'thomas-anderson',
    email: 'tanderson@txstrat.com',
    phone: '817-555-0909',
    bio: 'Transportation and real estate development specialist serving DFW metroplex. Expertise in highway funding, public transit, and commercial development regulations.',
    cities: ['fort-worth'],
    subject_areas: ['Transportation', 'Real Estate'],
    subscription_tier: 'premium' as const,
    is_active: true,
    is_claimed: true,
  },
  {
    first_name: 'Patricia',
    last_name: 'Taylor',
    slug: 'patricia-taylor',
    email: 'ptaylor@advocacytx.com',
    phone: '512-555-1010',
    bio: 'Agriculture and environmental policy expert. Represents farming, ranching, and agribusiness interests on water rights, land use, and environmental compliance.',
    cities: ['austin', 'houston'],
    subject_areas: ['Agriculture', 'Environmental'],
    subscription_tier: 'free' as const,
    is_active: true,
    is_claimed: true,
  },
];

async function seedSampleLobbyists() {
  console.log('🌱 Seeding sample lobbyists...\n');

  try {
    // Check if lobbyists already exist
    const { count } = await supabase
      .from('lobbyists')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      console.log(`ℹ️  Database already has ${count} lobbyists. Skipping seed.`);
      console.log('   (Delete existing lobbyists if you want to re-seed)');
      return;
    }

    // Insert sample lobbyists
    const { data, error } = await supabase
      .from('lobbyists')
      .insert(sampleLobbyists)
      .select();

    if (error) {
      console.error('❌ Error inserting lobbyists:', error);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted ${data.length} sample lobbyists:`);
    data.forEach((lobbyist, index) => {
      console.log(`   ${index + 1}. ${lobbyist.first_name} ${lobbyist.last_name} (${lobbyist.subscription_tier})`);
    });

    console.log('\n🎉 Seeding complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedSampleLobbyists();
