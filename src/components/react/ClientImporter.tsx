import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ClientImporterProps {
  lobbyistId: string;
  onSave?: () => void;
}

export default function ClientImporter({ lobbyistId, onSave }: ClientImporterProps) {
  const [clients, setClients] = useState<Array<{ name: string; year_started: number }>>([]);
  const [clientName, setClientName] = useState('');
  const [clientYear, setClientYear] = useState(new Date().getFullYear().toString());
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const addClient = () => {
    const trimmedName = clientName.trim();
    const year = parseInt(clientYear);

    if (!trimmedName) {
      setError('Please enter a client name');
      return;
    }

    if (year < 1900 || year > new Date().getFullYear()) {
      setError('Please enter a valid year');
      return;
    }

    if (clients.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('This client has already been added');
      return;
    }

    setClients([...clients, { name: trimmedName, year_started: year }]);
    setClientName('');
    setClientYear(new Date().getFullYear().toString());
    setError('');
  };

  const removeClient = (name: string) => {
    setClients(clients.filter(c => c.name !== name));
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);

    if (clients.length === 0) {
      setError('Please add at least one client');
      return;
    }

    setSaving(true);
    try {
      // Delete existing clients
      await supabase
        .from('clients')
        .delete()
        .eq('lobbyist_id', lobbyistId);

      // Insert new clients
      const { error: insertError } = await supabase
        .from('clients')
        .insert(
          clients.map(client => ({
            lobbyist_id: lobbyistId,
            client_name: client.name,
            year_started: client.year_started,
          }))
        );

      if (insertError) throw insertError;

      setSaved(true);
      onSave?.();

      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err?.message || 'Failed to save clients');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Client Form */}
      <div className="space-y-4">
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium mb-2">
            Client Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="clientName"
            type="text"
            placeholder="Company or Organization Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addClient();
              }
            }}
            disabled={saving || importing}
          />
        </div>

        <div>
          <label htmlFor="clientYear" className="block text-sm font-medium mb-2">
            Year Started
          </label>
          <Input
            id="clientYear"
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            placeholder={new Date().getFullYear().toString()}
            value={clientYear}
            onChange={(e) => setClientYear(e.target.value)}
            disabled={saving || importing}
          />
        </div>

        <Button
          type="button"
          onClick={addClient}
          disabled={!clientName.trim() || saving || importing}
          className="w-full"
          variant="outline"
        >
          + Add Client
        </Button>
      </div>

      {/* Client List */}
      {clients.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-3">
            Your Clients ({clients.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {clients.map((client, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 bg-muted/30"
              >
                <div className="flex-1">
                  <div className="font-medium">{client.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Since {client.year_started}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeClient(client.name)}
                  className="text-red-600 hover:text-red-700"
                  disabled={saving}
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      {clients.length > 0 && (
        <Button
          onClick={handleSave}
          disabled={saving || clients.length === 0}
          className="w-full"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Clients'}
        </Button>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800 flex items-center gap-2">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Clients saved successfully!
          </p>
        </div>
      )}

      {/* Info Boxes */}
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="font-medium text-sm mb-2">Why list clients?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Demonstrates your experience and credibility</li>
            <li>• Shows potential clients who trusts you</li>
            <li>• Helps clients in similar industries find you</li>
            <li>• Required for profile approval</li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-blue-50 p-4">
          <div className="flex gap-3">
            <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <h4 className="font-medium text-blue-900 mb-1">Note on Privacy</h4>
              <p className="text-blue-800">
                All client information is sourced from Texas Ethics Commission public records. Only add clients you currently or previously represented.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-amber-50 p-4">
          <div className="flex gap-3">
            <svg className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <h4 className="font-medium text-amber-900 mb-1">Don't have TEC data yet?</h4>
              <p className="text-amber-800">
                If you're a new lobbyist or haven't filed with the Texas Ethics Commission yet, add your current or prospective clients. We'll verify during approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
