import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Bill {
  id: string;
  bill_number: string;
  session: string;
  title: string;
  description: string | null;
  summary: string | null;
  authors: string[] | null;
  subject_areas: string[] | null;
  status: string | null;
  chamber: string;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function generateTitleTag(bill: Bill): string {
  // Safety checks
  if (!bill.title || !bill.bill_number || !bill.session) {
    return `${bill.bill_number || 'Bill'} | Texas Legislature`.padEnd(55);
  }

  // Format: "HB 123: Topic | Texas Legislature 2025"
  const billNum = bill.bill_number;
  const session = bill.session.split('-')[0]; // e.g., "89th-R" => "89th"

  // Get main topic from title (first significant phrase)
  let topic = bill.title.split(/relating to|concerning/i)[0].trim();
  if (topic.length > 30) {
    topic = topic.substring(0, 27) + '...';
  }

  const titleTag = `${billNum}: ${topic} | TX ${session}`;

  // Ensure 55-60 characters
  if (titleTag.length > 60) {
    const shortened = `${billNum}: ${topic.substring(0, 20)}... | TX ${session}`;
    return truncate(shortened, 60);
  }
  if (titleTag.length < 55) {
    return titleTag.padEnd(55, ' ').trim();
  }

  return titleTag;
}

function generateMetaDescription(bill: Bill): string {
  // Safety checks
  if (!bill.title || !bill.bill_number) {
    return `Track ${bill.bill_number || 'this bill'} in the Texas Legislature. View full text, status updates, and voting records on TexasLobby.org.`.padEnd(155);
  }

  const billNum = bill.bill_number;
  const chamber = bill.chamber === 'house' ? 'House' : 'Senate';
  const status = bill.status || 'In Progress';
  const subject = bill.subject_areas?.[0] || 'Texas Law';

  // Template variations for variety
  const templates = [
    `Track ${billNum} in the Texas ${chamber}. ${bill.title.substring(0, 80)}. View full text, status updates, authors, and voting records on TexasLobby.org.`,
    `${billNum}: ${bill.title.substring(0, 90)}. Follow this ${subject} bill through the Texas Legislature. Get alerts, read amendments, and contact your rep.`,
    `Monitor ${billNum}'s progress through the Texas ${chamber}. ${bill.title.substring(0, 85)}. See vote history, bill text, and fiscal analysis.`,
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];

  // Ensure 155-160 characters
  if (template.length > 160) {
    return truncate(template, 157);
  }
  if (template.length < 155) {
    return template + ' Stay informed with TexasLobby.org.'.substring(0, 160 - template.length);
  }

  return template;
}

function generateIntroHook(bill: Bill): string {
  // Safety checks
  if (!bill.bill_number) {
    return 'This legislation could have significant impacts on Texas law and policy.';
  }

  const billNum = bill.bill_number;
  const chamber = bill.chamber === 'house' ? 'House' : 'Senate';
  const subject = bill.subject_areas?.[0] || 'state policy';
  const author = bill.authors?.[0] || 'Texas legislators';

  // Engaging hook templates
  const hooks = [
    `${billNum} could reshape how Texas handles ${subject.toLowerCase()}, marking a significant shift in state policy.`,
    `Introduced by ${author}, ${billNum} proposes sweeping changes to Texas ${subject.toLowerCase()} law that could impact millions of Texans.`,
    `${billNum} represents one of the most closely watched pieces of legislation in the Texas ${chamber} this session.`,
    `If passed, ${billNum} would fundamentally alter ${subject.toLowerCase()} in Texas, with far-reaching implications for residents and businesses.`,
    `${billNum} has emerged as a key battleground issue in the Texas Legislature, drawing intense scrutiny from advocacy groups and lawmakers.`,
  ];

  return hooks[Math.floor(Math.random() * hooks.length)];
}

function generateExcerpt(bill: Bill): string {
  // Safety checks
  if (!bill.title || !bill.bill_number) {
    return `Track ${bill.bill_number || 'this bill'} in the Texas Legislature on TexasLobby.org.`;
  }

  const billNum = bill.bill_number;
  const chamber = bill.chamber === 'house' ? 'House' : 'Senate';

  // Get clean summary from title
  let summary = bill.title;

  // Remove common legislative prefixes
  summary = summary.replace(/^(relating to|concerning|to amend|proposing a constitutional amendment)/i, '');
  summary = summary.trim();

  // Build excerpt
  const excerpt = `${billNum} in the Texas ${chamber}: ${summary}`;

  // Truncate to 25-35 words
  const words = excerpt.split(/\s+/);
  if (words.length > 35) {
    return words.slice(0, 33).join(' ') + '...';
  }
  if (words.length < 25) {
    return excerpt + ' Track this legislation on TexasLobby.org.';
  }

  return excerpt;
}

async function processBillsInBatches() {
  console.log('🔍 Fetching bills without SEO metadata...\n');

  // Get total count of bills without SEO that have titles
  const { count: totalBills } = await supabase
    .from('bills')
    .select('id', { count: 'exact', head: true })
    .is('title_tag', null)
    .not('title', 'is', null);

  console.log(`📊 Found ${totalBills} bills needing SEO metadata\n`);

  if (!totalBills || totalBills === 0) {
    console.log('✅ All bills already have SEO metadata!');
    return;
  }

  const batchSize = 100; // Process 100 at a time since we're not using an API
  let processed = 0;
  let errors = 0;

  while (processed < totalBills) {
    console.log(`\n📦 Processing batch ${Math.floor(processed / batchSize) + 1}...`);

    // Fetch batch of bills without SEO that have titles
    const { data: bills, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .is('title_tag', null)
      .not('title', 'is', null)
      .limit(batchSize);

    if (fetchError || !bills || bills.length === 0) {
      console.error('Error fetching bills:', fetchError);
      break;
    }

    console.log(`   Found ${bills.length} bills in this batch`);

    // Process each bill
    const updates = bills.map((bill: any) => {
      try {
        return {
          id: bill.id,
          title_tag: generateTitleTag(bill as Bill),
          meta_description: generateMetaDescription(bill as Bill),
          intro_hook: generateIntroHook(bill as Bill),
          excerpt: generateExcerpt(bill as Bill),
        };
      } catch (error: any) {
        console.error(`     ✗ Error processing ${bill.bill_number}:`, error.message);
        errors++;
        return null;
      }
    }).filter(Boolean);

    // Batch update
    for (const update of updates) {
      if (!update) continue;

      const { error: updateError } = await supabase
        .from('bills')
        .update({
          title_tag: update.title_tag,
          meta_description: update.meta_description,
          intro_hook: update.intro_hook,
          excerpt: update.excerpt,
        })
        .eq('id', update.id);

      if (updateError) {
        console.error(`     ✗ Error updating bill:`, updateError.message);
        errors++;
      } else {
        processed++;
      }
    }

    console.log(`   Batch complete: ${processed}/${totalBills} bills processed, ${errors} errors`);
    console.log(`   Sample: ${updates[0]?.title_tag}`);
  }

  console.log(`\n✅ Complete! Processed ${processed} bills with ${errors} errors`);
}

// Run the script
processBillsInBatches().catch(console.error);
