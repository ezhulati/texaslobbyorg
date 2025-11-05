/**
 * Import Configuration for 2025 Texas Lobbyist Data
 *
 * Defines column mappings for each Excel file from Texas Ethics Commission.
 * Update these mappings based on actual column names in your Excel files.
 */

export interface ColumnMapping {
  // Source file information
  sourceFile: string;
  description: string;

  // Column name mappings (supports multiple possible column names)
  columns: {
    // Lobbyist identification
    firstName?: string | string[];
    lastName?: string | string[];
    email?: string | string[];
    phone?: string | string[];
    website?: string | string[];

    // Array fields (with delimiter info)
    cities?: { column: string | string[]; delimiter: string };
    subjectAreas?: { column: string | string[]; delimiter: string };

    // Client relationship fields
    clientName?: string | string[];
    clientDescription?: string | string[];
    yearStarted?: string | string[];
    yearEnded?: string | string[];

    // Political fund compensation fields
    fundName?: string | string[];
    contributorName?: string | string[];
    compensationYear?: string | string[];
    compensationAmount?: string | string[];
  };

  // Optional: Custom transformation functions for specific fields
  transformations?: {
    [fieldName: string]: (value: any, row: any) => any;
  };

  // Skip rows with certain conditions
  skipRow?: (row: any) => boolean;
}

/**
 * Column mappings for each Excel file
 * IMPORTANT: Update these mappings based on your actual Excel file column names
 */
