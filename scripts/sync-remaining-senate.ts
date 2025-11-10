#!/usr/bin/env tsx
/**
 * Quick script to sync remaining Senate Bills only (SB 2654+)
 */

import { createClient } from '@supabase/supabase-js';
import { Client as FTPClient } from 'basic-ftp';
import * as cheerio from 'cheerio';
import { Writable } from 'stream';

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
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

function parseBillHTML(html: string, billNumber: string): Partial<BillData> {
  const $ = cheerio.load(html);

  if (html.includes('NotAvailableDummy') || html.includes('Not Available')) {
    return {
      title: `${billNumber} (Not yet available)`,
      primary_author: null,
      summary: 'Bill text not yet available from Texas Legislature.',
      full_text: null,
    };
  }

  let title = '';
  const tdElements = $('td[valign="top"]');

  tdElements.each((_, elem) => {
    const text = $(elem).text().trim();
    if (text.match(/^relating to/i)) {
      title = 'AN ACT ' + text;
      return false;
    }
  });

  if (!title) {
    const relatingMatch = html.match(/AN ACT\s*<\/[^>]+>\s*<[^>]+>\s*([^<]+relating to[^<]+)/is);
    if (relatingMatch) {
      title = 'AN ACT ' + relatingMatch[1].trim();
    }
  }

  if (!title || title.length < 15) {
    title = `${billNumber} - Title not extracted`;
  }

  title = title.replace(/\s+/g, ' ').trim();
  if (title.length > 200) {
    title = title.substring(0, 197) + '...';
  }

  let author: string | null = null;
  const byMatch = html.match(/(?:By|Author|Sponsor):\s*([A-Za-z\.\s,]+)/i);
  if (byMatch) {
    author = byMatch[1].trim().split(',')[0].split('and')[0].trim();
  }

  const textParts: string[] = [];
  $('td[valign="top"]').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text.length > 30 && !text.match(/^\d+-\d+$/)) {
      textParts.push(text);
    }
  });

  const fullText = textParts.join('\n').substring(0, 50000);

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

async function syncRemainingSenate() {
  console.log('🏛️  Syncing Remaining Senate Bills (SB 2600+)\n');

  const { data: session } = await supabase
    .from('legislative_sessions')
    .select('id')
    .eq('session_code', '89R')
    .single();

  if (!session) {
    console.error('Session not found');
    process.exit(1);
  }

  const sessionId = session.id;
  const ftpClient = new FTPClient();

  let insertCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  try {
    await ftpClient.access({ host: 'ftp.legis.state.tx.us' });
    console.log('✅ Connected to FTP\n');

    await ftpClient.cd('/bills/89r/billtext/html/senate_bills');

    // Start from SB 2600+ directories
    const directories = [
      'SB02600_SB02699',
      'SB02700_SB02799',
      'SB02800_SB02899',
      'SB02900_SB02999',
      'SB03000_SB03099',
    ];

    for (const dir of directories) {
      console.log(`📂 Processing ${dir}...`);

      try {
        await ftpClient.cd(`/bills/89r/billtext/html/senate_bills/${dir}`);
        const billFiles = await ftpClient.list();
        const introducedBills = billFiles.filter(f =>
          f.type === 1 && f.name.match(/SB\d+I\.htm/i)
        );

        for (const file of introducedBills) {
          const billMatch = file.name.match(/SB(\d+)/i);
          if (!billMatch) continue;

          const billNum = parseInt(billMatch[1]);
          const billNumber = `SB ${billNum}`;

          try {
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
              slug: `89r-sb-${billNum}`,
              title: parsed.title || `Senate Bill ${billNum}`,
              summary: parsed.summary,
              primary_author: parsed.primary_author,
              current_status: 'filed',
              full_text: parsed.full_text,
            };

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
              console.log(`   ✅ ${billNumber}`);
            }

          } catch (err: any) {
            console.error(`   ❌ ${billNumber}: ${err.message}`);
            errorCount++;
          }
        }

        await ftpClient.cd('/bills/89r/billtext/html/senate_bills');
      } catch (err: any) {
        console.error(`Error processing ${dir}:`, err.message);
      }
    }

    console.log('\n✅ Sync completed\n');
    console.log('📊 Summary:');
    console.log(`   Inserted: ${insertCount}`);
    console.log(`   Updated: ${updateCount}`);
    console.log(`   Errors: ${errorCount}`);

  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    ftpClient.close();
  }
}

syncRemainingSenate();
