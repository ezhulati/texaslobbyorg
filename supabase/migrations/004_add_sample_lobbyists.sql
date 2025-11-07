-- Insert sample lobbyist data for testing
INSERT INTO public.lobbyists (first_name, last_name, slug, email, phone, bio, cities, subject_areas, subscription_tier, is_active, is_claimed) VALUES
(
  'Michael',
  'Smith',
  'michael-smith',
  'msmith@texaslobby.com',
  '512-555-0101',
  'Experienced healthcare policy advocate with 15+ years representing major hospital systems and insurance providers. Deep expertise in Texas legislative process and strong relationships with key committee members.',
  ARRAY['austin', 'dallas'],
  ARRAY['Healthcare'],
  'featured',
  true,
  true
),
(
  'Sarah',
  'Johnson',
  'sarah-johnson',
  'sjohnson@advocacy.com',
  '713-555-0202',
  'Energy sector specialist focusing on renewable energy policy and grid modernization. Former ERCOT analyst with technical expertise in power systems and environmental regulations.',
  ARRAY['houston'],
  ARRAY['Energy', 'Environmental'],
  'premium',
  true,
  true
),
(
  'Robert',
  'Williams',
  'robert-williams',
  'rwilliams@txaffairs.com',
  '214-555-0303',
  'Real estate and transportation infrastructure expert. Represents major developers and transit authorities on zoning, land use, and infrastructure funding issues.',
  ARRAY['dallas', 'fort-worth'],
  ARRAY['Real Estate', 'Transportation'],
  'premium',
  true,
  true
),
(
  'Jennifer',
  'Brown',
  'jennifer-brown',
  'jbrown@capitolgroup.com',
  '512-555-0404',
  'Education and technology policy specialist. Works with K-12 districts, universities, and ed-tech companies on funding, accountability, and innovation initiatives.',
  ARRAY['austin'],
  ARRAY['Education', 'Technology'],
  'featured',
  true,
  true
),
(
  'David',
  'Jones',
  'david-jones',
  'djones@txreps.com',
  '210-555-0505',
  'Healthcare and labor law advocate representing medical professionals and healthcare workers. Extensive experience with workforce issues and professional licensing.',
  ARRAY['san-antonio'],
  ARRAY['Healthcare', 'Labor & Employment'],
  'free',
  true,
  true
),
(
  'Maria',
  'Garcia',
  'maria-garcia',
  'mgarcia@lobbypartners.com',
  '713-555-0606',
  'Energy and municipal government specialist based in Houston. Advises cities and counties on energy policy, infrastructure projects, and intergovernmental relations.',
  ARRAY['houston', 'corpus-christi'],
  ARRAY['Energy', 'Municipal/County'],
  'premium',
  true,
  true
),
(
  'James',
  'Martinez',
  'james-martinez',
  'jmartinez@texaspolicy.com',
  '512-555-0707',
  'Financial services and technology regulation expert. Former banking regulator with deep knowledge of fintech, cybersecurity, and data privacy policy.',
  ARRAY['austin'],
  ARRAY['Financial Services', 'Technology'],
  'featured',
  true,
  true
),
(
  'Lisa',
  'Rodriguez',
  'lisa-rodriguez',
  'lrodriguez@statehouse.com',
  '214-555-0808',
  'Criminal justice reform and education advocate. Works with nonprofits, school districts, and law enforcement on policy modernization and community safety initiatives.',
  ARRAY['dallas'],
  ARRAY['Criminal Justice', 'Education'],
  'free',
  true,
  true
),
(
  'Thomas',
  'Anderson',
  'thomas-anderson',
  'tanderson@txstrat.com',
  '817-555-0909',
  'Transportation and real estate development specialist serving DFW metroplex. Expertise in highway funding, public transit, and commercial development regulations.',
  ARRAY['fort-worth'],
  ARRAY['Transportation', 'Real Estate'],
  'premium',
  true,
  true
),
(
  'Patricia',
  'Taylor',
  'patricia-taylor',
  'ptaylor@advocacytx.com',
  '512-555-1010',
  'Agriculture and environmental policy expert. Represents farming, ranching, and agribusiness interests on water rights, land use, and environmental compliance.',
  ARRAY['austin', 'houston'],
  ARRAY['Agriculture', 'Environmental'],
  'free',
  true,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Add some sample clients for lobbyists
INSERT INTO public.clients (lobbyist_id, name, description, year_started, is_current) VALUES
(
  (SELECT id FROM public.lobbyists WHERE slug = 'michael-smith'),
  'Texas Hospital Association',
  'Statewide advocacy on healthcare funding and regulations',
  2018,
  true
),
(
  (SELECT id FROM public.lobbyists WHERE slug = 'michael-smith'),
  'Blue Cross Blue Shield of Texas',
  'Insurance regulatory and market reform issues',
  2020,
  true
),
(
  (SELECT id FROM public.lobbyists WHERE slug = 'sarah-johnson'),
  'Texas Renewable Energy Coalition',
  'Wind and solar development policy',
  2019,
  true
),
(
  (SELECT id FROM public.lobbyists WHERE slug = 'jennifer-brown'),
  'Austin Independent School District',
  'K-12 funding and accountability policy',
  2017,
  true
),
(
  (SELECT id FROM public.lobbyists WHERE slug = 'james-martinez'),
  'Texas Bankers Association',
  'Financial services regulation and fintech policy',
  2021,
  true
);
