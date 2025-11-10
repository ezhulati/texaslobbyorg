#!/usr/bin/env tsx
/**
 * Bill Sync Script - Production Version for Real 89R Bills
 *
 * Syncs Texas legislative bills from the Texas Legislature FTP server.
 * Handles the actual FTP structure with grouped directories.
 *
 * Usage:
 *   npx tsx scripts/sync-bills-production.ts --session 89R --limit 100
 *   npx tsx scripts/sync-bills-production.ts --session 89R --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { Client as FTPClient } from 'basic-ftp';
import * as cheerio from 'cheerio';
import { Writable } from 'stream';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag: string): string | null => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
};
const hasFlag = (flag: string): boolean => args.includes(flag);

const session = getArg('--session') || '89R';
const sessionLower = session.toLowerCase();
const dryRun = hasFlag('--dry-run');
const verbose = hasFlag('--verbose');
const limitStr = getArg('--limit');
const limit = limitStr ? parseInt(limitStr, 10) : 100;

console.log('🏛️  Texas Legislative Bill Sync - Production');
console.log('=============================================\n');
console.log(`Session: ${session}`);
console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'PRODUCTION'}`);
console.log(`Limit: ${limit} bills`);
console.log(`Verbose: ${verbose ? 'Yes' : 'No'}`);
console.log('');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface BillData {
  bill_number: string;
  chamber: string;
  slug: string;
  title: string;
  summary: string | null;
  primary_author: string | null;
  current_status: string;
  full_text: string | null;
}

async function getSessionId(): Promise<string> {
  const { data, error } = await supabase
    .from('legislative_sessions')
    .select('id')
    .eq('session_code', session)
    .single();

  if (error || !data) {
    console.error(`❌ Session ${session} not found in database`);
    process.exit(1);
  }

  return data.id;
}

function parseBillHTML(html: string, billNumber: string): Partial<BillData> {
  const $ = cheerio.load(html);

  // Check if this is a placeholder/not available bill
  if (html.includes('NotAvailableDummy') || html.includes('Not Available')) {
    return {
      title: `${billNumber} (Not yet available)`,
      primary_author: null,
      summary: 'Bill text not yet available from Texas Legislature.',
      full_text: null,
    };
  }

  // Extract title from table structure
  // Texas bills follow pattern: "AN ACT" followed by "relating to..."
  let title = '';
  const tdElements = $('td[valign="top"]');

  tdElements.each((_, elem) => {
    const text = $(elem).text().trim();
    // Look for the "relating to" clause
    if (text.match(/^relating to/i)) {
      title = 'AN ACT ' + text;
      return false; // break
    }
  });

  // Fallback: search in all text content
  if (!title) {
    const relatingMatch = html.match(/AN ACT\s*<\/[^>]+>\s*<[^>]+>\s*([^<]+relating to[^<]+)/is);
    if (relatingMatch) {
      title = 'AN ACT ' + relatingMatch[1].trim();
    }
  }

  // Final fallback
  if (!title || title.length < 15) {
    title = `${billNumber} - Title not extracted`;
  }

  // Clean up title
  title = title.replace(/\s+/g, ' ').trim();
  if (title.length > 200) {
    title = title.substring(0, 197) + '...';
  }

  // Extract author from metadata or By line
  let author: string | null = null;
  const byMatch = html.match(/(?:By|Author|Sponsor):\s*([A-Za-z\.\s,]+)/i);
  if (byMatch) {
    author = byMatch[1].trim().split(',')[0].split('and')[0].trim();
  }

  // Extract full text from table cells
  const textParts: string[] = [];
  $('td[valign="top"]').each((_, elem) => {
    const text = $(elem).text().trim();
    // Skip line numbers and short fragments
    if (text.length > 30 && !text.match(/^\d+-\d+$/)) {
      textParts.push(text);
    }
  });

  const fullText = textParts.join('\n').substring(0, 50000); // Limit to 50KB

  // Create summary - first substantial paragraph
  let summary = null;
  for (const part of textParts) {
    if (part.length > 50 && part.match(/relating to|this act/i)) {
      summary = part.substring(0, 300);
      break;
    }
  }

  return {
    title,
    primary_author: author,
    summary,
    full_text: fullText || null,
  };
}

async function syncBills() {
  const ftpClient = new FTPClient();
  ftpClient.ftp.verbose = verbose;

  let sessionId: string;
  let billsProcessed = 0;
  let insertCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  try {
    // Get session ID
    sessionId = await getSessionId();
    console.log(`✅ Session ID: ${sessionId}\n`);

    // Connect to FTP
    console.log('🔌 Connecting to FTP server...');
    await ftpClient.access({ host: 'ftp.legis.state.tx.us' });
    console.log('✅ Connected\n');

    // Process House Bills
    console.log('📂 Processing House Bills...\n');
    await ftpClient.cd(`/bills/${sessionLower}/billtext/html/house_bills`);

    const houseGroups = await ftpClient.list();
    const houseGroupDirs = houseGroups.filter(f => f.isDirectory && f.name.match(/HB\d+_HB\d+/));

    for (const group of houseGroupDirs) {
      if (billsProcessed >= limit) break;

      console.log(`   Processing ${group.name}...`);
      await ftpClient.cd(`/bills/${sessionLower}/billtext/html/house_bills/${group.name}`);

      const billFiles = await ftpClient.list();
      // Get only "Introduced" versions (I suffix) for initial sync
      const introducedBills = billFiles.filter(f =>
        f.type === 1 && f.name.match(/HB\d+I\.htm/i)
      );

      for (const file of introducedBills) {
        if (billsProcessed >= limit) break;

        const billMatch = file.name.match(/HB(\d+)/i);
        if (!billMatch) continue;

        const billNum = parseInt(billMatch[1]);
        const billNumber = `HB ${billNum}`;

        try {
          // Download HTML file to memory
          const chunks: Buffer[] = [];
          const writable = new Writable({
            write(chunk, encoding, callback) {
              chunks.push(chunk);
              callback();
            }
          });

          await ftpClient.downloadTo(writable, file.name);
          const html = Buffer.concat(chunks).toString('utf-8');

          // Parse HTML
          const parsed = parseBillHTML(html, billNumber);

          const billData: BillData = {
            bill_number: billNumber,
            chamber: 'house',
            slug: `${sessionLower}-hb-${billNum}`,
            title: parsed.title || `House Bill ${billNum}`,
            summary: parsed.summary,
            primary_author: parsed.primary_author,
            current_status: 'filed',
            full_text: parsed.full_text,
          };

          if (dryRun) {
            console.log(`     [DRY RUN] Would sync: ${billNumber} - ${billData.title.substring(0, 50)}...`);
          } else {
            // Check if bill exists
            const { data: existing } = await supabase
              .from('bills')
              .select('id, current_status')
              .eq('session_id', sessionId)
              .eq('bill_number', billNumber)
              .single();

            const billRecord = {
              session_id: sessionId,
              ...billData,
              subject_areas: [] as string[],
            };

            if (existing) {
              await supabase
                .from('bills')
                .update(billRecord)
                .eq('id', existing.id);
              updateCount++;
              if (verbose) console.log(`     ✅ Updated ${billNumber}`);
            } else {
              const { data: inserted } = await supabase
                .from('bills')
                .insert(billRecord)
                .select('id')
                .single();

              if (inserted) {
                await supabase.from('bill_updates').insert({
                  bill_id: inserted.id,
                  update_type: 'filed',
                  new_status: 'filed',
                  action_date: new Date().toISOString().split('T')[0],
                  description: `Bill filed: ${billData.title}`
                });
              }
              insertCount++;
              if (verbose) console.log(`     ✅ Inserted ${billNumber}`);
            }
          }

          billsProcessed++;

        } catch (err: any) {
          console.error(`     ❌ Error processing ${billNumber}:`, err.message);
          errorCount++;
        }
      }

      // Navigate back to parent
      await ftpClient.cd(`/bills/${sessionLower}/billtext/html/house_bills`);
    }

    // Process Senate Bills (if we haven't hit the limit)
    if (billsProcessed < limit) {
      console.log('\n📂 Processing Senate Bills...\n');
      await ftpClient.cd(`/bills/${sessionLower}/billtext/html/senate_bills`);

      const senateGroups = await ftpClient.list();
      const senateGroupDirs = senateGroups.filter(f => f.isDirectory && f.name.match(/SB\d+_SB\d+/));

      for (const group of senateGroupDirs) {
        if (billsProcessed >= limit) break;

        console.log(`   Processing ${group.name}...`);
        await ftpClient.cd(`/bills/${sessionLower}/billtext/html/senate_bills/${group.name}`);

        const billFiles = await ftpClient.list();
        const introducedBills = billFiles.filter(f =>
          f.type === 1 && f.name.match(/SB\d+I\.htm/i)
        );

        for (const file of introducedBills) {
          if (billsProcessed >= limit) break;

          const billMatch = file.name.match(/SB(\d+)/i);
          if (!billMatch) continue;

          const billNum = parseInt(billMatch[1]);
          const billNumber = `SB ${billNum}`;

          try {
            // Download HTML file to memory
            const chunks: Buffer[] = [];
            const writable = new Writable({
              write(chunk, encoding, callback) {
                chunks.push(chunk);
                callback();
              }
            });

            await ftpClient.downloadTo(writable, file.name);
            const html = Buffer.concat(chunks).toString('utf-8');

            const parsed = parseBillHTML(html, billNumber);

            const billData: BillData = {
              bill_number: billNumber,
              chamber: 'senate',
              slug: `${sessionLower}-sb-${billNum}`,
              title: parsed.title || `Senate Bill ${billNum}`,
              summary: parsed.summary,
              primary_author: parsed.primary_author,
              current_status: 'filed',
              full_text: parsed.full_text,
            };

            if (dryRun) {
              console.log(`     [DRY RUN] Would sync: ${billNumber} - ${billData.title.substring(0, 50)}...`);
            } else {
              const { data: existing } = await supabase
                .from('bills')
                .select('id')
                .eq('session_id', sessionId)
                .eq('bill_number', billNumber)
                .single();

              const billRecord = {
                session_id: sessionId,
                ...billData,
                subject_areas: [] as string[],
              };

              if (existing) {
                await supabase
                  .from('bills')
                  .update(billRecord)
                  .eq('id', existing.id);
                updateCount++;
                if (verbose) console.log(`     ✅ Updated ${billNumber}`);
              } else {
                const { data: inserted } = await supabase
                  .from('bills')
                  .insert(billRecord)
                  .select('id')
                  .single();

                if (inserted) {
                  await supabase.from('bill_updates').insert({
                    bill_id: inserted.id,
                    update_type: 'filed',
                    new_status: 'filed',
                    action_date: new Date().toISOString().split('T')[0],
                    description: `Bill filed: ${billData.title}`
                  });
                }
                insertCount++;
                if (verbose) console.log(`     ✅ Inserted ${billNumber}`);
              }
            }

            billsProcessed++;

          } catch (err: any) {
            console.error(`     ❌ Error processing ${billNumber}:`, err.message);
            errorCount++;
          }
        }

        await ftpClient.cd(`/bills/${sessionLower}/billtext/html/senate_bills`);
      }
    }

    console.log('\n✅ Sync completed\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`   Bills processed: ${billsProcessed}`);
    if (!dryRun) {
      console.log(`   Inserted: ${insertCount}`);
      console.log(`   Updated: ${updateCount}`);
      console.log(`   Errors: ${errorCount}`);
    }
    console.log('');

    if (errorCount > 0) {
      console.log('⚠️  Sync completed with errors');
      process.exit(1);
    } else {
      console.log('🎉 Sync completed successfully!');
    }

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    if (verbose) console.error(err.stack);
    process.exit(1);
  } finally {
    ftpClient.close();
  }

  console.log('');
  console.log('=============================================');
  console.log('Sync completed at:', new Date().toISOString());
  console.log('=============================================');

  process.exit(0);
}

syncBills();
