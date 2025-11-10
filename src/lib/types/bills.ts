/**
 * Bill Tracker Type Definitions
 *
 * These types extend the auto-generated Supabase types with additional
 * application-specific types and utilities for the bill tracker feature.
 */

import type { Database } from '@/lib/database.types';

// Database table types
export type LegislativeSession = Database['public']['Tables']['legislative_sessions']['Row'];
export type LegislativeSessionInsert = Database['public']['Tables']['legislative_sessions']['Insert'];
export type LegislativeSessionUpdate = Database['public']['Tables']['legislative_sessions']['Update'];

export type Bill = Database['public']['Tables']['bills']['Row'];
export type BillInsert = Database['public']['Tables']['bills']['Insert'];
export type BillUpdate = Database['public']['Tables']['bills']['Update'];

export type BillUpdateRecord = Database['public']['Tables']['bill_updates']['Row'];
export type BillUpdateInsert = Database['public']['Tables']['bill_updates']['Insert'];

export type WatchlistEntry = Database['public']['Tables']['watchlist_entries']['Row'];
export type WatchlistEntryInsert = Database['public']['Tables']['watchlist_entries']['Insert'];
export type WatchlistEntryUpdate = Database['public']['Tables']['watchlist_entries']['Update'];

export type BillTag = Database['public']['Tables']['bill_tags']['Row'];
export type BillTagInsert = Database['public']['Tables']['bill_tags']['Insert'];
export type BillTagUpdate = Database['public']['Tables']['bill_tags']['Update'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

// Enums
export type Chamber = 'house' | 'senate';
export type SessionType = 'regular' | 'special';

export type BillStatus =
  | 'filed'
  | 'referred'
  | 'hearing_scheduled'
  | 'committee_passed'
  | 'committee_failed'
  | 'floor_calendar'
  | 'passed_chamber'
  | 'sent_to_other_chamber'
  | 'passed_both_chambers'
  | 'sent_to_governor'
  | 'signed'
  | 'vetoed'
  | 'dead';

export type UpdateType =
  | 'status_change'
  | 'amendment'
  | 'vote'
  | 'hearing'
  | 'other';

export type NotificationType =
  | 'status_change'
  | 'amendment'
  | 'vote'
  | 'hearing'
  | 'governor_action'
  | 'digest';

export type DeliveryStatus =
  | 'sent'
  | 'delivered'
  | 'bounced'
  | 'failed';

// Application-specific types

/**
 * Bill search filters
 */
export interface BillSearchFilters {
  query?: string;
  subjects?: string[];
  session?: string;
  chamber?: Chamber;
  status?: BillStatus;
  limit?: number;
  offset?: number;
}

/**
 * Bill search result with ranking
 */
export interface BillSearchResult extends Bill {
  rank_score?: number;
}

/**
 * Watchlist entry with bill details
 */
export interface WatchlistWithBill extends WatchlistEntry {
  bill: Bill;
}

/**
 * Bill with lobbyist tags
 */
export interface BillWithTags extends Bill {
  tags: Array<BillTag & { lobbyist?: any }>;
}

/**
 * Notification preferences for a watchlist entry
 */
export interface NotificationPreferences {
  notifications_enabled: boolean;
  notify_on_status_change: boolean;
  notify_on_hearing: boolean;
  notify_on_amendment: boolean;
  notify_on_vote: boolean;
  notify_on_governor_action: boolean;
  digest_mode: boolean;
  digest_time?: string;
}

/**
 * Bill sync metadata
 */
export interface BillSyncMetadata {
  session_id: string;
  last_synced_at: string;
  bills_synced: number;
  errors: number;
}

/**
 * Status badge configuration
 */
export interface StatusBadgeConfig {
  label: string;
  color: 'gray' | 'blue' | 'yellow' | 'green' | 'red';
  icon?: string;
}

/**
 * Bill status display mapping
 */
export const BILL_STATUS_CONFIG: Record<BillStatus, StatusBadgeConfig> = {
  filed: { label: 'Filed', color: 'gray' },
  referred: { label: 'In Committee', color: 'blue' },
  hearing_scheduled: { label: 'Hearing Scheduled', color: 'yellow' },
  committee_passed: { label: 'Passed Committee', color: 'green' },
  committee_failed: { label: 'Failed in Committee', color: 'red' },
  floor_calendar: { label: 'Floor Calendar', color: 'yellow' },
  passed_chamber: { label: 'Passed Chamber', color: 'green' },
  sent_to_other_chamber: { label: 'Sent to Other Chamber', color: 'blue' },
  passed_both_chambers: { label: 'Passed Both Chambers', color: 'green' },
  sent_to_governor: { label: 'Sent to Governor', color: 'yellow' },
  signed: { label: 'Signed into Law', color: 'green' },
  vetoed: { label: 'Vetoed', color: 'red' },
  dead: { label: 'Dead', color: 'gray' },
};

/**
 * Helper to format bill number for display
 */
export function formatBillNumber(billNumber: string): string {
  return billNumber.toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Helper to get chamber display name
 */
export function getChamberName(chamber: Chamber): string {
  return chamber === 'house' ? 'House' : 'Senate';
}

/**
 * Helper to check if status is terminal (bill won't progress further)
 */
export function isTerminalStatus(status: BillStatus): boolean {
  return ['signed', 'vetoed', 'dead', 'committee_failed'].includes(status);
}

/**
 * Helper to check if status is active (bill still in progress)
 */
export function isActiveStatus(status: BillStatus): boolean {
  return !isTerminalStatus(status);
}
