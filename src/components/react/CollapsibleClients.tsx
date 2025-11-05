import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import type { Database } from '@/lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];

interface CollapsibleClientsProps {
  clients: Client[];
  initialVisibleCount?: number;
}

export default function CollapsibleClients({
  clients,
  initialVisibleCount = 10
}: CollapsibleClientsProps) {
  const [showAll, setShowAll] = useState(false);
  const [filterCurrent, setFilterCurrent] = useState<'all' | 'current' | 'past'>('all');

  // Filter clients based on selected filter
  const filteredClients = clients.filter(client => {
    if (filterCurrent === 'current') return client.is_current;
    if (filterCurrent === 'past') return !client.is_current;
    return true;
  });

  // Determine which clients to show
  const visibleClients = showAll
    ? filteredClients
    : filteredClients.slice(0, initialVisibleCount);

  const hasMore = filteredClients.length > initialVisibleCount;
  const remainingCount = filteredClients.length - initialVisibleCount;

  // Calculate stats
  const totalCount = clients.length;
  const currentCount = clients.filter(c => c.is_current).length;
  const pastCount = totalCount - currentCount;

  return (
    <div>
      {/* Summary Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalCount}</span> total
          {currentCount > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-green-600">{currentCount}</span> current
            </>
          )}
          {pastCount > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-muted-foreground">{pastCount}</span> past
            </>
          )}
        </div>

        {/* Filter Buttons */}
        {totalCount > 5 && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilterCurrent('all')}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                filterCurrent === 'all'
                  ? 'bg-texas-blue-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCurrent('current')}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                filterCurrent === 'current'
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setFilterCurrent('past')}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                filterCurrent === 'past'
                  ? 'bg-muted-foreground text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Past
            </button>
          </div>
        )}
      </div>

      {/* Client List */}
      <div className="space-y-4">
        {visibleClients.map((client) => (
          <div
            key={client.id}
            className="rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{client.name}</h3>
                {client.description && (
                  <p className="text-sm text-muted-foreground mt-1">{client.description}</p>
                )}
              </div>
              {client.is_current && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 flex-shrink-0">
                  Current
                </span>
              )}
            </div>
            {(client.year_started || client.year_ended) && (
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="mr-1.5 h-4 w-4" />
                {client.year_started && client.year_ended ? (
                  <span>{client.year_started} - {client.year_ended}</span>
                ) : client.year_started ? (
                  <span>{client.year_started} - Present</span>
                ) : (
                  <span>Until {client.year_ended}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && filteredClients.length > initialVisibleCount && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show {remainingCount} More {remainingCount === 1 ? 'Client' : 'Clients'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No {filterCurrent === 'current' ? 'current' : 'past'} clients found.
        </div>
      )}
    </div>
  );
}
