interface BrowseModeToggleProps {
  currentMode: 'lobbyists' | 'clients';
}

export default function BrowseModeToggle({ currentMode }: BrowseModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-input bg-background p-1" role="tablist">
      <a
        href="/lobbyists"
        role="tab"
        aria-selected={currentMode === 'lobbyists'}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          currentMode === 'lobbyists'
            ? 'bg-texas-blue-500 text-white shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        Browse Lobbyists
      </a>
      <a
        href="/clients"
        role="tab"
        aria-selected={currentMode === 'clients'}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          currentMode === 'clients'
            ? 'bg-texas-blue-500 text-white shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        Browse Clients
      </a>
    </div>
  );
}