export const FILE_MAPPINGS: ColumnMapping[] = [
  // File 1: Registered Lobbyists with Clients (sorted by client name)
  {
    sourceFile: 'data/2025-lobbyists-with-clients-by-client.xlsx',
    description: '2025 Registered Lobbyists with Clients (sorted by client name)',
    columns: {
      firstName: ['First Name', 'FirstName', 'Lobbyist First Name'],
      lastName: ['Last Name', 'LastName', 'Lobbyist Last Name'],
      email: ['Email', 'Email Address', 'E-Mail'],
      phone: ['Phone', 'Phone Number', 'Telephone'],
      cities: {
        column: ['City', 'Cities', 'Principal City'],
        delimiter: ';',
      },
      subjectAreas: {
        column: ['Subject', 'Subject Areas', 'Subjects'],
        delimiter: ',',
      },
      clientName: ['Client Name', 'Client', 'Employer'],
      yearStarted: ['Year Started', 'Start Year', 'Year Began'],
    },
    // Example: Skip rows where lobbyist name is missing
    skipRow: (row: any) => {
      return !row['First Name'] || !row['Last Name'];
    },
  },

  // File 2: Registered Lobbyists with Clients (sorted by lobbyist name)
  {
    sourceFile: 'data/2025-lobbyists-with-clients-by-lobbyist.xlsx',
    description: '2025 Registered Lobbyists with Clients (sorted by lobbyist name)',
    columns: {
      firstName: ['First Name', 'FirstName', 'Lobbyist First Name'],
      lastName: ['Last Name', 'LastName', 'Lobbyist Last Name'],
      email: ['Email', 'Email Address'],
      phone: ['Phone', 'Phone Number'],
      cities: {
        column: ['City', 'Cities'],
        delimiter: ';',
      },
      subjectAreas: {
        column: ['Subject', 'Subject Areas'],
        delimiter: ',',
      },
      clientName: ['Client Name', 'Client'],
      yearStarted: ['Year Started', 'Start Year'],
    },
  },

  // File 3: Registered Lobbyists without client information
  {
    sourceFile: 'data/2025-lobbyists-without-clients.xlsx',
    description: '2025 Registered Lobbyists (without client information)',
    columns: {
      firstName: ['First Name', 'FirstName'],
      lastName: ['Last Name', 'LastName'],
      email: ['Email', 'Email Address'],
      phone: ['Phone', 'Phone Number'],
      website: ['Website', 'Web Site', 'URL'],
      cities: {
        column: ['City', 'Cities'],
        delimiter: ';',
      },
      subjectAreas: {
        column: ['Subject', 'Subject Areas'],
        delimiter: ',',
      },
    },
  },

  // File 4: Subject Matter List without client information
  {
    sourceFile: 'data/2025-subject-matter-list.xlsx',
    description: '2025 Subject Matter List (without client information)',
    columns: {
      firstName: ['First Name', 'FirstName', 'Lobbyist First Name'],
      lastName: ['Last Name', 'LastName', 'Lobbyist Last Name'],
      email: ['Email'],
      phone: ['Phone'],
      subjectAreas: {
        column: ['Subject', 'Subject Areas', 'Subject Matter'],
        delimiter: ',',
      },
    },
  },

  // File 5: Lobbyists Compensated/Reimbursed By Political Funds (by lobbyist)
  {
    sourceFile: 'data/2025-political-funds-by-lobbyist.xlsx',
    description: '2025 Lobbyists Compensated/Reimbursed By Political Funds (sorted by lobbyist)',
    columns: {
      firstName: ['First Name', 'FirstName', 'Lobbyist First Name'],
      lastName: ['Last Name', 'LastName', 'Lobbyist Last Name'],
      fundName: ['Fund Name', 'Political Fund', 'Fund'],
      contributorName: ['Contributor Name', 'Contributor', 'Political Contributor Name'],
      compensationYear: ['Year', 'Compensation Year', 'Calendar Year'],
      compensationAmount: ['Amount', 'Compensation Amount', 'Total Amount'],
    },
    transformations: {
      // Remove dollar signs and commas from amount
      compensationAmount: (value: any) => {
        if (!value) return null;
        const cleaned = value.toString().replace(/[$,]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      },
    },
  },

  // File 6: Lobbyists Compensated/Reimbursed By Political Funds (by contributor)
  {
    sourceFile: 'data/2025-political-funds-by-contributor.xlsx',
    description: '2025 Lobbyists Compensated/Reimbursed By Political Funds (sorted by contributor)',
    columns: {
      firstName: ['First Name', 'FirstName', 'Lobbyist First Name'],
      lastName: ['Last Name', 'LastName', 'Lobbyist Last Name'],
      fundName: ['Fund Name', 'Political Fund'],
      contributorName: ['Contributor Name', 'Contributor', 'Political Contributor Name'],
      compensationYear: ['Year', 'Compensation Year'],
      compensationAmount: ['Amount', 'Compensation Amount'],
    },
    transformations: {
      compensationAmount: (value: any) => {
        if (!value) return null;
        const cleaned = value.toString().replace(/[$,]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      },
    },
  },
];

/**
 * Get the value from a row using column mapping
 * Tries multiple possible column names
 */
export function getColumnValue(
  row: any,
  columnNames: string | string[] | undefined
): any {
  if (!columnNames) return null;

  const names = Array.isArray(columnNames) ? columnNames : [columnNames];

  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }

  return null;
}

/**
 * Get array field value with parsing
 */
export function getArrayColumnValue(
  row: any,
  config: { column: string | string[]; delimiter: string } | undefined,
  parseFunction: (value: string, delimiter: string) => string[]
): string[] {
  if (!config) return [];

  const value = getColumnValue(row, config.column);
  if (!value) return [];

  return parseFunction(value, config.delimiter);
}

/**
 * Validate that required columns exist in Excel file
 * Returns array of missing columns
 */
export function validateColumns(
  mapping: ColumnMapping,
  actualColumns: string[]
): string[] {
  const missing: string[] = [];

  // Check required columns (firstName and lastName)
  const hasFirstName = mapping.columns.firstName
    ? findMatchingColumn(mapping.columns.firstName, actualColumns)
    : null;

  const hasLastName = mapping.columns.lastName
    ? findMatchingColumn(mapping.columns.lastName, actualColumns)
    : null;

  if (!hasFirstName) {
    missing.push('firstName (tried: ' + JSON.stringify(mapping.columns.firstName) + ')');
  }

  if (!hasLastName) {
    missing.push('lastName (tried: ' + JSON.stringify(mapping.columns.lastName) + ')');
  }

  return missing;
}

/**
 * Find matching column name in actual columns
 */
function findMatchingColumn(
  possibleNames: string | string[],
  actualColumns: string[]
): string | null {
  const names = Array.isArray(possibleNames) ? possibleNames : [possibleNames];

  for (const name of names) {
    if (actualColumns.includes(name)) {
      return name;
    }
  }

  return null;
}

/**
 * Get list of Excel files to import
 */
export function getImportFiles(): ColumnMapping[] {
  return FILE_MAPPINGS;
}

/**
 * Data directory path
 */
export const DATA_DIR = 'data';

/**
 * Default batch size for database inserts
 */
export const DEFAULT_BATCH_SIZE = 50;

/**
 * Default year for 2025 data
 */
export const IMPORT_YEAR = 2025;
