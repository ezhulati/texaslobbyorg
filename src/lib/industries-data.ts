export interface Industry {
  name: string;
  slug: string;
  description: string;
  overview: string;
  spendingStats: {
    annualSpending: string;
    topSpenders: string[];
    numberOfLobbyists: string;
    activeOrganizations: string;
  };
  keyIssues: string[];
  metaTitle: string;
  metaDescription: string;
  relatedSubjects: string[];
  clientKeywords: string[]; // Keywords to match against client names
}

export const INDUSTRIES: Record<string, Industry> = {
  'energy-utilities': {
    name: 'Energy & Utilities',
    slug: 'energy-utilities',
    description: 'Texas leads the nation in energy production, making the energy and utilities sector one of the most influential industries in state politics. From oil and gas exploration to renewable energy development and electric grid management, this industry shapes critical infrastructure and environmental policy decisions.',
    overview: `The Texas energy and utilities sector represents the backbone of the state's economy and a critical component of national energy security. With vast oil and gas reserves, expanding renewable energy installations, and a deregulated electricity market, Texas presents unique opportunities and challenges for energy companies.

Lobbying efforts in this sector focus on regulatory frameworks governing electricity markets, pipeline safety standards, renewable energy incentives, oil and gas exploration permits, and environmental compliance requirements. The Electric Reliability Council of Texas (ERCOT) governance, grid reliability standards, and winterization requirements have become particularly important following recent extreme weather events.

Natural gas producers, electric utilities, renewable energy developers, and pipeline operators all maintain active lobbying presences in Austin. These organizations work to influence rate-setting procedures, transmission infrastructure development, carbon emissions regulations, and tax incentives for energy production. The transition toward renewable energy sources while maintaining grid reliability creates ongoing policy debates that require sophisticated advocacy.

Energy lobbyists must navigate complex relationships between state agencies including the Public Utility Commission, Railroad Commission, and Texas Commission on Environmental Quality. They advocate for policies affecting billions of dollars in infrastructure investments, rate structures impacting millions of consumers, and regulatory frameworks that balance economic development with environmental stewardship and energy independence.`,
    spendingStats: {
      annualSpending: '$85-120 million',
      topSpenders: [
        'Major electric utilities (TXU Energy, CenterPoint Energy)',
        'Oil and gas associations (Texas Oil & Gas Association)',
        'Pipeline operators (Energy Transfer, Kinder Morgan)',
        'Renewable energy developers (NextEra Energy, EDF Renewables)'
      ],
      numberOfLobbyists: '250+',
      activeOrganizations: '180+'
    },
    keyIssues: [
      'Electric grid reliability and winterization standards',
      'Renewable energy portfolio standards and incentives',
      'Oil and gas exploration permits and drilling regulations',
      'Carbon emissions regulations and climate policy',
      'Rate-setting procedures and utility cost recovery',
      'Pipeline safety and infrastructure development',
      'ERCOT governance and market design reforms',
      'Property tax treatment for renewable energy facilities',
      'Electric vehicle charging infrastructure policy',
      'Natural gas flaring regulations and methane emissions'
    ],
    metaTitle: 'Energy & Utilities Lobbying in Texas | Industry Experts',
    metaDescription: 'Connect with experienced energy and utilities lobbyists in Texas. Expert advocacy for oil & gas, renewables, electric utilities, and grid infrastructure policy.',
    relatedSubjects: ['Energy', 'Environment', 'Transportation', 'Economic Development'],
    clientKeywords: ['energy', 'utility', 'utilities', 'electric', 'electricity', 'power', 'oil', 'gas', 'petroleum', 'renewable', 'solar', 'wind', 'pipeline', 'ercot', 'transmission', 'grid', 'natural gas', 'propane', 'fuel', 'coal', 'nuclear', 'hydroelectric']
  },
  'healthcare-insurance': {
    name: 'Healthcare & Insurance',
    slug: 'healthcare-insurance',
    description: 'Healthcare and insurance represent critical sectors in Texas, affecting millions of residents and generating intense legislative activity. From Medicaid policy to insurance regulations and hospital operations, this industry navigates complex policy landscapes impacting patient care, coverage access, and healthcare costs.',
    overview: `Texas healthcare and insurance industries operate in one of the nation's most unique policy environments. With the highest uninsured rate in the country, no state-based health insurance exchange, and frequent debates over Medicaid expansion, healthcare policy remains contentious and consequential. The industry encompasses hospitals, physician groups, insurance carriers, pharmaceutical manufacturers, and medical device companies.

Lobbying efforts focus on Medicaid reimbursement rates, certificate of need regulations, scope of practice laws for healthcare providers, insurance market regulations, and prescription drug pricing policies. The ongoing debate over Medicaid expansion, surprise medical billing protections, and telehealth regulations creates constant engagement opportunities for industry advocates.

Insurance companies work to influence rate approval processes, network adequacy standards, and benefit mandate requirements. Healthcare providers advocate for liability protections, reimbursement policies, and regulatory flexibility. Pharmaceutical companies engage on drug pricing transparency, pharmacy benefit manager regulations, and importation policies. Medical device manufacturers focus on coverage policies and innovation incentives.

The COVID-19 pandemic intensified focus on public health infrastructure, emergency preparedness funding, healthcare workforce development, and telehealth expansion. These issues continue to shape legislative priorities alongside traditional concerns about healthcare costs, quality measurement, and access to care. Successful healthcare lobbyists maintain relationships across multiple committees and agencies while navigating highly technical policy debates with significant fiscal implications.`,
    spendingStats: {
      annualSpending: '$75-100 million',
      topSpenders: [
        'Hospital associations (Texas Hospital Association)',
        'Health insurance carriers (Blue Cross Blue Shield, UnitedHealthcare)',
        'Pharmaceutical manufacturers (PhRMA member companies)',
        'Physician groups (Texas Medical Association)'
      ],
      numberOfLobbyists: '220+',
      activeOrganizations: '160+'
    },
    keyIssues: [
      'Medicaid expansion and reimbursement rates',
      'Surprise medical billing protections',
      'Telehealth coverage and licensing requirements',
      'Prescription drug pricing and transparency',
      'Scope of practice laws for nurse practitioners and physician assistants',
      'Certificate of need regulations for healthcare facilities',
      'Mental health parity and behavioral health coverage',
      'Insurance network adequacy and rate regulation',
      'Medical liability and tort reform',
      'Healthcare workforce development and training programs'
    ],
    metaTitle: 'Healthcare & Insurance Lobbying in Texas | Industry Experts',
    metaDescription: 'Find experienced healthcare and insurance lobbyists in Texas. Specialized advocacy for hospitals, insurers, pharmaceutical companies, and medical providers.',
    relatedSubjects: ['Healthcare', 'Insurance', 'Public Health', 'Labor'],
    clientKeywords: ['health', 'healthcare', 'hospital', 'medical', 'insurance', 'medicaid', 'medicare', 'pharmaceutical', 'pharma', 'drug', 'pharmacy', 'physician', 'doctor', 'nurse', 'clinic', 'hmo', 'ppo', 'managed care', 'blue cross', 'united health', 'aetna', 'cigna', 'wellpoint', 'mental health', 'behavioral health']
  },
  'gaming-casinos': {
    name: 'Gaming & Casinos',
    slug: 'gaming-casinos',
    description: 'Gaming and casino interests represent one of Texas\' most persistent lobbying efforts despite the state\'s restrictive gambling laws. Casino developers, tribal gaming operations, racetracks, and online gaming companies actively advocate for expanded gaming opportunities in a state with significant untapped market potential.',
    overview: `Texas maintains some of the nation's most restrictive gaming laws, prohibiting most forms of casino gambling while allowing limited exceptions for tribal gaming, horse and dog racing, and the state lottery. This restrictive environment creates intense lobbying battles as gaming interests seek expanded opportunities in what would be one of the country's largest gaming markets.

Casino developers and racetrack operators advocate for constitutional amendments to permit Las Vegas-style casinos, arguing economic benefits including job creation, tourism revenue, and property tax relief. Native American tribes push for expanded tribal gaming rights, while existing racetrack operators seek authorization to add slot machines and table games to their facilities. Online gaming and sports betting companies lobby for legal frameworks to allow digital wagering platforms.

Opposition from religious and family advocacy groups, along with concerns about gambling addiction and social costs, creates significant political obstacles. Gaming advocates must navigate constitutional restrictions requiring voter approval for gambling expansion, regional competition for casino locations, and complex tribal sovereignty issues. The potential for billions in gaming revenue generates ongoing legislative interest despite consistent political resistance.

Recent legislative sessions have seen increased activity around sports betting legalization, with proposals to regulate online and in-person wagering at professional sporting venues. This represents the industry's most viable path toward expanded gaming, leveraging the popularity of sports betting in neighboring states. Gaming lobbyists work to build coalitions with professional sports franchises, entertainment districts, and economic development advocates while addressing regulatory concerns about consumer protection, responsible gaming, and revenue allocation.`,
    spendingStats: {
      annualSpending: '$15-25 million',
      topSpenders: [
        'Las Vegas Sands Corporation',
        'Native American tribal gaming operations',
        'Texas horse and greyhound racetracks',
        'Online gaming and sports betting platforms'
      ],
      numberOfLobbyists: '75+',
      activeOrganizations: '45+'
    },
    keyIssues: [
      'Constitutional amendments to allow casino gaming',
      'Sports betting legalization and regulation',
      'Online gaming and digital wagering platforms',
      'Tribal gaming compacts and sovereignty rights',
      'Racetrack historical horse racing machines',
      'Gaming tax rates and revenue allocation',
      'Responsible gaming and addiction prevention programs',
      'Geographic distribution of gaming licenses',
      'Competition with bordering state casinos',
      'Economic impact analysis and job creation claims'
    ],
    metaTitle: 'Gaming & Casinos Lobbying in Texas | Industry Experts',
    metaDescription: 'Connect with gaming and casino lobbyists in Texas. Expert advocacy for casino development, sports betting, tribal gaming, and gambling expansion.',
    relatedSubjects: ['Gaming & Lotteries', 'Tourism', 'Economic Development', 'Constitutional Amendments'],
    clientKeywords: ['gaming', 'casino', 'gambling', 'lottery', 'lotteries', 'racetrack', 'racing', 'horse racing', 'greyhound', 'sports betting', 'poker', 'slot', 'tribal', 'indian gaming', 'sands', 'mgm', 'caesars', 'wynn', 'draftkings', 'fanduel', 'betmgm', 'las vegas']
  },
  'technology-telecom': {
    name: 'Technology & Telecommunications',
    slug: 'technology-telecom',
    description: 'The technology and telecommunications sector drives innovation and connectivity across Texas, from broadband expansion to data privacy regulations and emerging technologies. This rapidly evolving industry navigates complex policy issues affecting digital infrastructure, cybersecurity, artificial intelligence, and consumer protection.',
    overview: `Texas has emerged as a major technology hub, attracting tech giants and startups alike to Austin, Dallas, Houston, and other metros. The technology and telecommunications sector encompasses broadband providers, social media platforms, software companies, semiconductor manufacturers, cybersecurity firms, and emerging technology developers. This diversity creates complex advocacy needs spanning infrastructure investment, regulatory frameworks, and innovation policy.

Broadband expansion remains a critical priority, with lobbying focused on rural connectivity funding, infrastructure deployment regulations, and universal service obligations. Telecommunications companies advocate for streamlined permitting processes, access to utility poles and rights-of-way, and competitive market structures. The transition to 5G networks, fiber optic expansion, and satellite internet services generates ongoing regulatory engagement.

Technology companies increasingly engage on data privacy legislation, cybersecurity standards, artificial intelligence regulation, and content moderation policies. Social media platforms navigate concerns about child safety, misinformation, and platform liability. E-commerce companies address sales tax collection, consumer protection requirements, and marketplace regulations. Cryptocurrency and blockchain companies seek regulatory clarity for digital assets.

The sector's rapid evolution creates constant policy challenges. Emerging issues include artificial intelligence governance, autonomous vehicle regulations, drone operations, smart city infrastructure, and digital identity frameworks. Technology lobbyists must educate legislators on complex technical matters while addressing public concerns about privacy, security, and technological disruption. Successful advocates build bipartisan coalitions around economic development and innovation while navigating legitimate regulatory concerns about consumer protection and public safety.`,
    spendingStats: {
      annualSpending: '$45-65 million',
      topSpenders: [
        'Major telecommunications carriers (AT&T, Verizon, T-Mobile)',
        'Social media and tech platforms (Meta, Google, Amazon)',
        'Cable and broadband providers (Comcast, Charter, Spectrum)',
        'Semiconductor manufacturers (Texas Instruments, Samsung)'
      ],
      numberOfLobbyists: '180+',
      activeOrganizations: '140+'
    },
    keyIssues: [
      'Broadband expansion and rural connectivity funding',
      'Data privacy and consumer protection regulations',
      'Artificial intelligence governance and ethical frameworks',
      'Telecommunications infrastructure and 5G deployment',
      'Cybersecurity standards and breach notification requirements',
      'Social media content moderation and platform liability',
      'E-commerce sales tax and marketplace regulations',
      'Autonomous vehicle testing and deployment regulations',
      'Cryptocurrency and blockchain regulatory frameworks',
      'Municipal broadband restrictions and public-private partnerships'
    ],
    metaTitle: 'Technology & Telecommunications Lobbying in Texas | Industry Experts',
    metaDescription: 'Find expert technology and telecom lobbyists in Texas. Specialized advocacy for broadband, data privacy, AI, cybersecurity, and tech innovation policy.',
    relatedSubjects: ['Technology', 'Telecommunications', 'Privacy', 'Economic Development'],
    clientKeywords: ['technology', 'tech', 'telecom', 'telecommunications', 'broadband', 'internet', 'wireless', 'mobile', 'cellular', '5g', 'fiber', 'cable', 'at&t', 'verizon', 't-mobile', 'sprint', 'comcast', 'charter', 'spectrum', 'google', 'facebook', 'meta', 'amazon', 'microsoft', 'apple', 'software', 'cloud', 'data center', 'cybersecurity', 'artificial intelligence', 'ai', 'cryptocurrency', 'blockchain', 'semiconductor', 'chip']
  },
  'local-government': {
    name: 'Local Government',
    slug: 'local-government',
    description: 'Local government entities—cities, counties, school districts, and special districts—represent some of Texas\' most active lobbying participants. These governmental organizations advocate for state funding, regulatory flexibility, and home rule authority while navigating complex intergovernmental relationships and fiscal constraints.',
    overview: `Texas local governments maintain significant lobbying presences in Austin, advocating for the interests of municipalities, counties, school districts, water districts, hospital districts, and numerous special purpose districts. With 254 counties, over 1,200 municipalities, and more than 3,000 special districts, local government represents diverse regional interests and policy priorities across the state's vast geography.

Municipal lobbying focuses on home rule authority, property tax limitations, unfunded mandates, infrastructure funding, and police and fire pension obligations. The ongoing tension between state preemption and local control creates constant engagement on issues including short-term rental regulations, plastic bag bans, tree preservation ordinances, and labor standards. Cities advocate for increased state revenue sharing, transportation funding, and flexibility in local governance.

Counties navigate distinct challenges including border security costs, indigent healthcare obligations, road and bridge maintenance, and criminal justice expenses. School districts lobby for increased per-pupil funding, special education resources, school safety measures, and teacher compensation. Water districts address drought management, conservation requirements, and infrastructure financing. Hospital districts focus on Medicaid funding, uncompensated care, and regional healthcare coordination.

Local government lobbyists must balance competing interests between large urban centers, suburban communities, and rural areas. They navigate complex fiscal relationships with the state, advocating for funding while resisting mandates. The professional local government lobby includes associations representing cities (Texas Municipal League), counties (Texas Association of Counties), and school districts (Texas Association of School Boards), alongside hired lobbyists for individual jurisdictions. These advocates work to build coalitions across regions and party lines while addressing unique local needs and statewide policy implications.`,
    spendingStats: {
      annualSpending: '$30-45 million',
      topSpenders: [
        'Major cities (Houston, Dallas, Austin, San Antonio)',
        'Large counties (Harris, Dallas, Bexar, Tarrant)',
        'Urban school districts',
        'Municipal and county associations'
      ],
      numberOfLobbyists: '150+',
      activeOrganizations: '400+'
    },
    keyIssues: [
      'Property tax revenue caps and appraisal reform',
      'State preemption of local ordinances and home rule authority',
      'Transportation funding and infrastructure grants',
      'School finance and per-pupil funding formulas',
      'Unfunded state mandates on local governments',
      'Police and firefighter pension obligations',
      'Indigent healthcare and hospital district funding',
      'Border security costs for border counties',
      'Water infrastructure financing and conservation requirements',
      'Municipal annexation and extraterritorial jurisdiction'
    ],
    metaTitle: 'Local Government Lobbying in Texas | Municipal & County Experts',
    metaDescription: 'Connect with local government lobbyists in Texas. Expert advocacy for cities, counties, school districts, and special districts on funding and home rule issues.',
    relatedSubjects: ['Municipal Government', 'County Affairs', 'Education', 'Public Finance'],
    clientKeywords: ['city', 'cities', 'county', 'counties', 'municipal', 'municipality', 'school district', 'isd', 'independent school', 'water district', 'hospital district', 'special district', 'dallas', 'houston', 'austin', 'san antonio', 'fort worth', 'el paso', 'arlington', 'corpus christi', 'plano', 'irving', 'harris county', 'bexar county', 'tarrant county', 'travis county', 'collin county', 'denton county']
  }

};

