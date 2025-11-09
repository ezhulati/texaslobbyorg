import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SupportTicketFormProps {
  userEmail?: string;
  userName?: string;
}

export default function SupportTicketForm({ userEmail = '', userName = '' }: SupportTicketFormProps) {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'technical' as 'technical' | 'billing' | 'profile' | 'other',
    contact_email: userEmail,
    contact_name: userName
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const token = localStorage.getItem('supabase_token');
      const response = await fetch('/api/support/create-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        // Reset form
        setFormData({
          subject: '',
          message: '',
          category: 'technical',
          contact_email: userEmail,
          contact_name: userName
        });
      } else {
        setError(data.error || 'Failed to submit ticket');
      }
    } catch (err) {
      console.error('Error submitting ticket:', err);
      setError('Failed to submit support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-900 mb-2">Ticket Submitted Successfully!</h3>
        <p className="text-green-800 mb-4">
          We've received your support request and will respond within 24-48 hours.
        </p>
        <Button onClick={() => setSubmitted(false)} variant="outline">
          Submit Another Ticket
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Support</h2>
        <p className="text-gray-600">
          Have a question or need help? Submit a support ticket and we'll get back to you soon.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name *
          </label>
          <input
            type="text"
            required
            value={formData.contact_name}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-texas-blue-500 focus:ring-1 focus:ring-texas-blue-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Email *
          </label>
          <input
            type="email"
            required
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-texas-blue-500 focus:ring-1 focus:ring-texas-blue-500"
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <select
          required
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-texas-blue-500 focus:ring-1 focus:ring-texas-blue-500"
        >
          <option value="technical">Technical Issue</option>
          <option value="billing">Billing Question</option>
          <option value="profile">Profile/Account</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subject *
        </label>
        <input
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-texas-blue-500 focus:ring-1 focus:ring-texas-blue-500"
          placeholder="Brief description of your issue"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message *
        </label>
        <textarea
          required
          rows={6}
          minLength={10}
          maxLength={5000}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-texas-blue-500 focus:ring-1 focus:ring-texas-blue-500"
          placeholder="Please provide details about your question or issue..."
        />
        <p className="mt-1 text-xs text-gray-500">
          {formData.message.length}/5000 characters (minimum 10)
        </p>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full md:w-auto"
      >
        {submitting ? (
          <>
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Submit Ticket
          </>
        )}
      </Button>
    </form>
  );
}
