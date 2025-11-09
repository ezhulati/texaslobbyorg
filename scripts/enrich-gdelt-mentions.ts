/**
 * GDELT News Mentions Enrichment Script
 *
 * This script enriches lobbyist profiles with media mention data from
 * the GDELT 2.0 Doc API, tracking news coverage and media presence.
 *
 * Data Source:
 * - GDELT DOC 2.0 API: https://api.gdeltproject.org/api/v2/doc/doc
 *
 * Purpose:
 * - Track media mentions for each lobbyist
 * - Calculate media presence scores (total mentions, recent mentions)
 * - Store article links and snippets for profile pages
 * - Identify trending lobbyists based on recent coverage
 *
 * Usage:
 * 1. Ensure .env file has Supabase credentials
 * 2. Run database migration first to add media_mentions table
 * 3. Run: npx tsx scripts/enrich-gdelt-mentions.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const GDELT_API_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';
const BATCH_SIZE = 50;
const REQUEST_DELAY_MS = 1000; // 1 second between requests (be respectful)
const TIMESPAN = '6months'; // Look back 6 months
const MAX_RECORDS = 250; // GDELT max for article list mode
const MAX_LOBBYISTS_TO_PROCESS = 500; // Limit for initial run (can be increased)

interface GDELTArticle {
  url: string;
  urlmobile?: string;
  title: string;
  seendate: string; // Format: YYYYMMDDHHMMSS
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GDELTResponse {
  articles?: GDELTArticle[];
}

interface MediaMention {
  lobbyist_id: string;
  article_url: string;
  article_title: string;
  published_date: string;
  source_domain: string;
  source_country: string;
  social_image_url?: string;
}

// Initialize Supabase client with service role key
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse GDELT date format (YYYYMMDDHHMMSS) to ISO string
 */
function parseGDELTDate(dateStr: string): string {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  const hour = dateStr.substring(8, 10) || '00';
  const minute = dateStr.substring(10, 12) || '00';
  const second = dateStr.substring(12, 14) || '00';

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
}

/**
 * Query GDELT for mentions of a specific person
 */