export const INDUSTRY_SLUGS = Object.keys(INDUSTRIES);

export function getIndustryBySlug(slug: string): Industry | undefined {
  return INDUSTRIES[slug];
}

export function getAllIndustries(): Industry[] {
  return Object.values(INDUSTRIES);
}

export function getIndustriesForSubject(subjectName: string): Industry[] {
  const normalizedSubject = subjectName.toLowerCase().replace(/\s+and\s+/g, ' ');

  return Object.values(INDUSTRIES).filter((industry) =>
    industry.relatedSubjects.some((subject) => {
      const normalizedIndustrySubject = subject.toLowerCase().replace(/\s+and\s+/g, ' ');

      // Check for exact match
      if (normalizedIndustrySubject === normalizedSubject) return true;

      // Check if one contains the other
      if (normalizedIndustrySubject.includes(normalizedSubject)) return true;
      if (normalizedSubject.includes(normalizedIndustrySubject)) return true;

      // Check for word-level matches (e.g., "healthcare" matches "health")
      const subjectWords = normalizedSubject.split(/\s+/);
      const industryWords = normalizedIndustrySubject.split(/\s+/);

      return subjectWords.some(sw =>
        industryWords.some(iw =>
          sw.includes(iw) || iw.includes(sw)
        )
      );
    })
  );
}
