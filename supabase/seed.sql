-- Seed major Texas cities
INSERT INTO public.cities (name, slug, county, population, meta_title, meta_description) VALUES
  ('Houston', 'houston', 'Harris', 2304580, 'Houston Lobbyists | Find Political Representation in Houston, TX', 'Search and hire experienced Houston lobbyists. Browse profiles, client lists, and expertise areas to find the right political advocate for your business.'),
  ('Dallas', 'dallas', 'Dallas', 1304379, 'Dallas Lobbyists | Find Political Representation in Dallas, TX', 'Connect with top Dallas lobbyists. View transparent profiles with track records, client testimonials, and areas of expertise.'),
  ('Austin', 'austin', 'Travis', 961855, 'Austin Lobbyists | Find Political Representation in Austin, TX', 'Find Austin lobbyists specializing in Texas state government. Browse experienced advocates near the Capitol.'),
  ('San Antonio', 'san-antonio', 'Bexar', 1434625, 'San Antonio Lobbyists | Find Political Representation in San Antonio, TX', 'Hire San Antonio lobbyists with proven track records. Search by industry, expertise, and client reviews.'),
  ('Fort Worth', 'fort-worth', 'Tarrant', 918915, 'Fort Worth Lobbyists | Find Political Representation in Fort Worth, TX', 'Discover Fort Worth lobbyists ready to represent your business interests in Texas politics.'),
  ('El Paso', 'el-paso', 'El Paso', 678815, 'El Paso Lobbyists | Find Political Representation in El Paso, TX', 'Search El Paso lobbyists with expertise in border policy, healthcare, and local business issues.'),
  ('Arlington', 'arlington', 'Tarrant', 394266, 'Arlington Lobbyists | Find Political Representation in Arlington, TX', 'Find Arlington lobbyists specializing in DFW regional issues and Texas state legislation.'),
  ('Corpus Christi', 'corpus-christi', 'Nueces', 317863, 'Corpus Christi Lobbyists | Find Political Representation in Corpus Christi, TX', 'Connect with Corpus Christi lobbyists focused on coastal development, energy, and port regulations.'),
  ('Plano', 'plano', 'Collin', 285494, 'Plano Lobbyists | Find Political Representation in Plano, TX', 'Search Plano lobbyists with expertise in technology, healthcare, and business regulations.'),
  ('Lubbock', 'lubbock', 'Lubbock', 258862, 'Lubbock Lobbyists | Find Political Representation in Lubbock, TX', 'Find Lubbock lobbyists specializing in agriculture, education, and West Texas issues.');

-- Seed subject areas
INSERT INTO public.subject_areas (name, slug, description, icon, meta_title, meta_description) VALUES
  (
    'Healthcare',
    'healthcare',
    'Lobbyists specializing in healthcare policy, insurance regulation, hospital administration, and medical practice legislation.',
    'heart-pulse',
    'Healthcare Lobbyists in Texas | Medical & Insurance Specialists',
    'Find Texas healthcare lobbyists with expertise in medical policy, insurance regulation, hospital administration, and healthcare legislation.'
  ),
  (
    'Energy',
    'energy',
    'Experts in oil & gas, renewable energy, utilities regulation, and Texas energy grid policy.',
    'zap',
    'Energy Lobbyists in Texas | Oil, Gas & Renewable Energy Experts',
    'Connect with Texas energy lobbyists specializing in oil & gas, wind/solar, utilities regulation, and power grid policy.'
  ),
  (
    'Education',
    'education',
    'Lobbyists focused on K-12 education, higher education funding, school choice, and education policy.',
    'graduation-cap',
    'Education Lobbyists in Texas | K-12 & Higher Ed Specialists',
    'Search Texas education lobbyists with expertise in K-12 policy, university funding, school choice, and education reform.'
  ),
  (
    'Real Estate',
    'real-estate',
    'Specialists in property development, zoning regulations, real estate licensing, and land use policy.',
    'building-2',
    'Real Estate Lobbyists in Texas | Development & Zoning Experts',
    'Find Texas real estate lobbyists specializing in development, zoning, property rights, and land use regulations.'
  ),
  (
    'Transportation',
    'transportation',
    'Experts in highway funding, public transit, automotive regulations, and transportation infrastructure.',
    'truck',
    'Transportation Lobbyists in Texas | Infrastructure & Transit Experts',
    'Connect with Texas transportation lobbyists focused on highways, public transit, TxDOT, and infrastructure funding.'
  ),
  (
    'Technology',
    'technology',
    'Lobbyists specializing in tech policy, data privacy, telecommunications, and innovation regulations.',
    'cpu',
    'Technology Lobbyists in Texas | Tech Policy & Privacy Experts',
    'Search Texas technology lobbyists with expertise in data privacy, telecom, cybersecurity, and tech regulations.'
  ),
  (
    'Financial Services',
    'financial-services',
    'Experts in banking regulations, insurance, securities, fintech, and financial industry policy.',
    'banknote',
    'Financial Services Lobbyists in Texas | Banking & Insurance Experts',
    'Find Texas financial lobbyists specializing in banking, insurance, securities, and fintech regulations.'
  ),
  (
    'Agriculture',
    'agriculture',
    'Lobbyists focused on farming, ranching, water rights, commodity regulations, and rural policy.',
    'tractor',
    'Agriculture Lobbyists in Texas | Farming & Ranching Experts',
    'Connect with Texas agriculture lobbyists specializing in farming, ranching, water rights, and ag policy.'
  ),
  (
    'Environmental',
    'environmental',
    'Specialists in environmental regulations, conservation, air/water quality, and sustainability policy.',
    'leaf',
    'Environmental Lobbyists in Texas | Conservation & Sustainability Experts',
    'Search Texas environmental lobbyists with expertise in regulations, conservation, air quality, and green policy.'
  ),
  (
    'Labor & Employment',
    'labor-employment',
    'Experts in labor laws, workers compensation, employment regulations, and workforce policy.',
    'briefcase',
    'Labor Lobbyists in Texas | Employment Law & Workforce Experts',
    'Find Texas labor lobbyists specializing in employment law, workers comp, labor relations, and workforce policy.'
  ),
  (
    'Criminal Justice',
    'criminal-justice',
    'Lobbyists focused on criminal law reform, law enforcement policy, corrections, and judicial system.',
    'scale',
    'Criminal Justice Lobbyists in Texas | Legal Reform Experts',
    'Connect with Texas criminal justice lobbyists focused on legal reform, law enforcement, and court policy.'
  ),
  (
    'Municipal/County',
    'municipal-county',
    'Specialists in local government, city ordinances, county regulations, and municipal policy.',
    'landmark',
    'Municipal Lobbyists in Texas | Local Government Experts',
    'Search Texas municipal lobbyists with expertise in city/county government, local ordinances, and regional policy.'
  );