async function searchGDELT(firstName: string, lastName: string): Promise<GDELTArticle[]> {
  try {
    const fullName = `${firstName} ${lastName}`;
    const query = encodeURIComponent(`"${fullName}"`);

    const url = `${GDELT_API_BASE}?query=${query}&mode=artlist&format=json&timespan=${TIMESPAN}&maxrecords=${MAX_RECORDS}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`GDELT API error for "${fullName}": ${response.status}`);
      return [];
    }

    const data: GDELTResponse = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error(`Error querying GDELT for "${firstName} ${lastName}":`, error);
    return [];
  }
}

/**
 * Filter articles to Texas-related sources
 */
function filterTexasRelevant(articles: GDELTArticle[]): GDELTArticle[] {
  const texasDomains = [
    'texastribune.org',
    'statesman.com',
    'dallasnews.com',
    'chron.com',
    'houstonchronicle.com',
    'mysanantonio.com',
    'expressnews.com',
    'star-telegram.com',
    'caller.com',
    'elpasotimes.com',
    'lubbockonline.com',
    'tylerpaper.com',
    'wacotrib.com',
    'beaumontenterprise.com',
    'themonitor.com',
    'texasmonthly.com',
    'texasobserver.org',
    'capitol.texas.gov',
    'texas.gov',
  ];

  return articles.filter(article => {
    // Keep if from Texas domain
    if (texasDomains.some(domain => article.domain.includes(domain))) {
      return true;
    }
    // Keep if article is from US and mentions Texas in title
    if (article.sourcecountry === 'US' && article.title.toLowerCase().includes('texas')) {
      return true;
    }
    return false;
  });
}

/**
 * Get lobbyists to process
 */
async function getLobbyistsToProcess(): Promise<Array<{ id: string; first_name: string; last_name: string }>> {
  console.log('Fetching lobbyists to process...');

  const { data: lobbyists, error } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name')
    .eq('is_active', true)
    .order('view_count', { ascending: false }) // Process most-viewed first
    .limit(MAX_LOBBYISTS_TO_PROCESS);

  if (error) {
    console.error('Error fetching lobbyists:', error);
    return [];
  }

  console.log(`Found ${lobbyists?.length || 0} lobbyists to process\n`);
  return lobbyists || [];
}

/**
 * Process lobbyists and search for media mentions
 */
async function processLobbyists(
  lobbyists: Array<{ id: string; first_name: string; last_name: string }>
): Promise<MediaMention[]> {
  console.log('Searching for media mentions...');
  const allMentions: MediaMention[] = [];

  let withMentionsCount = 0;
  let noMentionsCount = 0;

  for (let i = 0; i < lobbyists.length; i++) {
    const lobbyist = lobbyists[i]!;
    console.log(`Processing ${i + 1}/${lobbyists.length}: ${lobbyist.first_name} ${lobbyist.last_name}`);

    // Search GDELT
    const articles = await searchGDELT(lobbyist.first_name, lobbyist.last_name);

    // Filter to Texas-relevant articles
    const texasArticles = filterTexasRelevant(articles);

    if (texasArticles.length > 0) {
      withMentionsCount++;
      console.log(`  Found ${texasArticles.length} Texas-relevant mentions`);

      // Convert to media mentions
      for (const article of texasArticles) {
        allMentions.push({
          lobbyist_id: lobbyist.id,
          article_url: article.url,
          article_title: article.title,
          published_date: parseGDELTDate(article.seendate),
          source_domain: article.domain,
          source_country: article.sourcecountry,
          social_image_url: article.socialimage,
        });
      }
    } else {
      noMentionsCount++;
    }

    // Rate limiting
    await delay(REQUEST_DELAY_MS);
  }

  console.log(`\nSearch results:`);
  console.log(`  Lobbyists with mentions: ${withMentionsCount}`);
  console.log(`  Lobbyists without mentions: ${noMentionsCount}`);
  console.log(`  Total mentions found: ${allMentions.length}\n`);

  return allMentions;
}

/**
 * Store media mentions in database
 */
async function storeMediaMentions(mentions: MediaMention[]): Promise<void> {
  console.log('Storing media mentions...');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < mentions.length; i += BATCH_SIZE) {
    const batch = mentions.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('media_mentions')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      console.log(`Stored batch ${i / BATCH_SIZE + 1}: ${data.length} mentions`);
    }

    await delay(500);
  }

  console.log(`\nStored ${successCount} mentions, ${errorCount} errors\n`);
}

/**
 * Update lobbyist media summary fields
 */
async function updateLobbyistMediaSummaries(): Promise<void> {
  console.log('Updating lobbyist media summary fields...');

  // Get all lobbyists with media mentions
  const { data: lobbyists, error } = await supabase
    .from('lobbyists')
    .select('id');

  if (error || !lobbyists) {
    console.error('Error fetching lobbyists:', error);
    return;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const lobbyist of lobbyists) {
    // Get all mentions for this lobbyist
    const { data: mentions, error: mentionsError } = await supabase
      .from('media_mentions')
      .select('published_date')
      .eq('lobbyist_id', lobbyist.id)
      .order('published_date', { ascending: false });

    if (mentionsError) continue;

    const totalMentions = mentions.length;
    const recentMentions = mentions.filter(
      m => new Date(m.published_date) >= thirtyDaysAgo
    ).length;
    const lastMentionDate = mentions.length > 0 ? mentions[0]!.published_date : null;

    // Update lobbyist record
    await supabase
      .from('lobbyists')
      .update({
        media_mentions_count: totalMentions,
        media_mentions_last_30d: recentMentions,
        last_media_mention_date: lastMentionDate,
      })
      .eq('id', lobbyist.id);
  }

  console.log('Lobbyist media summaries updated\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('=== GDELT Media Mentions Enrichment Script ===\n');
  console.log(`Searching last ${TIMESPAN} of news coverage\n`);

  try {
    // Get lobbyists to process
    const lobbyists = await getLobbyistsToProcess();

    if (lobbyists.length === 0) {
      console.log('No lobbyists found to process');
      return;
    }

    // Search for media mentions
    const mentions = await processLobbyists(lobbyists);
    console.log(`Total media mentions to store: ${mentions.length}\n`);

    // Store in database
    if (mentions.length > 0) {
      await storeMediaMentions(mentions);
      await updateLobbyistMediaSummaries();
    }

    console.log('\n=== Enrichment Complete ===');
    console.log(`Lobbyists processed: ${lobbyists.length}`);
    console.log(`Media mentions stored: ${mentions.length}`);
  } catch (error) {
    console.error('Enrichment failed:', error);
    process.exit(1);
  }
}

main();
