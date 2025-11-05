# Data Directory

This directory contains Excel files from the Texas Ethics Commission for importing lobbyist data.

## Required Files

Place the following Excel files in this directory:

1. **2025-lobbyists-with-clients-by-client.xlsx**
   - 2025 Registered Lobbyists with Clients (sorted by client name)

2. **2025-lobbyists-with-clients-by-lobbyist.xlsx**
   - 2025 Registered Lobbyists with Clients (sorted by lobbyist name)

3. **2025-lobbyists-without-clients.xlsx**
   - 2025 Registered Lobbyists (without client information)

4. **2025-subject-matter-list.xlsx**
   - 2025 Subject Matter List (without client information)

5. **2025-political-funds-by-lobbyist.xlsx**
   - 2025 Lobbyists Compensated/Reimbursed By Political Funds (sorted by lobbyist name)

6. **2025-political-funds-by-contributor.xlsx**
   - 2025 Lobbyists Compensated/Reimbursed By Political Funds (sorted by contributor name)

## Download Source

Download these files from the Texas Ethics Commission:
- Website: https://www.ethics.state.tx.us/search/lobby/
- Section: "Registered Lobbyists" reports

## After Placing Files

1. **First, update column mappings** in `scripts/import-config.ts` to match the actual column names in your Excel files

2. **Run a dry-run test** to verify the import will work:
   ```bash
   npx tsx scripts/import-2025-lobbyists.ts --dry-run
   ```

3. **Execute the actual import**:
   ```bash
   npx tsx scripts/import-2025-lobbyists.ts --clear-data
   ```

## Notes

- The `--clear-data` flag will delete existing unclaimed lobbyist data before importing
- Claimed lobbyist profiles will be preserved
- The import script will automatically deduplicate lobbyists appearing in multiple files
- See `import-errors.csv` for any rows that failed to import
