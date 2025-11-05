import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface Client {
  id: string;
  name: string;
  description: string | null;
  year_started: number | null;
  year_ended: number | null;
  is_current: boolean;
  created_at: string;
}

interface ClientManagementProps {
  lobbyistId: string;
}

export default function ClientManagement({ lobbyistId }: ClientManagementProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    year_started: '',
    year_ended: '',
    is_current: true,
  });

  useEffect(() => {
    loadClients();
  }, [lobbyistId]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('lobbyist_id', lobbyistId)
        .order('is_current', { ascending: false })
        .order('year_started', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      year_started: '',
      year_ended: '',
      is_current: true,
    });
    setEditingClient(null);
    setShowForm(false);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      description: client.description || '',
      year_started: client.year_started?.toString() || '',
      year_ended: client.year_ended?.toString() || '',
      is_current: client.is_current,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);

      if (error) throw error;

      setSuccess('Client deleted successfully');
      loadClients();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete client');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Client name is required');
      return;
    }

    try {
      const clientData = {
        lobbyist_id: lobbyistId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        year_started: formData.year_started ? parseInt(formData.year_started) : null,
        year_ended: formData.year_ended ? parseInt(formData.year_ended) : null,
        is_current: formData.is_current,
      };

      if (editingClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;
        setSuccess('Client updated successfully');
      } else {
        // Create new client
        const { error } = await supabase.from('clients').insert(clientData);

        if (error) throw error;
        setSuccess('Client added successfully');
      }

      resetForm();
      loadClients();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save client');
    }
  };

  const currentClients = clients.filter((c) => c.is_current);
  const pastClients = clients.filter((c) => !c.is_current);

  if (loading) {
    return <div className="text-center py-8">Loading clients...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Add Client Button */}
      {!showForm && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>Add New Client</Button>
        </div>
      )}

      {/* Client Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Client Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter client name"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Brief description of work done for this client..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="year_started" className="block text-sm font-medium mb-2">
                  Year Started
                </label>
                <Input
                  id="year_started"
                  name="year_started"
                  type="number"
                  value={formData.year_started}
                  onChange={handleInputChange}
                  placeholder="2024"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              <div>
                <label htmlFor="year_ended" className="block text-sm font-medium mb-2">
                  Year Ended
                </label>
                <Input
                  id="year_ended"
                  name="year_ended"
                  type="number"
                  value={formData.year_ended}
                  onChange={handleInputChange}
                  placeholder="2025"
                  min="1900"
                  max={new Date().getFullYear() + 10}
                  disabled={formData.is_current}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                name="is_current"
                checked={formData.is_current}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-texas-blue-500 focus:ring-texas-blue"
              />
              <label htmlFor="is_current" className="text-sm font-medium">
                Current Client
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" className="flex-1 md:flex-none md:px-8">
                {editingClient ? 'Update Client' : 'Add Client'}
              </Button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Clients */}
      {currentClients.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Current Clients ({currentClients.length})</h3>
          <div className="space-y-3">
            {currentClients.map((client) => (
              <div
                key={client.id}
                className="rounded-lg border border-border bg-white p-4 hover:border-texas-blue/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{client.name}</h4>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Current
                      </span>
                    </div>
                    {client.description && (
                      <p className="text-sm text-muted-foreground mb-2">{client.description}</p>
                    )}
                    {client.year_started && (
                      <p className="text-xs text-muted-foreground">
                        Since {client.year_started}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Clients */}
      {pastClients.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Past Clients ({pastClients.length})</h3>
          <div className="space-y-3">
            {pastClients.map((client) => (
              <div
                key={client.id}
                className="rounded-lg border border-border bg-muted/30 p-4 hover:border-texas-blue/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{client.name}</h4>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Past
                      </span>
                    </div>
                    {client.description && (
                      <p className="text-sm text-muted-foreground mb-2">{client.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {client.year_started || '?'} - {client.year_ended || '?'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {clients.length === 0 && !showForm && (
        <div className="text-center py-12 rounded-lg border border-dashed border-border">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold">No clients yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start building your client portfolio by adding your first client.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowForm(true)}>Add Your First Client</Button>
          </div>
        </div>
      )}
    </div>
  );
}
