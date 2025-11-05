#!/usr/bin/env tsx

/**
 * Quick script to inspect Excel file columns
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));

for (const file of files) {
  console.log('\n' + '='.repeat(60));
  console.log(`📄 ${file}`);
  console.log('='.repeat(60));

  const filePath = path.join(dataDir, file);
  const workbook = XLSX.readFile(filePath);

  console.log(`Sheets: ${workbook.SheetNames.join(', ')}\n`);

  // Read first sheet
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (rows.length > 0) {
    console.log(`Columns (${Object.keys(rows[0]).length}):`);
    Object.keys(rows[0]).forEach((col, i) => {
      const sample = (rows[0] as any)[col];
      console.log(`  ${i + 1}. ${col} = "${sample}"`);
    });
    console.log(`\nTotal rows: ${rows.length}`);
  } else {
    console.log('No data found');
  }
}

console.log('\n');
