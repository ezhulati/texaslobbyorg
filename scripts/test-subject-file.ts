#!/usr/bin/env tsx

import XLSX from 'xlsx';

const filePath = 'data/2025LobbySubjMatter.xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

console.log('First 3 rows:');
console.log(JSON.stringify(rows.slice(0, 3), null, 2));

console.log('\nColumn names in first row:');
console.log(Object.keys(rows[0]));
