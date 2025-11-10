import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anthropicKey = process.env.ANTHROPIC_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const anthropic = new Anthropic({ apiKey: anthropicKey });

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

interface BillSEO {
  title_tag: string;
  meta_description: string;
  intro_hook: string;
  excerpt: string;
}

async function generateBillSEO(bill: Bill): Promise<BillSEO> {
  const prompt = `You are an SEO expert writing metadata for Texas legislation. Generate SEO content for the following bill:

Bill Number: ${bill.bill_number}
Session: ${bill.session}
Title: ${bill.title}
Description: ${bill.description || 'N/A'}
Summary: ${bill.summary || 'N/A'}
Authors: ${bill.authors?.join(', ') || 'N/A'}
Subject Areas: ${bill.subject_areas?.join(', ') || 'N/A'}
Status: ${bill.status || 'N/A'}
Chamber: ${bill.chamber === 'house' ? 'House' : 'Senate'}

Generate the following in JSON format:

{
  "title_tag": "55-60 character title with main keyword, e.g., 'HB 123: [Topic] | Texas Legislature 2025'",
  "meta_description": "155-160 character persuasive summary with secondary keywords and call to action",
  "intro_hook": "Strong, engaging first sentence that immediately communicates why readers should care",
  "excerpt": "25-35 word concise plain-sentence summary suitable for previews and social shares"
}

Rules:
- Title tag: Must be 55-60 chars, include bill number and main topic
- Meta description: Must be 155-160 chars, persuasive with CTA
- Intro hook: One compelling sentence that engages emotionally/intellectually
- Excerpt: 25-35 words, suitable for social sharing

Return ONLY the JSON object, no other text.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const seoData = JSON.parse(jsonMatch[0]);

    // Validate lengths
    if (seoData.title_tag.length < 55 || seoData.title_tag.length > 60) {
      console.warn(`Title tag length ${seoData.title_tag.length} for ${bill.bill_number}`);
    }
    if (seoData.meta_description.length < 155 || seoData.meta_description.length > 160) {
      console.warn(`Meta description length ${seoData.meta_description.length} for ${bill.bill_number}`);
    }

    return seoData;
  } catch (error) {
    console.error(`Error generating SEO for ${bill.bill_number}:`, error);

    // Fallback to basic SEO
    return {
      title_tag: `${bill.bill_number}: ${bill.title.substring(0, 40)} | TX ${bill.session}`,
      meta_description: `${bill.title}. Track ${bill.bill_number} in the Texas ${bill.chamber === 'house' ? 'House' : 'Senate'}. View status, authors, and full text on TexasLobby.org.`,
      intro_hook: `${bill.bill_number} proposes significant changes to Texas law regarding ${bill.subject_areas?.[0] || 'state policy'}.`,
      excerpt: `${bill.bill_number} ${bill.title.substring(0, 100)}`,
    };
  }
}

async function processBillsInBatches() {
  console.log('🔍 Fetching bills without SEO metadata...\n');

  // First, check if columns exist
  const { data: sampleBill } = await supabase
    .from('bills')
    .select('*')
    .limit(1)
    .single();

  console.log('Sample bill columns:', Object.keys(sampleBill || {}));

  // Get total count of bills without SEO
  const { count: totalBills } = await supabase
    .from('bills')
    .select('id', { count: 'exact', head: true })
    .is('title_tag', null);

  console.log(`📊 Found ${totalBills} bills needing SEO metadata\n`);

  if (!totalBills) {
    console.log('✅ All bills already have SEO metadata!');
    return;
  }

  const batchSize = 10;
  let processed = 0;
  let errors = 0;

  while (processed < totalBills!) {
    console.log(`\n📦 Processing batch ${Math.floor(processed / batchSize) + 1}...`);

    // Fetch batch of bills without SEO
    const { data: bills, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .is('title_tag', null)
      .limit(batchSize);

    if (fetchError || !bills || bills.length === 0) {
      console.error('Error fetching bills:', fetchError);
      break;
    }

    console.log(`   Found ${bills.length} bills in this batch`);

    // Process each bill
    for (const bill of bills) {
      try {
        console.log(`   → ${bill.bill_number}: Generating SEO...`);

        const seoData = await generateBillSEO(bill as Bill);

        // Update bill with SEO data
        const { error: updateError } = await supabase
          .from('bills')
          .update({
            title_tag: seoData.title_tag,
            meta_description: seoData.meta_description,
            intro_hook: seoData.intro_hook,
            excerpt: seoData.excerpt,
          })
          .eq('id', bill.id);

        if (updateError) {
          console.error(`     ✗ Error updating ${bill.bill_number}:`, updateError.message);
          errors++;
        } else {
          console.log(`     ✓ Updated ${bill.bill_number}`);
          processed++;
        }

        // Rate limit: wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`     ✗ Error processing ${bill.bill_number}:`, error.message);
        errors++;
      }
    }

    console.log(`   Batch complete: ${processed}/${totalBills} bills processed, ${errors} errors`);
  }

  console.log(`\n✅ Complete! Processed ${processed} bills with ${errors} errors`);
}

// Run the script
processBillsInBatches().catch(console.error);
