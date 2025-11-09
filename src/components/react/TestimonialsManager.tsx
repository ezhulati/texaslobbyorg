import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit, Check, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Testimonial {
  id: string;
  client_name: string;
  client_company?: string;
  client_title?: string;
  testimonial_text: string;
  rating?: number;
  is_approved: boolean;
  created_at: string;
}

interface TestimonialsManagerProps {
  lobbyistId: string;
  subscriptionTier: 'free' | 'premium' | 'featured';
}

export default function TestimonialsManager({ lobbyistId, subscriptionTier }: TestimonialsManagerProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_name: '',
    client_company: '',
    client_title: '',
    testimonial_text: '',
    rating: 5
  });

  const limits = {
    free: 0,
    premium: 10,
    featured: 999
  };

  const maxTestimonials = limits[subscriptionTier];

  useEffect(() => {
    fetchTestimonials();
  }, [lobbyistId]);

  const fetchTestimonials = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch(`/api/testimonials/list?lobbyist_id=${lobbyistId}&include_unapproved=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setTestimonials(data.testimonials);
      }
    } catch (err) {
      console.error('Error fetching testimonials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem('supabase_token');
    const url = editingId ? '/api/testimonials/update' : '/api/testimonials/create';
    const method = editingId ? 'PUT' : 'POST';

    const payload = editingId
      ? { id: editingId, ...formData }
      : { lobbyist_id: lobbyistId, ...formData };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        await fetchTestimonials();
        resetForm();
      } else {
        alert(data.error || 'Failed to save testimonial');
      }
    } catch (err) {
      console.error('Error saving testimonial:', err);
      alert('Failed to save testimonial');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;

    const token = localStorage.getItem('supabase_token');
    try {
      const response = await fetch(`/api/testimonials/delete?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchTestimonials();
      } else {
        alert(data.error || 'Failed to delete testimonial');
      }
    } catch (err) {
      console.error('Error deleting testimonial:', err);
      alert('Failed to delete testimonial');
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setFormData({
      client_name: testimonial.client_name,
      client_company: testimonial.client_company || '',
      client_title: testimonial.client_title || '',
      testimonial_text: testimonial.testimonial_text,
      rating: testimonial.rating || 5
    });
    setEditingId(testimonial.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_company: '',
      client_title: '',
      testimonial_text: '',
      rating: 5
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (subscriptionTier === 'free') {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Upgrade to Add Testimonials</h3>
        <p className="text-yellow-800 mb-4">Client testimonials are available with Premium ($297/mo) and Featured ($597/mo) plans.</p>
        <Button asChild>
          <a href="/pricing">View Pricing</a>
        </Button>
      </div>
    );
  }

  const canAddMore = testimonials.length < maxTestimonials;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Client Testimonials</h3>
          <p className="text-sm text-gray-600">
            {testimonials.length} of {subscriptionTier === 'featured' ? 'unlimited' : maxTestimonials} testimonials
          </p>
        </div>
        {canAddMore && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Testimonial
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-300 bg-white p-6 space-y-4">
          <h4 className="font-semibold text-gray-900">{editingId ? 'Edit' : 'Add'} Testimonial</h4>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.client_company}
                onChange={(e) => setFormData({ ...formData, client_company: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title/Position</label>
              <input
                type="text"
                value={formData.client_title}
                onChange={(e) => setFormData({ ...formData, client_title: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <select
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {[5, 4, 3, 2, 1].map(num => (
                  <option key={num} value={num}>{num} Stars</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Testimonial *</label>
            <textarea
              required
              rows={4}
              minLength={10}
              maxLength={2000}
              value={formData.testimonial_text}
              onChange={(e) => setFormData({ ...formData, testimonial_text: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="What did the client say about working with you?"
            />
            <p className="mt-1 text-xs text-gray-500">{formData.testimonial_text.length}/2000 characters</p>
          </div>

          <div className="flex gap-2">
            <Button type="submit">
              <Check className="h-4 w-4 mr-2" />
              {editingId ? 'Update' : 'Save'} Testimonial
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-texas-blue-500 border-r-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className={`rounded-lg border p-4 ${testimonial.is_approved ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-gray-900">{testimonial.client_name}</p>
                    {testimonial.is_approved ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Approved</span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Pending Approval</span>
                    )}
                  </div>
                  {testimonial.rating && (
                    <div className="flex gap-1 mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  )}
                  <p className="text-gray-700 italic">"{testimonial.testimonial_text}"</p>
                </div>
                <div className="flex gap-2">
                  {!testimonial.is_approved && (
                    <button
                      onClick={() => handleEdit(testimonial)}
                      className="text-texas-blue-600 hover:text-texas-blue-700"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(testimonial.id)}
                    className="text-red-600 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
