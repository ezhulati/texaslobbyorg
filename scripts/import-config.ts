/**
 * Import Configuration for 2025 Texas Lobbyist Data
 *
 * Defines column mappings for each Excel file from Texas Ethics Commission.
 * Updated with actual column names from the 2025 files.
 */

export interface ColumnMapping {
  // Source file information
  sourceFile: string;
  description: string;

  // Column name mappings
  columns: {
    // Lobbyist identification (can be full name that needs parsing)
    fullName?: string | string[]; // For "Last, First (Title)" format
    firstName?: string | string[];
    lastName?: string | string[];
    phone?: string | string[];
    business?: string | string[]; // Professional specialty

    // Location
    city?: string | string[];
    state?: string | string[];
    zip?: string | string[];

    // Subject areas
    subjectArea?: string | string[]; // Single subject area per row

    // Client relationship fields
    clientName?: string | string[];
    yearStarted?: string | string[];
    yearEnded?: string | string[];

    // Political fund compensation fields
    fundName?: string | string[]; // Provider Name
    compensationYear?: string | string[];
  };

  // Optional: Custom transformation functions for specific fields
  transformations?: {
    [fieldName: string]: (value: any, row: any) => any;
  };

  // Skip rows with certain conditions
  skipRow?: (row: any) => boolean;

  // Special handling flags
  parseFullName?: boolean; // If true, parse fullName into first/last
  subjectAreaPerRow?: boolean; // If true, one subject area per row (not delimited list)
}

/**
 * Column mappings for each actual Excel file
 */
export const FILE_MAPPINGS: ColumnMapping[] = [
  // File 1: Registered Lobbyists with Clients (sorted by client)
  // Columns: Client Name, FilerID, Lobby Name, City, Phone Number, Start, Stop, etc.
  {
    sourceFile: 'data/2025LobbyGroupByClient.xlsx',
    description: '2025 Registered Lobbyists with Clients (sorted by client name)',
    parseFullName: true,
    columns: {
      fullName: 'Lobby Name', // Format: "Scott, Natalie B. (Ms.)"
      city: 'City',
      phone: 'Phone Number',
      clientName: 'Client Name',
      yearStarted: 'Start',
      yearEnded: 'Stop',
    },
    transformations: {
      yearStarted: (value: any) => {
        if (!value) return null;
        // Parse date format "02/10/2025" -> 2025
        const match = value.match(/\d{4}$/);
        return match ? parseInt(match[0]) : null;
      },
      yearEnded: (value: any) => {
        if (!value) return null;
        const match = value.match(/\d{4}$/);
        return match ? parseInt(match[0]) : null;
      },
    },
  },

  // File 2: Registered Lobbyists with Clients (sorted by lobbyist)
  // Columns: FilerID, Filer Name, Business, City, Client Name, Begin, Stop, etc.
  {
    sourceFile: 'data/2025LobbyGroupByLobbyist.xlsx',
    description: '2025 Registered Lobbyists with Clients (sorted by lobbyist name)',
    parseFullName: true,
    columns: {
      fullName: 'Filer Name', // Format: "Abbott, Sean (Mr.)"
      business: 'Business',
      city: 'City',
      clientName: 'Client Name',
      yearStarted: 'Begin',
      yearEnded: 'Stop',
    },
    transformations: {
      yearStarted: (value: any) => {
        if (!value) return null;
        const match = value.match(/\d{4}$/);
        return match ? parseInt(match[0]) : null;
      },
      yearEnded: (value: any) => {
        if (!value) return null;
        const match = value.match(/\d{4}$/);
        return match ? parseInt(match[0]) : null;
      },
    },
  },

  // File 3: Subject Matter List
  // Columns: (unnamed column with subject), FilerID, Lobby Name, Primary Business, City, Phone
  // IMPORTANT: This file has ONE SUBJECT PER ROW, not comma-delimited
  {
    sourceFile: 'data/2025LobbySubjMatter.xlsx',
    description: '2025 Subject Matter List (one subject per row)',
    parseFullName: true,
    subjectAreaPerRow: true, // Special flag: accumulate subjects per lobbyist
    columns: {
      fullName: 'Lobby Name',
      business: 'Primary Business',
      city: 'City',
      phone: 'Phone',
      subjectArea: '', // First column is unnamed (empty string key)
    },
  },

  // File 4: Registered Lobbyists (clean list without clients)
  // Columns: FilerID, Name, Business, Address 1, Address 2, City, State, Zip, Phone
  {
    sourceFile: 'data/2025RegisteredLobbyists.xlsx',
    description: '2025 Registered Lobbyists (without client information)',
    parseFullName: true,
    columns: {
      fullName: 'Name',
      business: 'Business',
      city: 'City',
      state: 'State',
      zip: 'Zip',
      phone: 'Phone',
    },
  },

  // File 5: Political Fund Compensations (by lobbyist)
  // Columns: FilerID, Lobbyist, Lobbyist Business, City, Interval, Provider Name
  {
    sourceFile: 'data/2025Pol_FundsByLobbyists.xlsx',
    description: '2025 Lobbyists Compensated/Reimbursed By Political Funds',
    parseFullName: true,
    columns: {
      fullName: 'Lobbyist',
      business: 'Lobbyist Business',
      city: 'City',
      fundName: 'Provider Name', // This is the political fund/contributor
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
  // Check for undefined/null specifically (not just falsy, since '' is a valid column name)
  if (columnNames === undefined || columnNames === null) return null;

  const names = Array.isArray(columnNames) ? columnNames : [columnNames];

  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }

  return null;
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

  // For files with fullName parsing, check fullName column
  if (mapping.parseFullName && mapping.columns.fullName) {
    const hasFullName = findMatchingColumn(mapping.columns.fullName, actualColumns);
    if (!hasFullName) {
      missing.push('fullName (tried: ' + JSON.stringify(mapping.columns.fullName) + ')');
    }
  }
  // Otherwise check firstName and lastName
  else {
    const hasFirstName = mapping.columns.firstName
      ? findMatchingColumn(mapping.columns.firstName, actualColumns)
      : null;

    const hasLastName = mapping.columns.lastName
      ? findMatchingColumn(mapping.columns.lastName, actualColumns)
      : null;

    if (!hasFirstName && !mapping.parseFullName) {
      missing.push('firstName (tried: ' + JSON.stringify(mapping.columns.firstName) + ')');
    }

    if (!hasLastName && !mapping.parseFullName) {
      missing.push('lastName (tried: ' + JSON.stringify(mapping.columns.lastName) + ')');
    }
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
